import Link from "next/link";
import { PriceRangeFilter } from "@/components/filters/PriceRangeFilter";
import { AgencyFilter } from "@/components/filters/AgencyFilter";
import { formatPrice, formatFilterCount } from "@/lib/format";
import type { AgencyFacet } from "@/lib/offers/search";
import styles from "./FilterRail.module.css";

export interface FilterRailProps {
  cenaOd?: number;
  cenaDo?: number;
  agencyFacets: AgencyFacet[];
  selectedAgencije: string[];
  resetHref: string;
  activeFilterCount: number;
  baseTotal: number;
  filteredTotal: number;
  minPrice: number | null;
}

// Skill (Filter): "TIP JEDINICE, UDALJENOST OD PLAŽE, USLUGA, SADRŽAJ, PREVOZ"
// grupe nisu ovde — nema strukturiranih podataka za njih u bazi (vidi tech
// debt u apps/admin/README.md). Grade se samo grupe sa pravim kolonama:
// cena po osobi i agencija.
export function FilterRail({
  cenaOd,
  cenaDo,
  agencyFacets,
  selectedAgencije,
  resetHref,
  activeFilterCount,
  baseTotal,
  filteredTotal,
  minPrice,
}: FilterRailProps) {
  return (
    <aside>
      <div className={styles.header}>
        <p className={styles.title}>Filter</p>
        {activeFilterCount > 0 && (
          <Link href={resetHref} className={styles.reset}>
            Poništi sve
          </Link>
        )}
      </div>
      <div className={styles.groups}>
        <PriceRangeFilter
          label="Cena po osobi (€)"
          paramOd="cenaOd"
          paramDo="cenaDo"
          defaultOd={cenaOd}
          defaultDo={cenaDo}
        />
        <AgencyFilter facets={agencyFacets} selected={selectedAgencije} />
      </div>
      {activeFilterCount > 0 && (
        <div className={styles.summary}>
          <p className={styles.summaryTitle}>Aktivno: {formatFilterCount(activeFilterCount)}</p>
          <p className={styles.summaryText}>
            Prikazano {filteredTotal} od {baseTotal} jedinica.
            {minPrice !== null && ` Najniža cena u izboru je ${formatPrice(minPrice)}.`}
          </p>
        </div>
      )}
    </aside>
  );
}
