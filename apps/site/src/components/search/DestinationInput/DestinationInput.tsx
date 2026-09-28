"use client";

import { useRef, useState } from "react";
import styles from "./DestinationInput.module.css";

export interface DestinationInputProps {
  destinations: string[];
  defaultValue?: string;
}

// Predlozi preko native <datalist> — bez custom dropdown/JS-a. README traži
// "autocomplete over destinations and named accommodations"; ovde su za sad
// samo destinacije (nazivi apartmana bi dodali na stotine <option> elemenata
// bez prave koristi dok ih ima šačica — tech debt kad inventar poraste).
//
// X dugme (primedba 2026-09-29) briše unos bez ručnog markiranja teksta —
// input ostaje nekontrolisan (defaultValue, ne value+onChange na svakom
// tasteru), samo se čita/piše preko ref-a; "use client" je zato minimalan.
export function DestinationInput({ destinations, defaultValue }: DestinationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasValue, setHasValue] = useState(!!defaultValue);

  function clear() {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
    setHasValue(false);
  }

  return (
    <div className={styles.field}>
      <label htmlFor="destinacija" className={styles.label}>
        Destinacija
      </label>
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          id="destinacija"
          name="destinacija"
          type="text"
          list="destinacija-predlozi"
          defaultValue={defaultValue}
          placeholder="Gde putujete?"
          autoComplete="off"
          className={styles.input}
          onChange={(e) => setHasValue(e.target.value.length > 0)}
        />
        {hasValue && (
          <button
            type="button"
            onClick={clear}
            className={styles.clear}
            aria-label="Obriši destinaciju"
          >
            ✕
          </button>
        )}
      </div>
      <datalist id="destinacija-predlozi">
        {destinations.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
    </div>
  );
}
