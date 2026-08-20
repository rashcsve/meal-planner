import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-paper hover:bg-ink/90",
  ghost: "border-line bg-transparent text-ink hover:border-ink",
  danger: "border-promo bg-promo text-paper hover:bg-promo/90",
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
      className={[
        "inline-flex cursor-pointer items-center justify-center gap-1 rounded border px-2.5 py-1.25 text-11 font-bold font-stretch-88%",
        "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
        "disabled:cursor-default disabled:opacity-35",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
