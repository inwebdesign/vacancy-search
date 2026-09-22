"use client";

import { useState } from "react";
import { pluralize, type PluralForms } from "@/lib/format";
import styles from "./GuestsField.module.css";

export interface GuestsFieldProps {
  defaultValue?: number;
}

const GUEST_FORMS: PluralForms = { one: "gost", few: "gosta", many: "gostiju" };
const MIN = 1;
const MAX = 30; // mora da prati MAX_GOSTIJU iz lib/offers/params.ts

// Mockup pokazuje "2 odrasle · 1 dete" (odrasli/deca posebno, sa uzrastima
// dece) — naš filter (offers.max_gostiju) ne pravi tu razliku, samo ukupan
// broj gostiju. Prikazivanje lažne podele bez ičega iza nje bi zbunilo, pa
// je ovo pojednostavljeno na jedan broj. Popover je native <details> (bez
// pozicione biblioteke); samo +/- dugmad su klijentska, ne ceo obrazac.
export function GuestsField({ defaultValue = 2 }: GuestsFieldProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <details className={styles.field}>
      <summary className={styles.summary}>
        <span className={styles.label}>Osobe</span>
        <span className={styles.value}>{pluralize(value, GUEST_FORMS)}</span>
      </summary>
      <div className={styles.popover}>
        <span className={styles.popoverLabel}>Broj gostiju</span>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setValue((v) => Math.max(MIN, v - 1))}
            disabled={value <= MIN}
            aria-label="Smanji broj gostiju"
          >
            −
          </button>
          <span className={styles.stepperValue}>{value}</span>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setValue((v) => Math.min(MAX, v + 1))}
            disabled={value >= MAX}
            aria-label="Povećaj broj gostiju"
          >
            +
          </button>
        </div>
      </div>
      <input type="hidden" name="brojGostiju" value={value} />
    </details>
  );
}
