import { createClient } from "@/lib/supabase/server";

export type Role = "superadmin" | "operator" | "agency_admin" | "agency_user";

export type CurrentProfile = {
  userId: string;
  email: string | null;
  role: Role;
  agencyId: string | null;
};

// Server-only: ulogovan korisnik + njegova uloga/agencija iz profiles.
// Vraća null ako nije ulogovan ili nema profil red (auth nalog postoji, ali
// profil nije ručno uveden — vidi Korak 4/5 test uputstva u README-u).
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    role: profile.role as Role,
    agencyId: profile.agency_id as string | null,
  };
}
