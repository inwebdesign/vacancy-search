import { SortChips } from "@/components/ui/SortChips";
import { OfferRow } from "@/components/marketing/OfferRow";
import type { PublicOffer } from "@/lib/offers/search";
import styles from "./HighlightList.module.css";

export interface HighlightListProps {
  title: string;
  offers: PublicOffer[];
}

const SORT_OPTIONS = [
  { value: "cena", label: "Najniža cena" },
  { value: "usteda", label: "Najveća ušteda" },
  { value: "ocena", label: "Ocena gostiju" },
];

// "Najveća ušteda" i "Ocena gostiju" su vizuelno prisutni (vernost mock-u),
// ali nefunkcionalni: ušteda zahteva grupisanje više agencija po jedinici
// (nije izgrađeno), ocena gostiju zahteva sistem recenzija koji ne postoji
// u šemi uopšte. Samo "Najniža cena" odražava stvarno sortiranje podataka.
export function HighlightList({ title, offers }: HighlightListProps) {
  return (
    <section>
      <div className={styles.heading}>
        <h2 className={styles.title}>{title}</h2>
        <SortChips options={SORT_OPTIONS} active="cena" />
      </div>
      <ul className={styles.list}>
        {offers.map((offer) => (
          <li key={offer.id} className={styles.item}>
            <OfferRow offer={offer} />
          </li>
        ))}
      </ul>
    </section>
  );
}
