import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";
import { buildOfferSearchOr } from "@/lib/search-filter";
import { UploadForm } from "./UploadForm";
import { OfferStatusControl } from "./OfferStatusControl";
import { OfferKontaktUrlControl } from "./OfferKontaktUrlControl";
import { CENA_TIP_LABEL, type CenaTip } from "@/lib/offers/cena-tip";

const STATUS_OPTIONS = [
  { value: "pending_review", label: "Čeka pregled" },
  { value: "published", label: "Objavljeno" },
  { value: "paused", label: "Pauzirano" },
  { value: "rejected", label: "Odbijeno" },
  { value: "expired", label: "Isteklo" },
];

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

const PAGE_SIZE = 50;

// Faza 2, Korak 2: upload intake. Korak 3: CSV/Excel parsing sad upisuje
// offers (sinhrono, privremeno — vidi lib/offers/ingest.ts).
export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    agency?: string;
  }>;
}) {
  const me = await requireRole([
    "superadmin",
    "operator",
    "agency_admin",
    "agency_user",
  ]);

  const isStaff = me.role === "superadmin" || me.role === "operator";

  const {
    page: pageParam,
    q,
    status,
    agency: agencyParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const query = q?.trim() || undefined;
  // Agency filter je smislen samo za staff (agencija već vidi samo sebe
  // preko RLS-a) — ignoriši parametar ako ga pošalje agencijski nalog.
  const agencyFilter = isStaff ? agencyParam?.trim() || undefined : undefined;

  const supabase = await createClient();

  // Agencije se učitavaju pre offers upita (staff dropdown filter, i da bi
  // pretraga po tekstu mogla i naziv agencije da poklopi — vidi
  // buildOfferSearchOr). Za agencijski nalog nema smisla: RLS ga već svodi
  // na jednu jedinu agenciju.
  const { data: agencies } = isStaff
    ? await supabase.from("agencies").select("id, naziv").order("naziv")
    : { data: null };
  const matchingAgencyIds =
    query && agencies
      ? agencies
          .filter((a) => a.naziv.toLowerCase().includes(query.toLowerCase()))
          .map((a) => a.id)
      : [];

  let offersQuery = supabase
    .from("offers")
    .select(
      "id, naziv, destinacija, datum_polaska, datum_povratka, cena_eur, cena_tip, cena_po_osobi, status, confidence_score, dostupno_mesta, kontakt_url",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (query) offersQuery = offersQuery.or(buildOfferSearchOr(query, matchingAgencyIds));
  if (status) offersQuery = offersQuery.eq("status", status);
  if (agencyFilter) offersQuery = offersQuery.eq("agency_id", agencyFilter);

  const [{ data: uploads }, { data: offers, count: offersCount }] =
    await Promise.all([
      supabase
        .from("uploads")
        .select("id, originalni_fajl_url, tip, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      offersQuery,
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
      <FilterBar
        basePath="/admin/offers"
        q={query}
        status={status}
        statusOptions={STATUS_OPTIONS}
        agencyId={agencyFilter}
        agencies={isStaff ? (agencies ?? []) : undefined}
      />
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">Naziv</th>
            <th className="py-2 pr-4 font-medium">Destinacija</th>
            <th className="py-2 pr-4 font-medium">Polazak — povratak</th>
            <th className="py-2 pr-4 font-medium">Cena</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Link ka apartmanu</th>
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
              <td className="py-2 pr-4">
                {o.cena_eur}€{" "}
                <span className="text-xs text-gray-500">
                  {CENA_TIP_LABEL[o.cena_tip as CenaTip] ?? o.cena_tip}
                  {o.cena_tip === "po_jedinici" &&
                    ` (≈ ${o.cena_po_osobi} €/os.)`}
                </span>
              </td>
              <td className="py-2 pr-4">
                <OfferStatusControl
                  offerId={o.id}
                  status={o.status}
                  dostupnoMesta={o.dostupno_mesta}
                />
              </td>
              <td className="py-2 pr-4">
                <OfferKontaktUrlControl
                  offerId={o.id}
                  kontaktUrl={o.kontakt_url}
                />
              </td>
            </tr>
          ))}
          {(offers ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-gray-400">
                Nema ponuda još.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/offers"
        query={{ q: query, status, agency: agencyFilter }}
      />

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
