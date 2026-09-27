// Parsiranje i normalizacija parametara pretrage — čist kod, bez baze.
// Ulaz dolazi direktno iz URL-a (anonimni posetilac), pa se sve proverava ovde:
// nevažeća vrednost se tiho izbacuje (ne baca grešku), pretraga radi bez nje.

export const PAGE_SIZE = 20;
const MAX_TEXT_LEN = 100;
const MAX_GOSTIJU = 30;
const MAX_PAGE = 500; // sprečava beskorisno duboke offset upite
const MAX_CENA = 100000; // razumna gornja granica, sprečava besmislene upite
const MAX_AGENCIJA = 50; // koliko agencija posetilac realno bira odjednom
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CenaTip = "po_osobi" | "po_jedinici";

export type SearchParams = {
  destinacija?: string;
  naziv?: string; // naziv apartmana/vile — isti apartman nude i druge agencije
  cenaTip?: CenaTip; // samo cene po osobi, ili samo cene za celu jedinicu
  datumOd?: string; // YYYY-MM-DD
  datumDo?: string; // YYYY-MM-DD
  brojGostiju?: number;
  cenaOd?: number; // cena po osobi (€), donja granica
  cenaDo?: number; // cena po osobi (€), gornja granica
  agencije?: string[]; // agency id-jevi (filter rail, "AGENCIJA" grupa)
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseDate(v: string | undefined): string | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  // povratni prevod hvata nepostojeće datume (npr. 2026-02-31)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
    ? v
    : undefined;
}

function parsePositiveInt(
  v: string | undefined,
  max: number,
): number | undefined {
  if (!v || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return n >= 1 && n <= max ? n : undefined;
}

// Slobodan tekst iz URL-a: "*" bi PostgREST protumačio kao džoker u LIKE
// obrascu (izbacuje se), razmaci se sažimaju, dužina je ograničena.
function cleanText(v: string | undefined): string | undefined {
  return (
    v
      ?.replace(/\*/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEXT_LEN)
      .trim() || undefined
  );
}

function parseCenaTip(v: string | undefined): CenaTip | undefined {
  return v === "po_osobi" || v === "po_jedinici" ? v : undefined;
}

// Cena po osobi može imati decimale (cena_po_osobi je izvedena, videti
// search.ts) — za razliku od parsePositiveInt, ovde 0 je važeća donja granica.
function parsePrice(v: string | undefined): number | undefined {
  if (!v || !/^\d+(\.\d{1,2})?$/.test(v)) return undefined;
  const n = Number(v);
  return n >= 0 && n <= MAX_CENA ? n : undefined;
}

function parseAgencije(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const ids = [...new Set(v.split(",").filter((id) => UUID_RE.test(id)))].slice(
    0,
    MAX_AGENCIJA,
  );
  return ids.length > 0 ? ids : undefined;
}

export function parseSearchParams(raw: RawParams): SearchParams {
  const destinacija = cleanText(first(raw.destinacija));
  const naziv = cleanText(first(raw.naziv));

  let datumOd = parseDate(first(raw.datumOd));
  let datumDo = parseDate(first(raw.datumDo));
  if (datumOd && datumDo && datumOd > datumDo) {
    [datumOd, datumDo] = [datumDo, datumOd];
  }

  let cenaOd = parsePrice(first(raw.cenaOd));
  let cenaDo = parsePrice(first(raw.cenaDo));
  if (cenaOd !== undefined && cenaDo !== undefined && cenaOd > cenaDo) {
    [cenaOd, cenaDo] = [cenaDo, cenaOd];
  }

  return {
    destinacija,
    naziv,
    cenaTip: parseCenaTip(first(raw.cenaTip)),
    datumOd,
    datumDo,
    brojGostiju: parsePositiveInt(first(raw.brojGostiju), MAX_GOSTIJU),
    cenaOd,
    cenaDo,
    agencije: parseAgencije(first(raw.agencija)),
    page: parsePositiveInt(first(raw.page), MAX_PAGE) ?? 1,
  };
}

// %, _ i \ su LIKE džokeri/escape — ako ih posetilac ukuca doslovno,
// tretiraju se kao obično slovo, ne kao obrazac.
export function escapeLike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// Današnji datum u Srbiji (ne UTC) — da ponuda koja polazi "danas" ne
// nestane oko ponoći po pogrešnoj vremenskoj zoni.
export function todayInBelgrade(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Belgrade" }).format(
    now,
  );
}
