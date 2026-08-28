import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Zajednička povratna ruta za OAuth (Google) i magic-link/invite mejlove —
// razmenjuje `code` za sesiju (PKCE flow). `next` određuje gde korisnik ide
// posle: invite mejlovi ga podešavaju na /auth/set-password (konfiguriše se
// u Supabase Email Templates), OAuth login ide na / (podrazumevano).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
