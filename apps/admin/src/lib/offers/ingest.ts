import "server-only";
import { PDFParse } from "pdf-parse";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCsv, parseExcel, type ParsedOffer } from "./parse";
import { extractOffersFromPdfText, type ExtractedOffer } from "./pdf-extract";
import { logAudit } from "@/lib/audit/log";

const BUCKET = "agency-uploads";

export type IngestSummary = {
  inserted: number;
  expired: number;
  skippedRows: number;
  missingColumns: string[];
};

// Faza 2, Korak 3: parsira upload, upisuje offers, radi rekonsilijaciju
// "punog snapshot-a" (brief sekcija 8: "Upload je uvek pun snapshot,
// zamenjuje prethodni, ne inkrementalni dodatak") — ponude te agencije koje
// su bile aktivne (published/pending_review) iz PRETHODNOG upload-a, a nisu
// prisutne u ovom, prelaze u status "expired".
//
// Piše preko service_role (createAdminClient) jer offers/uploads nemaju
// INSERT/UPDATE RLS policy ni za jednu ulogu (Korak 1 migracija) — upis
// ide isključivo kroz ovaj pipeline, ne kroz korisnikovu sesiju.
//
// NAMERNO SINHRONO (poziva se direktno iz upload server akcije) — brief
// traži "parsiranje nikad sinhrono u HTTP request-u" sa pravim background
// job-om + realtime subscription-om za status. Ovo je privremeno rešenje
// dok se ne odluči mehanizam (Supabase Edge Function + Realtime je predlog,
// ali izbor infrastrukture ide kroz zajedničku odluku, ne ovde sam) — vidi
// otvorena pitanja. Za CSV/Excel (brzo, deterministički) sinhrono raditi
// nije praktičan problem; PDF/OCR/LLM (Korak 4) će to zahtevati stvarno.
export async function ingestUpload(uploadId: string): Promise<IngestSummary> {
  const admin = createAdminClient();

  const { data: upload, error: uploadError } = await admin
    .from("uploads")
    .select("id, agency_id, tip, originalni_fajl_url")
    .eq("id", uploadId)
    .single();
  if (uploadError || !upload) {
    throw new Error(uploadError?.message ?? "Upload nije pronađen.");
  }

  await admin.from("uploads").update({ status: "processing" }).eq("id", uploadId);

  try {
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(upload.originalni_fajl_url);
    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message ?? "Preuzimanje fajla nije uspelo.");
    }
    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    if (upload.tip === "pdf") {
      return await ingestPdf(admin, upload.agency_id, uploadId, buffer);
    }

    const result =
      upload.tip === "csv" ? await parseCsv(buffer) : await parseExcel(buffer);

    if (result.missingColumns.length > 0) {
      await admin.from("uploads").update({ status: "failed" }).eq("id", uploadId);
      return {
        inserted: 0,
        expired: 0,
        skippedRows: result.skippedRows,
        missingColumns: result.missingColumns,
      };
    }

    const now = new Date().toISOString();
    for (const row of result.rows) {
      await upsertOffer(admin, upload.agency_id, uploadId, row, now);
    }

    const expired = await expireStaleOffers(
      admin,
      upload.agency_id,
      result.rows.map((r) => ({
        naziv: r.naziv,
        destinacija: r.destinacija,
        datumPolaska: r.datumPolaska,
      })),
    );

    await admin.from("uploads").update({ status: "completed" }).eq("id", uploadId);

    return {
      inserted: result.rows.length,
      expired,
      skippedRows: result.skippedRows,
      missingColumns: [],
    };
  } catch (err) {
    await admin.from("uploads").update({ status: "failed" }).eq("id", uploadId);
    throw err;
  }
}

