import type { ReactNode } from "react";

type ReasonTagVariant = "save" | "pantry" | "fast";

interface ReasonTagProps {
  variant: ReasonTagVariant;
  children: ReactNode;
}

const variantClasses: Record<ReasonTagVariant, string> = {
  save: "bg-promo-tint text-promo",
  pantry: "bg-ok-tint text-ok",
  fast: "bg-lock-tint text-lock",
};

export function ReasonTag({ variant, children }: ReasonTagProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1 py-px text-9 font-bold uppercase tracking-wider font-stretch-88% ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
