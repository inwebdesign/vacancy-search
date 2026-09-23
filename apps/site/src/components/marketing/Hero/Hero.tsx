import { SearchBar } from "@/components/search/SearchBar";
import { formatUnitCount, formatAgencyCount, joinMeta } from "@/lib/format";
import styles from "./Hero.module.css";

export interface HeroProps {
  unitCount: number;
  agencyCount: number;
  destinations: string[];
}

export function Hero({ unitCount, agencyCount, destinations }: HeroProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.inner}>
        <h1 className={styles.headline}>Nađite isti apartman po najnižoj ceni</h1>
        <p className={styles.subline}>
          {joinMeta([
            formatUnitCount(unitCount),
            formatAgencyCount(agencyCount),
            "cene se porede za isti termin i isti tip jedinice.",
          ])}
        </p>
        <SearchBar destinations={destinations} />
      </div>
    </div>
  );
}
