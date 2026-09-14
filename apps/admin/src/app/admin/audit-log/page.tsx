import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

// Faza 1, Korak 8. Upis ide isključivo preko lib/audit/log.ts (service_role,
// zaobilazi RLS) — ovde samo čitamo, RLS (audit_log_select_superadmin_operator)
// ionako ne bi propustio ništa drugim ulogama i da je stranica dostupna.
export default async function AuditLogPage() {
  await requireRole(["superadmin", "operator"]);

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, target_table, target_id, diff, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-gray-400">Poslednjih 100 zapisa.</p>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">Vreme</th>
            <th className="py-2 pr-4 font-medium">Ko</th>
            <th className="py-2 pr-4 font-medium">Akcija</th>
            <th className="py-2 pr-4 font-medium">Cilj</th>
            <th className="py-2 pr-4 font-medium">Detalji</th>
          </tr>
        </thead>
        <tbody>
          {(entries ?? []).map((e) => (
            <tr key={e.id} className="border-b border-gray-100 align-top">
              <td className="whitespace-nowrap py-2 pr-4 text-gray-500">
                {new Date(e.created_at).toLocaleString("sr-Latn-RS")}
              </td>
              <td className="py-2 pr-4">{e.actor_email ?? "—"}</td>
              <td className="py-2 pr-4">{e.action}</td>
              <td className="py-2 pr-4">
                {e.target_table}
                {e.target_id ? ` #${e.target_id.slice(0, 8)}` : ""}
              </td>
              <td className="py-2 pr-4">
                {e.diff ? (
                  <pre className="max-w-xs overflow-x-auto text-xs text-gray-500">
                    {JSON.stringify(e.diff, null, 2)}
                  </pre>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
          {(entries ?? []).length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-gray-400">
                Nema zapisa još.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
