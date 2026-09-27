import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service role klijent — zaobilazi RLS. Koristi se ISKLJUČIVO u /go/[offerId]
// (Faza 4): anoniman posetilac nema sesiju, pa nema RLS-scoped klijenta za
// upis u clicks/čitanje kontakt_url (kolona nije u anon grantu, vidi
// apps/admin/README.md "Column-level grant na offers"). "server-only" import
// baca build grešku ako se ovaj fajl slučajno uveze u client bundle.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Nedostaju NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — vidi apps/site/.env.example.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
