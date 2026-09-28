import Link from "next/link";
import { SortChips } from "@/components/ui/SortChips";
import styles from "./ActiveFilterStrip.module.css";

export interface FilterChip {
  key: string;
  label: string;
  removeHref: string;
}

export interface ActiveFilterStripProps {
  chips: FilterChip[];
}

const SORT_OPTIONS = [
  { value: "cena", label: "Najniža cena" },
  { value: "usteda", label: "Najveća ušteda" },
  { value: "ocena", label: "Ocena gostiju" },
];

// Isti obrazac kao HighlightList: samo "Najniža cena" je stvarno sortiranje
// (podrazumevano u searchOffers); ušteda/ocena nemaju podatke iza sebe
// (grupisanje po jedinici, recenzije) — vidno prisutni, funkcionalno inertni.
export function ActiveFilterStrip({ chips }: ActiveFilterStripProps) {
  return (
    <div className={styles.strip}>
      <div className={styles.chips}>
        {chips.length > 0 && <span className={styles.label}>Izabrano</span>}
        {chips.map((c) => (
          <Link key={c.key} href={c.removeHref} className={styles.chip}>
            {c.label} ✕
          </Link>
        ))}
      </div>
      <div className={styles.sort}>
        <span className={styles.sortLabel}>Sortiraj:</span>
        <SortChips options={SORT_OPTIONS} active="cena" />
      </div>
    </div>
  );
}
