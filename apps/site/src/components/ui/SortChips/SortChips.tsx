import clsx from "clsx";
import styles from "./SortChips.module.css";

export interface SortOption {
  value: string;
  label: string;
}

export interface SortChipsProps {
  options: SortOption[];
  active: string;
  className?: string;
}

// Samo prikaz izabranog stanja za sad (README: "filters, sorting... are
// drawn in their selected state only" dok ponašanje ne bude ožičeno).
// Postaje klikabilno kad /pretraga (Faza 4) stvarno sortira po ovome.
export function SortChips({ options, active, className }: SortChipsProps) {
  return (
    <div className={clsx(styles.row, className)}>
      {options.map((o) => (
        <span
          key={o.value}
          className={clsx(styles.chip, o.value === active && styles.active)}
        >
          {o.label}
        </span>
      ))}
    </div>
  );
}
