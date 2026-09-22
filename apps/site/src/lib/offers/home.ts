import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { searchOffers, type PublicOffer } from "./search";
import { todayInBelgrade } from "./params";

// "Najtraženije ovog meseca" — nema još praćenja stvarne popularnosti
// (pregledi/klikovi po ponudi), pa je "najjeftinije prvo" korišćen kao
// zamenski kriterijum (isto sortiranje kao rezultati pretrage). Tech debt:
// zameniti pravom metrikom kad postoji.
export async function getTopOffers(limit: number): Promise<PublicOffer[]> {
  const { offers } = await searchOffers({ page: 1 });
  return offers.slice(0, limit);
}

export type DestinationStat = {
  destinacija: string;
  count: number;
  minCenaPoOsobi: number;
};

type DestinationRow = { destinacija: string; cena_po_osobi: number };

// Grupisanje po destinaciji radi se u JS-u nad celim (malim) skupom
// objavljenih ponuda — nema DB-side GROUP BY preko PostgREST-a bez view-a/
// RPC-a. Tech debt: preći na pravu bazu agregaciju kad ponuda bude na
// hiljade, ne desetine.
export async function getDestinationStats(limit: number): Promise<DestinationStat[]> {
  const today = todayInBelgrade();
  const { data, error } = await createPublicClient()
    .from("offers")
    .select("destinacija, cena_po_osobi")
    .eq("status", "published")
    .gte("datum_polaska", today)
    .or("dostupno_mesta.is.null,dostupno_mesta.gt.0");

  if (error) {
    throw new Error(`Statistika po destinaciji nije uspela: ${error.message}`);
  }

  const byDestination = new Map<string, { count: number; min: number }>();
  for (const row of (data ?? []) as unknown as DestinationRow[]) {
    const existing = byDestination.get(row.destinacija);
    if (existing) {
      existing.count += 1;
      existing.min = Math.min(existing.min, row.cena_po_osobi);
    } else {
      byDestination.set(row.destinacija, { count: 1, min: row.cena_po_osobi });
    }
  }

  return [...byDestination.entries()]
    .map(([destinacija, s]) => ({ destinacija, count: s.count, minCenaPoOsobi: s.min }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Sve destinacije koje TRENUTNO imaju bar jednu objavljenu, ne-proslu,
// ne-rasprodatu ponudu — za predloge u traci za pretragu (<datalist>, bez
// posebnog autocomplete JS-a). Mali skup (do desetak destinacija u praksi),
// pa nema potrebe za paginacijom/limitom ovde.
export async function getDestinationNames(): Promise<string[]> {
  const stats = await getDestinationStats(1000);
  return stats.map((s) => s.destinacija).sort((a, b) => a.localeCompare(b, "sr"));
}
