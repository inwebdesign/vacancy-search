import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/Pagination";
import { FilterBar } from "@/components/FilterBar";
import { buildOfferSearchOr } from "@/lib/search-filter";
import { ReviewRow } from "./ReviewRow";

const PAGE_SIZE = 50;

// Faza 2, Korak 5: sve pending_review ponude, svih agencija (superadmin/
// operator, po brief sekciji 6). Nema "svoja agencija" filter ovde — to je
// tačno operator-ova nadležnost.
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; agency?: string }>;
}) {
  await requireRole(["superadmin", "operator"]);

  const { page: pageParam, q, agency: agencyParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const query = q?.trim() || undefined;
  const agencyFilter = agencyParam?.trim() || undefined;

  const supabase = await createClient();

  // Agencije se učitavaju pre offers upita — treba nam spisak i za dropdown
  // filter i da bi tekstualna pretraga mogla i naziv agencije da poklopi.
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, naziv")
    .order("naziv");
  const matchingAgencyIds = query
    ? (agencies ?? [])
        .filter((a) => a.naziv.toLowerCase().includes(query.toLowerCase()))
        .map((a) => a.id)
    : [];

  let offersQuery = supabase
    .from("offers")
    .select(
      "id, naziv, destinacija, datum_polaska, datum_povratka, cena_eur, max_gostiju, dostupno_mesta, kontakt_url, confidence_score, agencies(naziv)",
      { count: "exact" },
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .range(from, to);
  if (query) offersQuery = offersQuery.or(buildOfferSearchOr(query, matchingAgencyIds));
  if (agencyFilter) offersQuery = offersQuery.eq("agency_id", agencyFilter);

  const { data: offers, count: offersCount } = await offersQuery;

  const totalPages = Math.max(1, Math.ceil((offersCount ?? 0) / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-xl font-semibold">
        Review queue{" "}
        {offersCount !== null && offersCount !== undefined && (
          <span className="text-sm font-normal text-gray-400">
            ({offersCount} ukupno)
          </span>
        )}
      </h1>
      <p className="mt-1 text-sm text-gray-400">
        Ponude koje čekaju ručnu potvrdu — izmeni pre odobravanja ako treba,
        pa odobri ili odbij.
      </p>
      <FilterBar
        basePath="/admin/review"
        q={query}
        agencyId={agencyFilter}
        agencies={agencies ?? []}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 pr-2 font-medium">Agencija</th>
              <th className="py-2 pr-2 font-medium">Naziv</th>
              <th className="py-2 pr-2 font-medium">Destinacija</th>
              <th className="py-2 pr-2 font-medium">Polazak</th>
              <th className="py-2 pr-2 font-medium">Povratak</th>
              <th className="py-2 pr-2 font-medium">Cena</th>
              <th className="py-2 pr-2 font-medium">Max</th>
              <th className="py-2 pr-2 font-medium">Mesta</th>
              <th className="py-2 pr-2 font-medium">Kontakt</th>
              <th className="py-2 pr-2 font-medium">Conf.</th>
              <th className="py-2 pr-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(offers ?? []).map((o) => (
              <ReviewRow
                key={o.id}
                offer={{
                  ...o,
                  agencyName:
                    (
                      o as unknown as {
                        agencies?: { naziv: string } | null;
                      }
                    ).agencies?.naziv ?? null,
                }}
              />
            ))}
            {(offers ?? []).length === 0 && (
              <tr>
                <td colSpan={11} className="py-4 text-gray-400">
                  Nema ponuda na čekanju.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/review"
        query={{ q: query, agency: agencyFilter }}
      />
    </div>
  );
}
