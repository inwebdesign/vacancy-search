import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { formatPrice, formatUnitCount } from "@/lib/format";
import type { DestinationStat } from "@/lib/offers/home";
import styles from "./DestinationGrid.module.css";

export interface DestinationGridProps {
  stats: DestinationStat[];
}

export function DestinationGrid({ stats }: DestinationGridProps) {
  return (
    <ul className={styles.grid}>
      {stats.map((s) => (
        <li key={s.destinacija} className={styles.tile}>
          <PhotoPlaceholder className={styles.photo} />
          <div className={styles.body}>
            <p className={styles.name}>{s.destinacija}</p>
            <p className={styles.meta}>
              {formatUnitCount(s.count)} · od {formatPrice(s.minCenaPoOsobi)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
