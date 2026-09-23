import { todayInBelgrade } from "@/lib/offers/params";
import styles from "./DateRangeField.module.css";

export interface DateRangeFieldProps {
  defaultFrom?: string;
  defaultTo?: string;
}

// Native <input type="date"> — kalendar koji pretraživač već ima, ne
// custom date-picker widget (taj bi bio poseban, veći komad posla).
export function DateRangeField({ defaultFrom, defaultTo }: DateRangeFieldProps) {
  const today = todayInBelgrade();

  return (
    <div className={styles.field}>
      <label htmlFor="datumOd" className={styles.label}>
        Termin
      </label>
      <div className={styles.inputs}>
        <input
          id="datumOd"
          name="datumOd"
          type="date"
          defaultValue={defaultFrom}
          min={today}
          aria-label="Datum polaska"
          className={styles.input}
        />
        <span className={styles.dash} aria-hidden="true">
          —
        </span>
        <input
          id="datumDo"
          name="datumDo"
          type="date"
          defaultValue={defaultTo}
          min={today}
          aria-label="Datum povratka"
          className={styles.input}
        />
      </div>
    </div>
  );
}
