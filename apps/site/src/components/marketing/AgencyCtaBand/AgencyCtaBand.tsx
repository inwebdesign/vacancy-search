import { Button } from "@/components/ui/Button";
import styles from "./AgencyCtaBand.module.css";

// Dugme je za sad bez odredišta — panel za agencije/prijava nije dizajniran
// (skill, odeljak 10), pa nema gde stvarno da vodi.
export function AgencyCtaBand() {
  return (
    <div className={styles.band}>
      <div className={styles.inner}>
        <div>
          <p className={styles.title}>Imate agenciju?</p>
          <p className={styles.subtitle}>
            Postavite svoje ponude i pojavite se u poređenju. Bez mesečne pretplate.
          </p>
        </div>
        <Button variant="primary" size="md" className={styles.ctaButton}>
          Prijavi agenciju
        </Button>
      </div>
    </div>
  );
}
