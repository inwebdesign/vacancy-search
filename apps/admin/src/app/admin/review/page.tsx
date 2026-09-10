import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ReviewRow } from "./ReviewRow";

// Faza 2, Korak 5: sve pending_review ponude, svih agencija (superadmin/
// operator, po brief sekciji 6). Nema "svoja agencija" filter ovde — to je
// tačno operator-ova nadležnost.
export default async function ReviewPage() {
  await requireRole(["superadmin", "operator"]);

  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("offers")
    .select(
      "id, naziv, destinacija, datum_polaska, datum_povratka, cena_eur, max_gostiju, dostupno_mesta, kontakt_url, confidence_score, agencies(naziv)",
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-xl font-semibold">Review queue</h1>
      <p className="mt-1 text-sm text-gray-400">
        Ponude koje čekaju ručnu potvrdu — izmeni pre odobravanja ako treba,
        pa odobri ili odbij.
      </p>
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
                        agencies?: { naziv: string }[] | null;
                      }
                    ).agencies?.[0]?.naziv ?? null,
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
    </div>
  );
}
