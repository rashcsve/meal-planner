import type { ButtonHTMLAttributes } from "react";
import { cx } from "../lib/cx";

type ButtonVariant = "primary" | "secondary" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-surface hover:bg-ink/90",
  secondary: "border-border bg-surface text-ink hover:border-ink",
  destructive: "border-danger-tint bg-surface text-danger hover:border-danger",
};

export function Button({
  type = "button",
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "type-body inline-flex h-11 cursor-pointer items-center justify-center gap-1 rounded-control border px-4 font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock",
        "disabled:cursor-default disabled:opacity-35",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
