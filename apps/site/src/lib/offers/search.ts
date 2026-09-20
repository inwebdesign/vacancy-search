import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, escapeLike, todayInBelgrade, type SearchParams } from "./params";

// Jedini spisak kolona koje sajt traži. Mora da ostane podskup javnih kolona
// iz migracije 20260920120000_public_offers_column_grant — `select *` bi
// pukao sa "permission denied". agency_id/status se ne traže (tehničke su).
const PUBLIC_OFFER_COLUMNS =
  "id, naziv, destinacija, datum_polaska, datum_povratka, cena_eur, max_gostiju, dostupno_mesta, updated_at, agencies(naziv)";

export type PublicOffer = {
  id: string;
  naziv: string;
  destinacija: string;
  datumPolaska: string;
  datumPovratka: string;
  cenaEur: number;
  maxGostiju: number;
  dostupnoMesta: number | null;
  azurirano: string; // ISO vreme, za pečat "ažurirano pre X"
  agencija: string | null; // izvor
};

export type SearchResult = {
  offers: PublicOffer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Row = {
  id: string;
  naziv: string;
  destinacija: string;
  datum_polaska: string;
  datum_povratka: string;
  cena_eur: number;
  max_gostiju: number;
  dostupno_mesta: number | null;
  updated_at: string;
  agencies: { naziv: string } | null;
};

// Pretraga objavljenih ponuda. Filteri su svi opcioni:
// - destinacija: sadrži uneti tekst, bez obzira na velika/mala slova
// - datumi: PREKLAPANJE perioda ponude sa traženim periodom (polazak <= do
//   I povratak >= od); sa samo jednim datumom važi samo odgovarajuća strana
// - brojGostiju: ponuda prima bar toliko gostiju (max_gostiju >= traženo)
// Uvek: samo published, ne prošli polazak, ne rasprodato (dostupno_mesta = 0).
// Redosled: najjeftinije prvo; id kao drugi ključ da paginacija bude stabilna.
// `today` se može zadati (testovi); podrazumevano je danas u Srbiji.
export async function searchOffers(
  params: SearchParams,
  opts: { today?: string } = {},
): Promise<SearchResult> {
  const today = opts.today ?? todayInBelgrade();
  const from = (params.page - 1) * PAGE_SIZE;

  let query = createPublicClient()
    .from("offers")
    .select(PUBLIC_OFFER_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .gte("datum_polaska", today)
    .or("dostupno_mesta.is.null,dostupno_mesta.gt.0")
    .order("cena_eur", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (params.destinacija) {
    query = query.ilike("destinacija", `%${escapeLike(params.destinacija)}%`);
  }
  if (params.datumOd) query = query.gte("datum_povratka", params.datumOd);
  if (params.datumDo) query = query.lte("datum_polaska", params.datumDo);
  if (params.brojGostiju) query = query.gte("max_gostiju", params.brojGostiju);

  const { data, count, error } = await query;
  if (error?.code === "PGRST103" && params.page > 1) {
    // Strana iza poslednje (npr. ručno ukucan ?page=400): baza odgovara
    // "range not satisfiable". Nije greška za posetioca — vraća se prazna
    // lista sa tačnim total, a UI odlučuje (npr. vodi na poslednju stranu).
    const { total } = await searchOffers({ ...params, page: 1 }, opts);
    return {
      offers: [],
      total,
      page: params.page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }
  if (error) {
    throw new Error(`Pretraga ponuda nije uspela: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    offers: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      naziv: r.naziv,
      destinacija: r.destinacija,
      datumPolaska: r.datum_polaska,
      datumPovratka: r.datum_povratka,
      cenaEur: r.cena_eur,
      maxGostiju: r.max_gostiju,
      dostupnoMesta: r.dostupno_mesta,
      azurirano: r.updated_at,
      agencija: r.agencies?.naziv ?? null,
    })),
    total,
    page: params.page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
