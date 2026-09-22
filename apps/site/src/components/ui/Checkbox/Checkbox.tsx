import clsx from "clsx";
import styles from "./Checkbox.module.css";

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "type" | "size"> {
  label: React.ReactNode;
  /** Npr. broj rezultata u filter grupi, poravnat desno. */
  trailing?: React.ReactNode;
  /** sm = 16px (desktop filter rail), lg = 20px (mobilna fioka filtera). */
  size?: "sm" | "lg";
}

// Pravi <input type="checkbox">, vizuelno zamenjen — nikad <div onClick>
// (skill, odeljak 8). Fokus je vidljiv preko :focus-visible na kutijici.
export function Checkbox({
  label,
  trailing,
  size = "sm",
  className,
  ...rest
}: CheckboxProps) {
  return (
    <label className={clsx(styles.row, className)}>
      <input type="checkbox" className={styles.input} {...rest} />
      <span className={clsx(styles.box, styles[size])} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      {trailing !== undefined && <span className={styles.trailing}>{trailing}</span>}
    </label>
  );
}
