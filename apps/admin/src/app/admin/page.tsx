// Auth/profil proveru radi već AdminLayout (layout.tsx) — ova stranica se
// oslanja na to, nema sopstvenu proveru (za razliku od pod-stranica koje
// imaju uže dozvoljene uloge, vidi lib/auth/require-role.ts).
export default function AdminHome() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Početna</h1>
      <p className="mt-2 text-sm text-gray-500">
        Faza 1, Korak 7: nav skelet. Sekcije u levom meniju zavise od tvoje
        uloge.
      </p>
    </div>
  );
}
