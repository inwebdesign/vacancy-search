// Tip cene ponude: po osobi ili za celu smeštajnu jedinicu (sobu/apartman).
// Vidi migraciju 20260921100000_offer_cena_tip. Čist kod (bez baze), deljen
// između PDF ekstrakcije (AI) i CSV/Excel parsiranja.

export type CenaTip = "po_osobi" | "po_jedinici";

export const CENA_TIP_LABEL: Record<CenaTip, string> = {
  po_osobi: "po osobi",
  po_jedinici: "za jedinicu",
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Prepoznaje i tačne vrednosti ("po_osobi") i slobodan tekst iz fajla
// ("Po osobi", "cena za smeštajnu jedinicu", "unit", "per person"...).
// Vraća null kad ne može da odluči — prazno, nepoznato ili dvosmisleno
// (pominje i osobu i jedinicu). Pozivalac odlučuje šta to znači: CSV/Excel
// prazno tumači kao po_osobi (brief template: cena_po_osobi_eur), a nejasnu
// vrednost preskače; AI ekstrakcija nejasno šalje u review queue.
export function parseCenaTip(value: unknown): CenaTip | null {
  if (typeof value !== "string") return null;
  const n = normalize(value);
  if (!n) return null;

  const jedinica = /jedin|unit|apartman|objekat/.test(n);
  const osoba = /osob|person|glav/.test(n);
  if (jedinica && !osoba) return "po_jedinici";
  if (osoba && !jedinica) return "po_osobi";
  return null;
}
