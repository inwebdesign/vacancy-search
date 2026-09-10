import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";

// Faza 2, Korak 3: fuzzy column-mapping (brief sekcija 8) — kolone iz
// template-a (agencija_id, naziv_aranzmana, destinacija, datum_polaska,
// datum_povratka, cena_po_osobi_eur, max_gostiju, dostupno_mesta,
// kontakt_url, poslednje_azurirano). "agencija_id" i "poslednje_azurirano"
// se namerno NE mapiraju: agencija se uzima iz sesije koja uploaduje (ne iz
// sadržaja fajla — sprečava da neko tvrdi da je druga agencija), a
// "poslednje_azurirano" nema odgovarajuću kolonu u offers šemi (Korak 1).
//
// Matching je normalizacija + tačan pogodak u rečniku sinonima, ne pravi
// fuzzy/tipo-tolerantan algoritam (npr. Levenshtein) — namerno jednostavnije
// za prvi prolaz, otvoreno za doradu.

const REQUIRED_FIELDS = [
  "naziv",
  "destinacija",
  "datumPolaska",
  "datumPovratka",
  "cenaEur",
  "maxGostiju",
  "dostupnoMesta",
  "kontaktUrl",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

const COLUMN_SYNONYMS: Record<RequiredField, string[]> = {
  naziv: ["naziv_aranzmana", "naziv", "aranzman", "ime_aranzmana"],
  destinacija: ["destinacija", "lokacija", "mesto"],
  datumPolaska: ["datum_polaska", "polazak", "datum_odlaska"],
  datumPovratka: ["datum_povratka", "povratak", "datum_dolaska"],
  cenaEur: ["cena_po_osobi_eur", "cena", "cena_eur", "price"],
  maxGostiju: ["max_gostiju", "maksimalan_broj_gostiju", "kapacitet"],
  dostupnoMesta: ["dostupno_mesta", "slobodna_mesta", "dostupnost"],
  kontaktUrl: ["kontakt_url", "link", "url", "sajt"],
};

export type ParsedOffer = {
  naziv: string;
  destinacija: string;
  datumPolaska: string; // YYYY-MM-DD
  datumPovratka: string;
  cenaEur: number;
  maxGostiju: number;
  dostupnoMesta: number;
  kontaktUrl: string;
};

export type ParseResult = {
  rows: ParsedOffer[];
  skippedRows: number;
  missingColumns: RequiredField[];
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapColumns(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const mapping: Partial<Record<RequiredField, string>> = {};
  const missing: RequiredField[] = [];

  for (const field of REQUIRED_FIELDS) {
    const idx = normalized.findIndex((h) => COLUMN_SYNONYMS[field].includes(h));
    if (idx === -1) {
      missing.push(field);
    } else {
      mapping[field] = headers[idx];
    }
  }
  return { mapping, missing };
}

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// Podržava i "1200.50" i evropski format "1.200,50" (tačka = hiljadarski,
// zarez = decimalni) — koji god separator je POSLEDNJI u stringu tretira se
// kao decimalni, drugi kao hiljadarski i briše se.
function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  let s = String(value).trim().replace(/[^\d.,-]/g, "");
  if (s === "") return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    s =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseWholeNumber(value: unknown): number | null {
  const n = parseDecimal(value);
  return n === null ? null : Math.round(n);
}

// Red koji ne uspe da parsira SVIH 8 obaveznih polja se preskače (ne ubacuje
// se u offers) — brief-ov princip "nikad ne vraćaj fajl agenciji" ovde znači
// da se cela greška prijavljuje agregatno (skippedRows), ne da se izmišljaju
// placeholder vrednosti za NOT NULL kolone. Da li ovakvi redovi treba da idu
// u review queue umesto da se preskaču ostaje otvoreno pitanje (vidi
// razgovor/README) — trenutno se samo broje i prijavljuju.
function buildRow(
  raw: Record<string, unknown>,
  mapping: Partial<Record<RequiredField, string>>,
): ParsedOffer | null {
  const naziv = mapping.naziv ? String(raw[mapping.naziv] ?? "").trim() : "";
  const destinacija = mapping.destinacija
    ? String(raw[mapping.destinacija] ?? "").trim()
    : "";
  const datumPolaska = mapping.datumPolaska
    ? parseDate(raw[mapping.datumPolaska])
    : null;
  const datumPovratka = mapping.datumPovratka
    ? parseDate(raw[mapping.datumPovratka])
    : null;
  const cenaEur = mapping.cenaEur ? parseDecimal(raw[mapping.cenaEur]) : null;
  const maxGostiju = mapping.maxGostiju
    ? parseWholeNumber(raw[mapping.maxGostiju])
    : null;
  const dostupnoMesta = mapping.dostupnoMesta
    ? parseWholeNumber(raw[mapping.dostupnoMesta])
    : null;
  const kontaktUrl = mapping.kontaktUrl
    ? String(raw[mapping.kontaktUrl] ?? "").trim()
    : "";

  if (
    !naziv ||
    !destinacija ||
    !datumPolaska ||
    !datumPovratka ||
    cenaEur === null ||
    maxGostiju === null ||
    dostupnoMesta === null ||
    !kontaktUrl
  ) {
    return null;
  }

  return {
    naziv,
    destinacija,
    datumPolaska,
    datumPovratka,
    cenaEur,
    maxGostiju,
    dostupnoMesta,
    kontaktUrl,
  };
}

export async function parseCsv(buffer: Buffer): Promise<ParseResult> {
  const text = buffer.toString("utf-8");
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const { mapping, missing } = mapColumns(headers);
  if (missing.length > 0) {
    return { rows: [], skippedRows: parsed.data.length, missingColumns: missing };
  }

  const rows: ParsedOffer[] = [];
  let skipped = 0;
  for (const raw of parsed.data) {
    const row = buildRow(raw, mapping);
    if (row) rows.push(row);
    else skipped += 1;
  }

  return { rows, skippedRows: skipped, missingColumns: [] };
}

export async function parseExcel(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  // exceljs-ov .d.ts referencira stariji (ne-generički) Buffer tip — čisto
  // tipovska neusklađenost sa novijim @types/node, ne runtime problem.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], skippedRows: 0, missingColumns: REQUIRED_FIELDS.slice() };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const { mapping, missing } = mapColumns(headers.filter(Boolean));
  if (missing.length > 0) {
    return {
      rows: [],
      skippedRows: sheet.rowCount - 1,
      missingColumns: missing,
    };
  }

  // mapping vrednosti su originalni header stringovi — treba nam kolona-index
  // po header stringu da bismo čitali vrednosti po redu.
  const headerToCol = new Map<string, number>();
  headers.forEach((h, i) => {
    if (h) headerToCol.set(h, i);
  });

  const rows: ParsedOffer[] = [];
  let skipped = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const raw: Record<string, unknown> = {};
    for (const [header, colIdx] of headerToCol) {
      raw[header] = row.getCell(colIdx).value;
    }
    const parsedRow = buildRow(raw, mapping);
    if (parsedRow) rows.push(parsedRow);
    else skipped += 1;
  });

  return { rows, skippedRows: skipped, missingColumns: [] };
}
