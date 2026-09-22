import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export type HeaderStats = {
  agencyCount: number;
  updatedAt: Date;
};

// Statistika za utility traku u headeru ("Poređenje ponuda N agencija ·
// ažurirano danas u HH:MM"). agencyCount broji agencije koje anon uopšte
// sme da vidi preko agencies_select_public politike (ima bar jednu
// published ponudu) — isti upit koji embed u searchOffers() koristi.
//
// updatedAt je pojednostavljeno na vreme renderovanja stranice, ne na
// stvarno vreme poslednje osvežene cene (to bi tražilo praćenje
// revalidacije po izvoru — tech debt, vidi apps/admin/README.md).
export async function getHeaderStats(): Promise<HeaderStats> {
  const { count } = await createPublicClient()
    .from("agencies")
    .select("id", { count: "exact", head: true });

  return {
    agencyCount: count ?? 0,
    updatedAt: new Date(),
  };
}
