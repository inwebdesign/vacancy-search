import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteForm } from "./InviteForm";
import { MemberActions } from "./MemberActions";

// Lista članova ide kroz RLS (profiles_select) — superadmin vidi sve,
// agency_admin samo svoju agenciju (i sopstveni red). Email se dohvata
// posebno preko service_role Admin API-ja jer profiles ne čuva email
// (auth.users to čuva, a REST/RLS klijent nema pristup toj šemi).
export default async function TeamPage() {
  const me = await requireRole(["superadmin", "agency_admin"]);

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, agency_id, created_at, agencies(naziv)")
    .order("created_at", { ascending: true });

  const admin = createAdminClient();
  const members = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return { ...p, email: data.user?.email ?? "(nepoznato)" };
    }),
  );

  let agencies: { id: string; naziv: string }[] = [];
  if (me.role === "superadmin") {
    const { data } = await supabase
      .from("agencies")
      .select("id, naziv")
      .order("naziv");
    agencies = data ?? [];
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Tim</h1>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Uloga</th>
            {me.role === "superadmin" && (
              <th className="py-2 pr-4 font-medium">Agencija</th>
            )}
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-gray-100">
              <td className="py-2 pr-4">{m.email}</td>
              <td className="py-2 pr-4">{m.role}</td>
              {me.role === "superadmin" && (
                <td className="py-2 pr-4">
                  {(m as unknown as { agencies?: { naziv: string }[] | null })
                    .agencies?.[0]?.naziv ?? "—"}
                </td>
              )}
              <td className="py-2 pr-4">
                {m.id === me.userId ? (
                  <span className="text-gray-400">(vi)</span>
                ) : (
                  <MemberActions
                    memberId={m.id}
                    currentRole={m.role}
                    callerRole={me.role}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-8 text-lg font-semibold">Pozovi novog člana</h2>
      <InviteForm
        callerRole={me.role}
        callerAgencyId={me.agencyId}
        agencies={agencies}
      />
    </div>
  );
}
