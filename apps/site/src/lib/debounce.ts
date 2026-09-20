// Debounce za pretragu "na svako slovo": svaki upit ka bazi košta (Server
// Component render + Supabase poziv), pa se ne šalje na svaki pritisak tipke
// nego tek kad posetilac zastane. Vidi docs/PLAN-JAVNI-SAJT.md, Korak 4.

export const SEARCH_DEBOUNCE_MS = 300;

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}
