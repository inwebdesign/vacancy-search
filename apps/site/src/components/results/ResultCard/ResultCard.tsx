import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { Checkbox } from "@/components/ui/Checkbox";
import { formatPrice, formatNights } from "@/lib/format";
import type { PublicOffer } from "@/lib/offers/search";
import styles from "./ResultCard.module.css";

export interface ResultCardProps {
  offer: PublicOffer;
}

// Mock 2a je građen oko VIŠE agencija po jedinici (ekspandujuća tabela cena,
// "N agencija nudi", ocena gostiju) — bez grupisanja (odluka, Faza 4) je ovo
// kartica JEDNE ponude JEDNE agencije, pa nema "expand"/isticanje najjeftinije
// varijante (nema šta da se poredi unutar kartice). Agencija je zato prikazana
// direktno (jedini izvor), "Idi na sajt" ide kroz /go/[id] (klik tracking) pa
// dalje na kontakt_url. Opis/sadržaj/udaljenost/ocena iz mock-a pretpostavljaju
// podatke kojih nema u bazi (tech debt) — nisu izmišljeni.
export function ResultCard({ offer }: ResultCardProps) {
  return (
    <article className={styles.card}>
      <PhotoPlaceholder crop="340×280" className={styles.photo} />
      <div className={styles.detail}>
        <p className={styles.eyebrow}>{offer.destinacija}</p>
        <h2 className={styles.title}>{offer.naziv}</h2>
        <p className={styles.meta}>
          {formatNights(offer.datumPolaska, offer.datumPovratka)}
          {offer.agencija && ` · ${offer.agencija}`}
        </p>
      </div>
      <div className={styles.priceCell}>
        <p className={styles.price}>
          {formatPrice(offer.cenaPoOsobi)}
          <span className={styles.priceSuffix}> / osobi</span>
        </p>
        <a
          href={`/go/${offer.id}`}
          target="_blank"
          rel="nofollow sponsored noopener"
          className={styles.cta}
        >
          Idi na sajt
        </a>
        <Checkbox label="Dodaj u poređenju" size="sm" className={styles.compare} />
      </div>
    </article>
  );
}
