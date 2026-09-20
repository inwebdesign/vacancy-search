import "server-only";
import { createClient } from "@supabase/supabase-js";

// Klijent za javne upite (anon ključ) — koristi se ISKLJUČIVO iz Server
// Component-i/ruta, nikad iz browser-a: "server-only" import baca build
// grešku ako se ovaj fajl slučajno uveze u client bundle. Nema sesije ni
// cookie-a (sajt nema login) — RLS politika offers_select_public dozvoljava
// anon roli samo čitanje objavljenih ponuda, baza je stvarna granica.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Nedostaju NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — vidi apps/site/.env.example.",
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
