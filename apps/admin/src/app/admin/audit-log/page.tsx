import { requireRole } from "@/lib/auth/require-role";
import { ComingSoon } from "../_components/ComingSoon";

export default async function AuditLogPage() {
  await requireRole(["superadmin", "operator"]);
  return <ComingSoon title="Audit log" />;
}