// Faza 2, Korak 4: PDF cenovnik -> tekst (pdf-parse, pretpostavlja tekstualni
// sloj, ne sken — OCR nije implementiran, vidi razgovor) -> Claude API
// (lib/offers/pdf-extract.ts) -> jedna ponuda po kombinaciji
// destinacija+vila+tip sobe+tip prevoza. dostupno_mesta ostaje NULL (izvor
// ga ne navodi, UI prikaz "nepoznato" nije odlučen). kontakt_url dolazi iz
// agencies.website (fallback agencies.kontakt) jer PDF cenovnici nemaju link
// po ponudi, samo opšti kontakt agencije.
//
// Red koji model označi kao "uncertain" ide u pending_review (confidence
// 0.5) umesto direktno u published (confidence 0.9) — ovo je mesto gde
// brief-ov princip "sve što ne prođe prag pouzdanosti ide u review queue"
// stvarno ima efekta (za razliku od Koraka 3, gde CSV/Excel parsing nema
// prave "nesigurnosti", samo prođe ili ne prođe).
async function ingestPdf(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string,
  uploadId: string,
  buffer: Buffer,
): Promise<IngestSummary> {
  const { data: agency } = await admin
    .from("agencies")
    .select("website, kontakt")
    .eq("id", agencyId)
    .single();
  const kontaktUrl = agency?.website || agency?.kontakt || "";

  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  await parser.destroy();
  if (!text || text.trim().length < 20) {
    await admin.from("uploads").update({ status: "failed" }).eq("id", uploadId);
    return {
      inserted: 0,
      expired: 0,
      skippedRows: 0,
      missingColumns: ["(PDF nema tekstualni sloj — potreban OCR, nije implementiran)"],
    };
  }

  const offers = await extractOffersFromPdfText(text);
  const now = new Date().toISOString();

  for (const offer of offers) {
    await upsertPdfOffer(admin, agencyId, uploadId, offer, kontaktUrl, now);
  }

  const expired = await expireStaleOffers(
    admin,
    agencyId,
    offers.map((o) => ({
      naziv: o.naziv,
      destinacija: o.destinacija,
      datumPolaska: o.datumPolaska,
    })),
  );

  await admin.from("uploads").update({ status: "completed" }).eq("id", uploadId);

  return { inserted: offers.length, expired, skippedRows: 0, missingColumns: [] };
}

async function upsertPdfOffer(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string,
  uploadId: string,
  offer: ExtractedOffer,
  kontaktUrl: string,
  now: string,
) {
  const confident = !offer.uncertain;
  const { error } = await admin.from("offers").upsert(
    {
      agency_id: agencyId,
      upload_id: uploadId,
      naziv: offer.naziv,
      destinacija: offer.destinacija,
      datum_polaska: offer.datumPolaska,
      datum_povratka: offer.datumPovratka,
      cena_eur: offer.cenaEur,
      cena_tip: offer.cenaTip,
      max_gostiju: offer.maxGostiju,
      dostupno_mesta: null,
      kontakt_url: kontaktUrl,
      confidence_score: confident ? 0.9 : 0.5,
      status: confident ? "published" : "pending_review",
      published_at: confident ? now : null,
    },
    { onConflict: "agency_id,naziv,destinacija,datum_polaska" },
  );
  if (error) {
    throw new Error(`Upis ponude "${offer.naziv}" nije uspeo: ${error.message}`);
  }
}

async function upsertOffer(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string,
  uploadId: string,
  row: ParsedOffer,
  now: string,
) {
  const { error } = await admin.from("offers").upsert(
    {
      agency_id: agencyId,
      upload_id: uploadId,
      naziv: row.naziv,
      destinacija: row.destinacija,
      datum_polaska: row.datumPolaska,
      datum_povratka: row.datumPovratka,
      cena_eur: row.cenaEur,
      cena_tip: row.cenaTip,
      max_gostiju: row.maxGostiju,
      dostupno_mesta: row.dostupnoMesta,
      kontakt_url: row.kontaktUrl,
      confidence_score: 1.0,
      status: "published",
      published_at: now,
    },
    { onConflict: "agency_id,naziv,destinacija,datum_polaska" },
  );
  if (error) {
    throw new Error(`Upis ponude "${row.naziv}" nije uspeo: ${error.message}`);
  }
}

type OfferKey = { naziv: string; destinacija: string; datumPolaska: string };

async function expireStaleOffers(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string,
  freshRows: OfferKey[],
): Promise<number> {
  const freshKeys = new Set(
    freshRows.map((r) => `${r.naziv}|${r.destinacija}|${r.datumPolaska}`),
  );

  const { data: existing } = await admin
    .from("offers")
    .select("id, naziv, destinacija, datum_polaska")
    .eq("agency_id", agencyId)
    .in("status", ["published", "pending_review"]);

  const toExpire = (existing ?? [])
    .filter(
      (o) => !freshKeys.has(`${o.naziv}|${o.destinacija}|${o.datum_polaska}`),
    )
    .map((o) => o.id);

  if (toExpire.length === 0) return 0;

  const { error } = await admin
    .from("offers")
    .update({ status: "expired" })
    .in("id", toExpire);
  if (error) {
    throw new Error(`Isticanje starih ponuda nije uspelo: ${error.message}`);
  }

  await logAudit({
    actorId: null,
    actorEmail: "system:ingest",
    action: "offer.expire_stale",
    targetTable: "offers",
    targetId: null,
    diff: { agency_id: agencyId, expired_count: toExpire.length },
  });

  return toExpire.length;
}
