import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service role klijent — zaobilazi RLS, koristiti SAMO u server-side kodu
// (API rute, server actions) za operacije kojima je to izričito potrebno.
// "server-only" import baca build grešku ako se ovaj fajl slučajno uveze
// u client bundle.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
