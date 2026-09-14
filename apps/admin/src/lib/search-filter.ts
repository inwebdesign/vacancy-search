// Gradi PostgREST .or() filter string za ILIKE pretragu preko više kolona
// odjednom (npr. naziv ILI destinacija sadrže traženi tekst).
//
// Escape-uje se dvostruko:
// 1. %  i _  su ILIKE wildcard karakteri — ako ih korisnik doslovno ukuca
//    (npr. traži "50%"), treba ih tretirati kao tekst, ne kao wildcard.
// 2. Zarez/zagrade/navodnik imaju posebno značenje u PostgREST .or() sintaksi
//    (razdvajaju uslove) — ako se pojave u vrednosti, cela vrednost mora da
//    se stavi pod navodnike.
export function buildOrIlike(term: string, columns: string[]): string {
  const escaped = term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  const pattern = `%${escaped}%`;
  const value = /[,()"]/.test(pattern)
    ? `"${pattern.replace(/"/g, '\\"')}"`
    : pattern;
  return columns.map((c) => `${c}.ilike.${value}`).join(",");
}
