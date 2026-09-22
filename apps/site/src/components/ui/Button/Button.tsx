import clsx from "clsx";
import styles from "./Button.module.css";

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "dark" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({
  variant = "dark",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      {...rest}
    />
  );
}
