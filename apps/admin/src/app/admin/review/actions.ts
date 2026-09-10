"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { logAudit } from "@/lib/audit/log";

export type ReviewState = { error?: string; success?: boolean } | null;

// Faza 2, Korak 5: review queue (brief sekcija 6/8 — operator "uređuje
// ponude svih agencija", "sve što ne prođe prag pouzdanosti ide u internu
// review queue"). UPDATE ide preko korisnikove sopstvene RLS-scoped sesije
// (offers_update_superadmin_operator policy iz Koraka 1 već dozvoljava ovo)
// — nije potreban service_role, RLS je stvarna granica, isto kao svuda do
// sad u projektu.
export async function reviewOffer(
  offerId: string,
  decision: "approve" | "reject" | "save",
  _prevState: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const me = await getCurrentProfile();
  if (!me || (me.role !== "superadmin" && me.role !== "operator")) {
    return { error: "Nemate dozvolu za ovu akciju." };
  }

  const naziv = String(formData.get("naziv") ?? "").trim();
  const destinacija = String(formData.get("destinacija") ?? "").trim();
  const datumPolaska = String(formData.get("datum_polaska") ?? "");
  const datumPovratka = String(formData.get("datum_povratka") ?? "");
  const cenaEur = Number(formData.get("cena_eur"));
  const maxGostiju = Number(formData.get("max_gostiju"));
  const dostupnoMesta = Number(formData.get("dostupno_mesta"));
  const kontaktUrl = String(formData.get("kontakt_url") ?? "").trim();

  if (
    !naziv ||
    !destinacija ||
    !datumPolaska ||
    !datumPovratka ||
    !kontaktUrl ||
    !Number.isFinite(cenaEur) ||
    !Number.isFinite(maxGostiju) ||
    !Number.isFinite(dostupnoMesta)
  ) {
    return { error: "Popuni sva polja ispravno." };
  }

  const update: Record<string, unknown> = {
    naziv,
    destinacija,
    datum_polaska: datumPolaska,
    datum_povratka: datumPovratka,
    cena_eur: cenaEur,
    max_gostiju: maxGostiju,
    dostupno_mesta: dostupnoMesta,
    kontakt_url: kontaktUrl,
  };
  if (decision === "approve") {
    update.status = "published";
    update.published_at = new Date().toISOString();
  } else if (decision === "reject") {
    update.status = "rejected";
  }

  const supabase = await createClient();
  const { error } = await supabase.from("offers").update(update).eq("id", offerId);
  if (error) {
    return { error: `Izmena nije uspela: ${error.message}` };
  }

  await logAudit({
    actorId: me.userId,
    actorEmail: me.email,
    action: `offer.${decision}`,
    targetTable: "offers",
    targetId: offerId,
    diff: update,
  });

  revalidatePath("/admin/review");
  revalidatePath("/admin/offers");
  return { success: true };
}
