import Link from "next/link";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { formatPrice, formatNights } from "@/lib/format";
import type { PublicOffer } from "@/lib/offers/search";
import styles from "./OfferRow.module.css";

export interface OfferRowProps {
  offer: PublicOffer;
}

// Mockup pokazuje "N agencija nudi"/"ušteda do X €" značke — te pretpostavljaju
// da više agencija nudi ISTU jedinicu, grupisano. To grupisanje namerno nije
// izgrađeno (docs/PLAN-JAVNI-SAJT.md, Korak 3: svaka ponuda je za sad
// sopstvena jedinica), pa te značke ovde nema — ne prikazujemo poređenje koje
// ne postoji. Isto tako, "distanca do plaže"/sadržaj (klima, parking...) ne
// postoje u šemi — meta linija zato ima samo ono što je stvarno: broj noćenja.
export function OfferRow({ offer }: OfferRowProps) {
  return (
    <article className={styles.row}>
      <PhotoPlaceholder crop="300×250" className={styles.photo} />
      <div className={styles.detail}>
        <p className={styles.eyebrow}>{offer.destinacija}</p>
        <h3 className={styles.title}>{offer.naziv}</h3>
        <p className={styles.meta}>{formatNights(offer.datumPolaska, offer.datumPovratka)}</p>
      </div>
      <div className={styles.priceCell}>
        <p className={styles.priceLabel}>od</p>
        <p className={styles.price}>
          {formatPrice(offer.cenaPoOsobi)}
          <span className={styles.priceSuffix}> / osobi</span>
        </p>
        <Link
          href={`/pretraga?naziv=${encodeURIComponent(offer.naziv)}`}
          className={styles.cta}
        >
          Pogledaj ponudu →
        </Link>
      </div>
    </article>
  );
}
