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
//
// Filter kreće nepopunjen (bez podrazumevanog broja), isto kao destinacija
// i datumi — dok korisnik ne klikne "+", nema aktivnog filtera po broju
// gostiju. Skriveni input se renderuje samo kad vrednost postoji, pa se
// brojGostiju ne šalje u query kad je nepopunjen.
export function GuestsField({ defaultValue }: GuestsFieldProps) {
  const [value, setValue] = useState<number | null>(defaultValue ?? null);

  return (
    <details className={styles.field}>
      <summary className={styles.summary}>
        <span className={styles.label}>Osobe</span>
        <span className={value === null ? styles.placeholder : styles.value}>
          {value === null ? "Unesite broj gostiju" : pluralize(value, GUEST_FORMS)}
        </span>
      </summary>
      <div className={styles.popover}>
        <span className={styles.popoverLabel}>Broj gostiju</span>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setValue((v) => (v === null || v <= MIN ? null : v - 1))}
            disabled={value === null}
            aria-label="Smanji broj gostiju"
          >
            −
          </button>
          <span className={styles.stepperValue}>{value ?? "—"}</span>
          <button
            type="button"
            className={styles.stepperButton}
            onClick={() => setValue((v) => Math.min(MAX, (v ?? MIN - 1) + 1))}
            disabled={value !== null && value >= MAX}
            aria-label="Povećaj broj gostiju"
          >
            +
          </button>
        </div>
      </div>
      {value !== null && <input type="hidden" name="brojGostiju" value={value} />}
    </details>
  );
}
