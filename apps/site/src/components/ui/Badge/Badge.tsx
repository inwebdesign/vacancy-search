import clsx from "clsx";
import styles from "./Badge.module.css";

export interface BadgeProps extends React.ComponentPropsWithoutRef<"span"> {
  /**
   * Semantika je fiksna, ne dekorativna: green = ušteda/najniža cena,
   * orange = ograničena dostupnost, amber = broj agencija, blue = informacija.
   */
  tone: "green" | "amber" | "orange" | "blue";
}

export function Badge({ tone, className, ...rest }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[tone], className)} {...rest} />;
}
