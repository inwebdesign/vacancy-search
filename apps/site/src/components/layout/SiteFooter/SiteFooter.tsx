import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.note}>
          slobodno.rs poredi javno objavljene cene agencija · rezervacija se obavlja
          direktno kod agencije
        </p>
        <div className={styles.links}>
          <span>Za agencije</span>
          <span>Uslovi</span>
          <span>Kontakt</span>
        </div>
      </div>
    </footer>
  );
}
