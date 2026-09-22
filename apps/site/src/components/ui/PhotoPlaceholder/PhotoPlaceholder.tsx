import clsx from "clsx";
import styles from "./PhotoPlaceholder.module.css";

export interface PhotoPlaceholderProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Traženi kadar, npr. "340×280" — ispisuje se kao oznaka "FOTO 340×280".
   *  Nijedna fotografija još nije isporučena (README: "No real photography
   *  was supplied"), pa je ova napomena stalna dok se ne doda prava slika. */
  crop?: string;
}

export function PhotoPlaceholder({ crop, className, ...rest }: PhotoPlaceholderProps) {
  return (
    <div className={clsx(styles.ph, className)} {...rest}>
      {crop && <span className={styles.caption}>FOTO {crop}</span>}
    </div>
  );
}
