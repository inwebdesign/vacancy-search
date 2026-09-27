import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { formatPrice, formatUnitCount } from "@/lib/format";
import type { DestinationStat } from "@/lib/offers/home";
import styles from "./DestinationGrid.module.css";

export interface DestinationGridProps {
  stats: DestinationStat[];
}

// Mock 1a nema naslov iznad grida ("22px above" je razmak, ne sekcija), ali
// mock 2b (mobilni) dodaje "Destinacije" naslov — vidljiv samo na mobilnom
// preko CSS-a, isto tako mobilna kartica prikazuje samo "od N €" bez broja
// jedinica (taj deo je desktop-only preko CSS-a, ne uslovno renderovan).
export function DestinationGrid({ stats }: DestinationGridProps) {
  return (
    <div>
      <h2 className={styles.mobileTitle}>Destinacije</h2>
      <ul className={styles.grid}>
        {stats.map((s) => (
          <li key={s.destinacija} className={styles.tile}>
            <PhotoPlaceholder className={styles.photo} />
            <div className={styles.body}>
              <p className={styles.name}>{s.destinacija}</p>
              <p className={styles.meta}>
                <span className={styles.metaCount}>{formatUnitCount(s.count)} · </span>
                od {formatPrice(s.minCenaPoOsobi)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
