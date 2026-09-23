import { DestinationInput } from "@/components/search/DestinationInput";
import { DateRangeField } from "@/components/search/DateRangeField";
import { GuestsField } from "@/components/search/GuestsField";
import styles from "./SearchBar.module.css";

export interface SearchBarProps {
  destinations: string[];
}

// Obična GET forma — nema router.push/JS na submit-u. Browser sam sastavi
// query string iz name atributa polja i navigira na /pretraga (skill:
// "Stanje u URL-u", pretraga je deljiv/back-forward-friendly link, ne
// klijentska navigacija). /pretraga stiže u Fazi 4 — do tada dugme vodi
// na rutu koja još ne postoji (očekivano, ne bag).
export function SearchBar({ destinations }: SearchBarProps) {
  return (
    <form method="get" action="/pretraga" className={styles.bar}>
      <div className={styles.cell}>
        <DestinationInput destinations={destinations} />
      </div>
      <div className={styles.cell}>
        <DateRangeField />
      </div>
      <div className={styles.cell}>
        <GuestsField />
      </div>
      <button type="submit" className={styles.submit}>
        Pretraži
      </button>
    </form>
  );
}
