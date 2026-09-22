// Jedino mesto koje formatira cene/datume/tekst za prikaz — komponente ne
// pozivaju toLocaleString ni ručno spajaju stringove (skill, odeljak 6).

export function formatPrice(eur: number): string {
  return `${formatNumber(eur)} €`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 2 }).format(n);
}

// from/to su "YYYY-MM-DD". Prva strana bez godine, druga sa godinom i tačkom
// na kraju — srpski format datuma: "12.07 — 22.07.2026."
export function formatDateRange(from: string, to: string): string {
  const f = splitIsoDate(from);
  const t = splitIsoDate(to);
  return `${f.d}.${f.m} — ${t.d}.${t.m}.${t.y}.`;
}

function splitIsoDate(iso: string): { y: string; m: string; d: string } {
  const [y, m, d] = iso.split("-");
  return { y, m, d };
}

export type Guests = { adults: number; children?: number };

type PluralForms = { one: string; few: string; many: string };

const ADULT_FORMS: PluralForms = { one: "odrasla", few: "odrasle", many: "odraslih" };
const CHILD_FORMS: PluralForms = { one: "dete", few: "deteta", many: "dece" };

// Srpska množina: 1 (ne 11) → jednina; 2-4 (ne 12-14) → "malo"; ostalo → "puno".
function pluralCategory(n: number): keyof PluralForms {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few";
  return "many";
}

function pluralize(n: number, forms: PluralForms): string {
  return `${n} ${forms[pluralCategory(n)]}`;
}

export function formatGuests({ adults, children = 0 }: Guests): string {
  const parts = [pluralize(adults, ADULT_FORMS)];
  if (children > 0) parts.push(pluralize(children, CHILD_FORMS));
  return joinMeta(parts);
}

// Separator kroz ceo sajt je " · " — nikad zapeta, crta ili "|".
export function joinMeta(parts: string[]): string {
  return parts.filter(Boolean).join(" · ");
}

// Za broj unutar fraze koja je VEĆ u genitivu (npr. "ponuda N agencija" =
// "offers OF N agencies") — za razliku od formatGuests (nominativni kontekst,
// tri oblika: 1 / 2-4 / 5+), ovde ceo izraz nosi genitiv pa je razlika samo
// jednina/množina genitiva: "1 turističke agencije" nasuprot "38 turističkih
// agencija". Ne generalizovati na formatGuests-ov pattern — različito pravilo.
export function genitivePhrase(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("sr-RS", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Belgrade",
  }).format(date);
}
