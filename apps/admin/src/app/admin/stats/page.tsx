import { requireRole } from "@/lib/auth/require-role";
import { ComingSoon } from "../_components/ComingSoon";

export default async function StatsPage() {
  await requireRole(["superadmin", "operator", "agency_admin"]);
  return <ComingSoon title="Statistika" />;
}
