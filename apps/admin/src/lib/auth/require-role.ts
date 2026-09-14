import { redirect } from "next/navigation";
import { getCurrentProfile, type CurrentProfile, type Role } from "./current-profile";

// Server-only: koristi se na početku svake /admin/* stranice. Redundantno je
// sa nav filterom u layout.tsx (koji samo krije linkove), ali je stvarna
// zaštita — nav filter se lako zaobiđe direktnim URL-om, ovo ne.
export async function requireRole(allowed: Role[]): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/admin");
  }
  if (!allowed.includes(profile.role)) {
    redirect("/admin");
  }
  return profile;
}
