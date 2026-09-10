import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Faza 2, Korak 6: javna (bez auth) click-out ruta — brief sekcija 9,
// "clicks tabela beleži svaki klik na 'Poseti agenciju' dugme". Poziva se sa
// javnog sajta (apps/site), ali NIJE ožičena tamo — apps/site trenutno čita
// mock podatke, ne pravu offers tabelu (van scope-a brief-a, sekcija 1:
// "Javni search sajt... nije predmet ovog brief-a"). Testira se direktno
// preko URL-a dok se ta integracija ne uradi.
//
// service_role je neophodan — poziva ga anoniman posetilac sajta bez
// ulogovane sesije, nema RLS-scoped klijenta za njega.
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

  // Gruba heuristika za bot-ove i duple klikove — namerno jednostavno za
  // prvi prolaz (regex na user-agent + 30-min prozor po istom ip_hash-u za
  // istu ponudu), otvoreno za doradu.
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
