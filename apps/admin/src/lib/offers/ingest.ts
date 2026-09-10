import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCsv, parseExcel, type ParsedOffer } from "./parse";
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

  // PDF ide u Korak 4 — ostaje "pending" dok pipeline ne postoji, ne
  // označava se kao "failed" (to bi bilo pogrešno, ništa još nije ni
  // pokušano).
  if (upload.tip === "pdf") {
    return { inserted: 0, expired: 0, skippedRows: 0, missingColumns: [] };
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
      result.rows,
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
      max_gostiju: row.maxGostiju,
      dostupno_mesta: row.dostupnoMesta,
      kontakt_url: row.kontaktUrl,
      confidence_score: 1.0,
      status: "published",
      published_at: now,
    },
    { onConflict: "agency_id,destinacija,datum_polaska" },
  );
  if (error) {
    throw new Error(`Upis ponude "${row.naziv}" nije uspeo: ${error.message}`);
  }
}

async function expireStaleOffers(
  admin: ReturnType<typeof createAdminClient>,
  agencyId: string,
  freshRows: ParsedOffer[],
): Promise<number> {
  const freshKeys = new Set(
    freshRows.map((r) => `${r.destinacija}|${r.datumPolaska}`),
  );

  const { data: existing } = await admin
    .from("offers")
    .select("id, destinacija, datum_polaska")
    .eq("agency_id", agencyId)
    .in("status", ["published", "pending_review"]);

  const toExpire = (existing ?? [])
    .filter((o) => !freshKeys.has(`${o.destinacija}|${o.datum_polaska}`))
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
