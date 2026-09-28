// Čista funkcija (bez "server-only" — koristi se i iz klijentskih filter
// komponenti) koja gradi sledeći URL za /pretraga: klonira trenutni query,
// primenjuje izmene, i vraća na prvu stranu kad se filter menja (osim kad
// se baš stranica menja).
export function buildSearchUrl(
  pathname: string,
  current: URLSearchParams,
  updates: Record<string, string | string[] | null | undefined>,
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    const empty = value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    if (empty) next.delete(key);
    else if (Array.isArray(value)) next.set(key, value.join(","));
    else next.set(key, value);
  }
  if (!("page" in updates)) next.delete("page");
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
