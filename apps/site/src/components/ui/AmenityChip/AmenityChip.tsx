import clsx from "clsx";
import styles from "./AmenityChip.module.css";

// Nema sopstvenih props-a van standardnih <span> atributa — type, ne prazan
// interface (prazan interface extends puca eslint no-empty-object-type).
export type AmenityChipProps = React.ComponentPropsWithoutRef<"span">;

export function AmenityChip({ className, ...rest }: AmenityChipProps) {
  return <span className={clsx(styles.chip, className)} {...rest} />;
}
