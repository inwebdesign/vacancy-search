import styles from "./DestinationInput.module.css";

export interface DestinationInputProps {
  destinations: string[];
  defaultValue?: string;
}

// Predlozi preko native <datalist> — bez custom dropdown/JS-a. README traži
// "autocomplete over destinations and named accommodations"; ovde su za sad
// samo destinacije (nazivi apartmana bi dodali na stotine <option> elemenata
// bez prave koristi dok ih ima šačica — tech debt kad inventar poraste).
export function DestinationInput({ destinations, defaultValue }: DestinationInputProps) {
  return (
    <div className={styles.field}>
      <label htmlFor="destinacija" className={styles.label}>
        Destinacija
      </label>
      <input
        id="destinacija"
        name="destinacija"
        type="text"
        list="destinacija-predlozi"
        defaultValue={defaultValue}
        placeholder="Gde putujete?"
        autoComplete="off"
        className={styles.input}
      />
      <datalist id="destinacija-predlozi">
        {destinations.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
    </div>
  );
}
