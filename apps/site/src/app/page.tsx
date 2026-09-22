import { Hero } from "@/components/marketing/Hero";
import { HighlightList } from "@/components/marketing/HighlightList";
import { DestinationGrid } from "@/components/marketing/DestinationGrid";
import { AgencyCtaBand } from "@/components/marketing/AgencyCtaBand";
import { getTopOffers, getDestinationStats, getDestinationNames } from "@/lib/offers/home";
import { getHeaderStats } from "@/lib/offers/stats";
import { searchOffers } from "@/lib/offers/search";
import styles from "./page.module.css";

// Filter rail sa leve strane (mock 1a) namerno NIJE izgrađen ovde — deli
// komponente (FilterGroup/RangeField...) sa /pretraga (Faza 4), a filtriranje
// SAMO na početnoj nema jasnu definisanu svrhu (šta bi tačno filtriralo?).
// Prostor je rezervisan da širina sadržaja ne skoči kad rail stigne.
export default async function Home() {
  const [{ total: unitCount }, { agencyCount }, topOffers, destinationStats, destinationNames] =
    await Promise.all([
      searchOffers({ page: 1 }),
      getHeaderStats(),
      getTopOffers(3),
      getDestinationStats(4),
      getDestinationNames(),
    ]);

  return (
    <main>
      <Hero unitCount={unitCount} agencyCount={agencyCount} destinations={destinationNames} />

      <div className={styles.body}>
        <aside className={styles.rail}>
          <p className={styles.railNote}>Filteri dolaze uz rezultate pretrage.</p>
        </aside>
        <div className={styles.content}>
          {topOffers.length > 0 && (
            <HighlightList title="Najtraženije ovog meseca" offers={topOffers} />
          )}
          {destinationStats.length > 0 && <DestinationGrid stats={destinationStats} />}
        </div>
      </div>

      <AgencyCtaBand />
    </main>
  );
}
