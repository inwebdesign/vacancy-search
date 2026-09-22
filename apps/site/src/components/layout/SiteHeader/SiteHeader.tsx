import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { formatTime, genitivePhrase } from "@/lib/format";
import styles from "./SiteHeader.module.css";

export interface SiteHeaderProps {
  agencyCount: number;
  updatedAt: Date;
  /** Koja stavka navigacije ima donju liniju (npr. "apartmani" na /pretraga). */
  activeNav?: "apartmani";
  /** Broj sačuvanih pretraga/ponuda — funkcija još nije izgrađena, 0 je iskreno stanje. */
  savedCount?: number;
}

// Nav stavke bez sopstvene stranice (Hoteli, Aranžmani sa prevozom, Last
// minute, Destinacije) su namerno običan tekst, ne <Link> — te rute ne
// postoje (skill, odeljak 10: nisu dizajnirane), pa ne pravimo mrtve linkove.
export function SiteHeader({ agencyCount, updatedAt, activeNav, savedCount = 0 }: SiteHeaderProps) {
  return (
    <header>
      <div className={styles.utilityStrip}>
        <div className={styles.utilityInner}>
          <span>
            Poređenje ponuda {genitivePhrase(agencyCount, "turističke agencije", "turističkih agencija")}{" "}
            · ažurirano danas u {formatTime(updatedAt)}
          </span>
          <div className={styles.utilityLinks}>
            <span>Za agencije</span>
            <span>Prijava</span>
          </div>
        </div>
      </div>

      <div className={styles.mainBar}>
        <div className={styles.mainInner}>
          <Link href="/" className={styles.wordmark}>
            slobodno<span className={styles.wordmarkRs}>.rs</span>
          </Link>

          <nav className={styles.nav} aria-label="Glavna navigacija">
            <Link
              href="/pretraga"
              className={clsx(styles.navItem, activeNav === "apartmani" && styles.navItemActive)}
            >
              Apartmani
            </Link>
            <span className={styles.navItem}>Hoteli</span>
            <span className={styles.navItem}>Aranžmani sa prevozom</span>
            <span className={styles.navItem}>Last minute</span>
            <span className={styles.navItem}>Destinacije</span>
          </nav>

          <div className={styles.actions}>
            <span className={styles.saved}>Sačuvano ({savedCount})</span>
            <Button variant="dark" size="sm">
              Uporedi izabrano
            </Button>
          </div>

          {/* Dekorativno za sad — meni koji bi ovo otvaralo nije dizajniran
              (skill, odeljak 10). */}
          <div className={styles.mobileBar} aria-hidden="true">
            <span className={styles.mobileBarLine} />
            <span className={styles.mobileBarLine} />
            <span className={styles.mobileBarLine} />
          </div>
        </div>
      </div>
    </header>
  );
}
