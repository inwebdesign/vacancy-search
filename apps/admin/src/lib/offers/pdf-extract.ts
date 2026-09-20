import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { parseCenaTip, type CenaTip } from "./cena-tip";

export type ExtractedOffer = {
  naziv: string;
  destinacija: string;
  datumPolaska: string;
  datumPovratka: string;
  cenaEur: number;
  cenaTip: CenaTip;
  maxGostiju: number;
  uncertain: boolean;
};

// Faza 2, Korak 4: PDF cenovnici partner agencija su najčešće cenovna
// matrica (destinacija x vila x tip sobe x tip prevoza), ne flat lista kao
// CSV template — jedan PDF proizvodi mnogo ponuda, po jednu za svaku
// kombinaciju. Videti razgovor/README za primer stvarnog dokumenta.
const SYSTEM_PROMPT = `Ti si asistent koji iz teksta PDF cenovnika turističke agencije izvlači strukturirane ponude aranžmana.

Tekst obično sadrži više sekcija, svaka sa datumom polaska ("POLAZAK AUTOBUSA <datum>") i periodom boravka ("BORAVAK <od>-<do>"), i tabele sa cenama po destinaciji/vili/tipu sobe (1/2 STD, 1/3 STD, ¼ STD, 1/5, 1/6, "+1" dodatni ležaj, APT/DPL apartmani...). Broj u tipu sobe (npr. "1/3" ili "¼") označava broj osoba u toj sobi.

Za SVAKU ćeliju sa cenom (svaka kombinacija destinacija+vila+tip sobe+tip prevoza na datom polasku) napravi JEDAN objekat:
{
  "naziv": kratak opisni naziv koji uključuje vilu, tip sobe i tip prevoza (npr. "Vila Estia, Paralia — 1/2 STD, autobuski prevoz"),
  "destinacija": mesto (npr. "Paralia"),
  "datum_polaska": "YYYY-MM-DD",
  "datum_povratka": "YYYY-MM-DD",
  "cena_eur": broj, cena TAČNO onako kako je navedena u tabeli (ne preračunavaj),
  "cena_tip": "po_osobi" ako je cena data PO OSOBI (npr. tabela "AUTOBUSKI PREVOZ – CENA PO OSOBI (PREVOZ + SMEŠTAJ)"), ili "po_jedinici" ako je cena za CELU smeštajnu jedinicu (sobu/apartman) bez obzira na broj osoba (npr. tabela "SOPSTVENI PREVOZ – NAJAM", "cena za smeštajnu jedinicu"). Odredi je iz naslova/napomene tabele iz koje ćelija potiče. Ako to iz dokumenta zaista ne možeš da utvrdiš, stavi null (ne pogađaj) — to NE menja vrednost polja uncertain,
  "max_gostiju": broj osoba izveden iz tipa sobe,
  "uncertain": true ako nisi siguran u bilo koju vrednost (nejasna ćelija, dvosmislen kod sobe, nekompletan red...), inače false
}

Ignoriši opšte uslove, popuste, doplate, pravne napomene, uslove plaćanja na dnu dokumenta — samo cenovne tabele.

Odgovori ISKLJUČIVO validnim JSON nizom tih objekata, bez ikakvog uvodnog teksta, bez markdown code fence-a.`;

export async function extractOffersFromPdfText(
  text: string,
): Promise<ExtractedOffer[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Streaming + veći max_tokens (64000) — dokument može imati mnogo sekcija
  // (svaka destinacija/vila/tip sobe/tip prevoza je posebna ponuda), izlaz
  // lako preraste par hiljada tokena; streaming izbegava HTTP timeout na
  // velikim odgovorima (vidi claude-api skill).
  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 64000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });
  const message = await stream.finalMessage();

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude nije vratio tekstualni odgovor.");
  }

  const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Odgovor nije sadržao JSON niz.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Odgovor nije validan JSON.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Očekivan JSON niz.");
  }

  return normalizeExtractedOffers(parsed);
}

// Čista funkcija (bez API poziva) da bi se validacija/normalizacija mogla
// testirati. Nevažeći redovi se izbacuju; nejasan ili nepostojeći cena_tip
// NE odbacuje ponudu nego je šalje u review (uncertain) — cena_tip menja
// poređenje cena, pa se ne pogađa tiho.
export function normalizeExtractedOffers(parsed: unknown[]): ExtractedOffer[] {
  return parsed
    .map((raw): ExtractedOffer | null => {
      const o = (raw ?? {}) as Record<string, unknown>;
      const naziv = String(o.naziv ?? "").trim();
      const destinacija = String(o.destinacija ?? "").trim();
      const datumPolaska = String(o.datum_polaska ?? "").trim();
      const datumPovratka = String(o.datum_povratka ?? "").trim();
      const cenaEur = Number(o.cena_eur);
      const maxGostiju = Number(o.max_gostiju);

      if (
        !naziv ||
        !destinacija ||
        !/^\d{4}-\d{2}-\d{2}$/.test(datumPolaska) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(datumPovratka) ||
        !Number.isFinite(cenaEur) ||
        !Number.isFinite(maxGostiju)
      ) {
        return null;
      }

      const cenaTip = parseCenaTip(o.cena_tip);

      return {
        naziv,
        destinacija,
        datumPolaska,
        datumPovratka,
        cenaEur,
        cenaTip: cenaTip ?? "po_osobi",
        maxGostiju,
        uncertain: Boolean(o.uncertain) || cenaTip === null,
      };
    })
    .filter((o): o is ExtractedOffer => o !== null);
}
