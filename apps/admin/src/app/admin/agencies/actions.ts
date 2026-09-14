"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { logAudit } from "@/lib/audit/log";

const schema = z.object({
  agencyId: z.string().uuid(),
  naziv: z.string().trim().min(1, "Naziv ne sme biti prazan."),
  kontakt: z.string().trim().min(1, "Kontakt ne sme biti prazan."),
  website: z.string().trim().optional(),
});

export type AgencyProfileState = { error?: string; success?: boolean } | null;

// Agencija (agency_admin) menja SVOJE osnovne podatke (naziv/kontakt/
// website) -- RLS (agencies_update_agency_admin policy + trigger
// agencies_self_edit_scope, vidi migraciju 20260915100000) je stvarna
// granica ko sme da menja koji red i koje kolone; ova provera je samo rana
// UX povratna informacija, ne bezbednosna granica.
export async function updateAgencyProfile(
  _prevState: AgencyProfileState,
  formData: FormData,
): Promise<AgencyProfileState> {
  const me = await getCurrentProfile();
  if (!me || (me.role !== "superadmin" && me.role !== "agency_admin")) {
    return { error: "Nemate dozvolu za ovu izmenu." };
  }

  const parsed = schema.safeParse({
    agencyId: formData.get("agencyId"),
    naziv: formData.get("naziv"),
    kontakt: formData.get("kontakt"),
    website: formData.get("website"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nevažeći podaci." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agencies")
    .update({
      naziv: parsed.data.naziv,
      kontakt: parsed.data.kontakt,
      website: parsed.data.website || null,
    })
    .eq("id", parsed.data.agencyId);

  if (error) {
    return { error: `Izmena nije uspela: ${error.message}` };
  }

  await logAudit({
    actorId: me.userId,
    actorEmail: me.email,
    action: "agency.update_profile",
    targetTable: "agencies",
    targetId: parsed.data.agencyId,
    diff: {
      naziv: parsed.data.naziv,
      kontakt: parsed.data.kontakt,
      website: parsed.data.website || null,
    },
  });

  revalidatePath("/admin/agencies");
  revalidatePath("/admin");
  return { success: true };
}
