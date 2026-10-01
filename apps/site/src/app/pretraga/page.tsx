import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterRail } from "@/components/filters/FilterRail";
import { ActiveFilterStrip, type FilterChip } from "@/components/results/ActiveFilterStrip";
import { ResultsHeader } from "@/components/results/ResultsHeader";
import { ResultCard } from "@/components/results/ResultCard";
import { Pagination } from "@/components/results/Pagination";
import { parseSearchParams } from "@/lib/offers/params";
import { searchOffers, getAgencyFacets, countOffers, getMinPrice } from "@/lib/offers/search";
import { getDestinationNames } from "@/lib/offers/home";
import { buildSearchUrl } from "@/lib/offers/query";
import { formatPrice } from "@/lib/format";
import styles from "./page.module.css";

const PATHNAME = "/pretraga";

// Filter rail ovde gradi SAMO grupe sa pravim kolonama (cena po osobi,
// agencija) — "tip jedinice", "udaljenost od plaže", "usluga", "sadržaj",
// "prevoz" iz mock-a nemaju strukturirane podatke u bazi (tech debt u
// apps/admin/README.md). Bez grupisanja ponuda po jedinici (Faza 4 odluka):
// svaka kartica je JEDNA ponuda JEDNE agencije, nema ekspandujuće tabele.
export default async function PretragaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseSearchParams(raw);

  const [result, agencyFacets, baseTotal, minPrice, destinationNames] = await Promise.all([
    searchOffers(params),
    getAgencyFacets(params),
    countOffers(params),
    getMinPrice(params),
    getDestinationNames(),
  ]);

  const current = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) current.set(key, first);
  }

  const chips: FilterChip[] = [];
  if (params.cenaOd !== undefined || params.cenaDo !== undefined) {
    const od = params.cenaOd;
    const doo = params.cenaDo;
    const label =
      od !== undefined && doo !== undefined
        ? `${formatPrice(od)} – ${formatPrice(doo)}`
        : od !== undefined
          ? `od ${formatPrice(od)}`
          : `do ${formatPrice(doo as number)}`;
    chips.push({
      key: "cena",
      label,
      removeHref: buildSearchUrl(PATHNAME, current, { cenaOd: undefined, cenaDo: undefined }),
    });
  }
  const selectedAgencije = params.agencije ?? [];
  for (const id of selectedAgencije) {
    const facet = agencyFacets.find((f) => f.id === id);
    if (!facet) continue;
    chips.push({
      key: `agencija-${id}`,
      label: facet.naziv,
      removeHref: buildSearchUrl(PATHNAME, current, {
        agencija: selectedAgencije.filter((a) => a !== id),
      }),
    });
  }

  const resetHref = buildSearchUrl(PATHNAME, current, {
    cenaOd: undefined,
    cenaDo: undefined,
    agencija: undefined,
  });

  const queryWithoutPage = new URLSearchParams(current);
  queryWithoutPage.delete("page");

  return (
    <main>
      <div className={styles.searchBand}>
        <div className={styles.searchInner}>
          <SearchBar
            destinations={destinationNames}
            defaultDestinacija={params.destinacija}
            defaultDatumOd={params.datumOd}
            defaultDatumDo={params.datumDo}
            defaultBrojGostiju={params.brojGostiju}
          />
        </div>
      </div>

      <nav aria-label="Navigacija putanjom" className={styles.breadcrumb}>
        <Link href="/">Početna</Link>
        {params.destinacija && <span> · {params.destinacija}</span>}
        <span className={styles.breadcrumbCurrent}> · rezultati pretrage</span>
      </nav>

      <div className={styles.body}>
        <FilterRail
          cenaOd={params.cenaOd}
          cenaDo={params.cenaDo}
          agencyFacets={agencyFacets}
          selectedAgencije={selectedAgencije}
          resetHref={resetHref}
          activeFilterCount={chips.length}
          baseTotal={baseTotal}
          filteredTotal={result.total}
          minPrice={minPrice}
        />
        <div className={styles.content}>
          <ResultsHeader
            destinacija={params.destinacija}
            datumOd={params.datumOd}
            datumDo={params.datumDo}
            brojGostiju={params.brojGostiju}
            total={result.total}
          />
          <ActiveFilterStrip chips={chips} resetHref={resetHref} />
          {result.offers.length > 0 ? (
            <div className={styles.results}>
              {result.offers.map((offer) => (
                <ResultCard key={offer.id} offer={offer} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              Nema ponuda koje odgovaraju pretrazi. Pokušajte širi opseg cene, uklonite neki
              filter, ili pomerite termin za par dana.
            </p>
          )}
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            basePath={PATHNAME}
            queryWithoutPage={queryWithoutPage.toString()}
          />
        </div>
      </div>
    </main>
  );
}
