import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./UploadForm";

// Path format je {agencyId}/{uuid}-{filename} (vidi actions.ts) — skida
// prefiks agencije i uuid da prikaže samo originalno ime fajla.
function displayFileName(path: string) {
  const last = path.split("/").pop() ?? path;
  return last.replace(/^[0-9a-f-]{36}-/, "");
}

const UPLOAD_STATUS_LABEL: Record<string, string> = {
  pending: "Na čekanju",
  processing: "Obrada u toku",
  completed: "Obrađeno",
  failed: "Neuspešno",
};

const OFFER_STATUS_LABEL: Record<string, string> = {
  pending_review: "Čeka pregled",
  published: "Objavljeno",
  rejected: "Odbijeno",
  expired: "Isteklo",
};

const PAGE_SIZE = 50;

// Faza 2, Korak 2: upload intake. Korak 3: CSV/Excel parsing sad upisuje
// offers (sinhrono, privremeno — vidi lib/offers/ingest.ts).
export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await requireRole([
    "superadmin",
    "operator",
    "agency_admin",
    "agency_user",
  ]);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const [{ data: uploads }, { data: offers, count: offersCount }] =
    await Promise.all([
      supabase
        .from("uploads")
        .select("id, originalni_fajl_url, tip, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("offers")
        .select(
          "id, naziv, destinacija, datum_polaska, datum_povratka, cena_eur, status, confidence_score",
          { count: "exact" },
        )
        .order("updated_at", { ascending: false })
        .range(from, to),
    ]);

  const totalPages = Math.max(1, Math.ceil((offersCount ?? 0) / PAGE_SIZE));

  const canUpload = me.role === "agency_admin" || me.role === "agency_user";

  return (
    <div>
      <h1 className="text-xl font-semibold">Ponude</h1>
      {canUpload && (
        <>
          <p className="mt-1 text-sm text-gray-400">
            Uploaduj CSV/Excel/PDF fajl sa ponudama — obrada kreće odmah
            (PDF preko Claude API-ja može potrajati 10-30s).
          </p>
          <UploadForm />
        </>
      )}

      <h2 className="mt-8 text-lg font-medium">
        Ponude {offersCount !== null && offersCount !== undefined && (
          <span className="text-sm font-normal text-gray-400">
            ({offersCount} ukupno)
          </span>
        )}
      </h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">Naziv</th>
            <th className="py-2 pr-4 font-medium">Destinacija</th>
            <th className="py-2 pr-4 font-medium">Polazak — povratak</th>
            <th className="py-2 pr-4 font-medium">Cena</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {(offers ?? []).map((o) => (
            <tr key={o.id} className="border-b border-gray-100">
              <td className="py-2 pr-4">{o.naziv}</td>
              <td className="py-2 pr-4">{o.destinacija}</td>
              <td className="py-2 pr-4 text-gray-500">
                {o.datum_polaska} — {o.datum_povratka}
              </td>
              <td className="py-2 pr-4">{o.cena_eur}€</td>
              <td className="py-2 pr-4">
                {OFFER_STATUS_LABEL[o.status] ?? o.status}
              </td>
            </tr>
          ))}
          {(offers ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-gray-400">
                Nema ponuda još.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <a
            href={page <= 1 ? undefined : `/admin/offers?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={
              page <= 1
                ? "pointer-events-none text-gray-300"
                : "text-gray-700 underline"
            }
          >
            ← Prethodna
          </a>
          <span className="text-gray-500">
            Strana {page} od {totalPages}
          </span>
          <a
            href={
              page >= totalPages
                ? undefined
                : `/admin/offers?page=${page + 1}`
            }
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages
                ? "pointer-events-none text-gray-300"
                : "text-gray-700 underline"
            }
          >
            Sledeća →
          </a>
        </div>
      )}

      <h2 className="mt-8 text-lg font-medium">Istorija upload-a</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">Fajl</th>
            <th className="py-2 pr-4 font-medium">Tip</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Vreme</th>
          </tr>
        </thead>
        <tbody>
          {(uploads ?? []).map((u) => (
            <tr key={u.id} className="border-b border-gray-100">
              <td className="py-2 pr-4">
                {displayFileName(u.originalni_fajl_url)}
              </td>
              <td className="py-2 pr-4">{u.tip}</td>
              <td className="py-2 pr-4">
                {UPLOAD_STATUS_LABEL[u.status] ?? u.status}
              </td>
              <td className="py-2 pr-4 text-gray-500">
                {new Date(u.created_at).toLocaleString("sr-Latn-RS")}
              </td>
            </tr>
          ))}
          {(uploads ?? []).length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-gray-400">
                Nema upload-a još.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
