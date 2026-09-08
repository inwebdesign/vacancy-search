import { requireRole } from "@/lib/auth/require-role";
import { ComingSoon } from "../_components/ComingSoon";

export default async function OffersPage() {
  await requireRole(["superadmin", "operator", "agency_admin", "agency_user"]);
  return <ComingSoon title="Ponude" />;
}
