import { DestinationInput } from "@/components/search/DestinationInput";
import { DateRangeField } from "@/components/search/DateRangeField";
import { GuestsField } from "@/components/search/GuestsField";
import styles from "./SearchBar.module.css";

export interface SearchBarProps {
  destinations: string[];
  /** Trenutne vrednosti pretrage — koristi /pretraga da traka prikaže tekuću
   * pretragu ("Izmeni" iz mock-a: kod nas je traka uvek editabilna, pa
   * posebno dugme nije potrebno — ovo popunjavanje ga zamenjuje). */
  defaultDestinacija?: string;
  defaultDatumOd?: string;
  defaultDatumDo?: string;
  defaultBrojGostiju?: number;
}

// Obična GET forma — nema router.push/JS na submit-u. Browser sam sastavi
// query string iz name atributa polja i navigira na /pretraga (skill:
// "Stanje u URL-u", pretraga je deljiv/back-forward-friendly link, ne
// klijentska navigacija).
export function SearchBar({
  destinations,
  defaultDestinacija,
  defaultDatumOd,
  defaultDatumDo,
  defaultBrojGostiju,
}: SearchBarProps) {
  return (
    <form method="get" action="/pretraga" className={styles.bar}>
      <div className={styles.cell}>
        <DestinationInput destinations={destinations} defaultValue={defaultDestinacija} />
      </div>
      <div className={styles.cell}>
        <DateRangeField defaultFrom={defaultDatumOd} defaultTo={defaultDatumDo} />
      </div>
      <div className={styles.cell}>
        <GuestsField defaultValue={defaultBrojGostiju} />
      </div>
      <button type="submit" className={styles.submit}>
        Pretraži
      </button>
    </form>
  );
}
