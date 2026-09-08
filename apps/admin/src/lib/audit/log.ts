import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type LogAuditEntry = {
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetTable: string;
  targetId?: string | null;
  diff?: Record<string, unknown> | null;
};

// Upisuje audit_log preko service_role (RLS na toj tabeli ne dozvoljava
// INSERT nikome preko obične sesije, vidi migraciju). Best-effort — greška
// pri upisu se samo loguje na server, ne sme da obori akciju koju prati
// (npr. uklanjanje člana tima mora da uspe i ako log ne uspe).
export async function logAudit(entry: LogAuditEntry): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_log").insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    target_table: entry.targetTable,
    target_id: entry.targetId ?? null,
    diff: entry.diff ?? null,
  });

  if (error) {
    console.error("audit log write failed:", error.message);
  }
}
