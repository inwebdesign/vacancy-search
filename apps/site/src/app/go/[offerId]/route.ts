import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Javna (bez auth) click-out ruta — Faza 2 Korak 6 (apps/admin) je ovo
// izgradila i testirala direktno preko URL-a, ali na admin domenu; Faza 4
// je premešta ovde jer je javni sajt (slobodno.rs) tamo gde posetilac
// stvarno klika "Idi na sajt", ne interni admin panel. Ista logika.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await params;
  const admin = createAdminClient();

  const { data: offer } = await admin
    .from("offers")
    .select("id, agency_id, kontakt_url, status")
    .eq("id", offerId)
    .single();

  if (!offer || offer.status !== "published") {
    return new NextResponse("Ponuda nije pronađena.", { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const userAgent = request.headers.get("user-agent");

  const isBot = /bot|crawler|spider|curl|wget|headless/i.test(userAgent ?? "");

  const { data: recentClick } = await admin
    .from("clicks")
    .select("id")
    .eq("offer_id", offer.id)
    .eq("ip_hash", ipHash)
    .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();

  await admin.from("clicks").insert({
    offer_id: offer.id,
    agency_id: offer.agency_id,
    ip_hash: ipHash,
    user_agent: userAgent,
    is_valid: !isBot && !recentClick,
  });

  return NextResponse.redirect(offer.kontakt_url, { status: 302 });
}
