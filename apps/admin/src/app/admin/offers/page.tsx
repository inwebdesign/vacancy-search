import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./UploadForm";

// Path format je {agencyId}/{uuid}-{filename} (vidi actions.ts) — skida
// prefiks agencije i uuid da prikaže samo originalno ime fajla.
function displayFileName(path: string) {
  const last = path.split("/").pop() ?? path;
  return last.replace(/^[0-9a-f-]{36}-/, "");
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Na čekanju",
  processing: "Obrada u toku",
  completed: "Obrađeno",
  failed: "Neuspešno",
};

// Faza 2, Korak 2: upload intake. Parsing (Korak 3+) još ne postoji — status
// ostaje "pending" dok se ne doda. Sadržaj ponuda (offers) dolazi kad Korak 3
// počne da ih upisuje.
export default async function OffersPage() {
  const me = await requireRole([
    "superadmin",
    "operator",
    "agency_admin",
    "agency_user",
  ]);

  const supabase = await createClient();
  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, originalni_fajl_url, tip, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const canUpload = me.role === "agency_admin" || me.role === "agency_user";

  return (
    <div>
      <h1 className="text-xl font-semibold">Ponude</h1>
      {canUpload && (
        <>
          <p className="mt-1 text-sm text-gray-400">
            Uploaduj CSV/Excel/PDF fajl sa ponudama — obrada (mapiranje
            kolona, ekstrakcija) dolazi u sledećem koraku, za sada se samo
            prima i čuva.
          </p>
          <UploadForm />
        </>
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
                {STATUS_LABEL[u.status] ?? u.status}
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
