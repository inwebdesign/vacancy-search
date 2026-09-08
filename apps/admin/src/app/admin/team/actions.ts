"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/current-profile";

const ROLES = ["superadmin", "operator", "agency_admin", "agency_user"] as const;
const roleSchema = z.enum(ROLES);

export async function updateMemberRole(memberId: string, role: string) {
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) {
    return { error: "Nevažeća uloga." };
  }

  // Oslanja se na profiles_update_agency_admin/superadmin RLS policy —
  // nema dodatne provere ovde, baza odlučuje da li je izmena dozvoljena.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsedRole.data })
    .eq("id", memberId);

  if (error) {
    return { error: "Izmena nije uspela — nemate dozvolu za tu izmenu." };
  }

  revalidatePath("/admin/team");
  return { success: true };
}

export async function removeMember(memberId: string) {
  const me = await getCurrentProfile();
  if (!me || (me.role !== "superadmin" && me.role !== "agency_admin")) {
    return { error: "Nemate dozvolu za ovu akciju." };
  }
  if (memberId === me.userId) {
    return { error: "Ne možete ukloniti sami sebe." };
  }

  // Brisanje ide preko auth.users (ON DELETE CASCADE briše i profiles) da ne
  // ostane siroče nalog bez profila — to zahteva service_role, pa dozvola
  // ide ručnom proverom ovde, ne kroz RLS na profiles.
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", memberId)
    .single();

  if (!target) {
    return { error: "Član nije pronađen." };
  }
  if (me.role === "agency_admin") {
    const targetIsAssignableRole =
      target.role === "agency_admin" || target.role === "agency_user";
    if (target.agency_id !== me.agencyId || !targetIsAssignableRole) {
      return { error: "Nemate dozvolu da uklonite ovog člana." };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(memberId);
  if (error) {
    return { error: `Uklanjanje nije uspelo: ${error.message}` };
  }

  revalidatePath("/admin/team");
  return { success: true };
}

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: roleSchema,
  agencyId: z.string().uuid().nullable(),
});

export type InviteState = { error?: string; success?: boolean } | null;

export async function inviteTeamMember(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const me = await getCurrentProfile();
  if (!me || (me.role !== "superadmin" && me.role !== "agency_admin")) {
    return { error: "Nemate dozvolu za ovu akciju." };
  }

  const rawAgencyId = formData.get("agencyId");
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    agencyId: rawAgencyId ? rawAgencyId : null,
  });
  if (!parsed.success) {
    return { error: "Proveri email, ulogu i agenciju." };
  }
  const { email, role, agencyId } = parsed.data;

  if (me.role === "agency_admin") {
    if (role !== "agency_admin" && role !== "agency_user") {
      return { error: "Nemate dozvolu da dodelite tu ulogu." };
    }
    if (agencyId !== me.agencyId) {
      return { error: "Možete pozivati samo u svoju agenciju." };
    }
  } else {
    const needsAgency = role === "agency_admin" || role === "agency_user";
    if (needsAgency && !agencyId) {
      return { error: "Za tu ulogu je potrebna agencija." };
    }
    if (!needsAgency && agencyId) {
      return { error: "Superadmin/operator ne pripadaju agenciji." };
    }
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited?.user) {
    return {
      error: `Slanje pozivnice nije uspelo: ${inviteError?.message ?? "nepoznata greška"}`,
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    role,
    agency_id: agencyId,
  });
  if (profileError) {
    return {
      error: `Pozivnica poslata, ali upis profila nije uspeo: ${profileError.message}`,
    };
  }

  revalidatePath("/admin/team");
  return { success: true };
}
