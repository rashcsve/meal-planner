import type { ReactNode } from "react";

type ReasonTagVariant = "save" | "pantry" | "fast";

interface ReasonTagProps {
  variant: ReasonTagVariant;
  children: ReactNode;
  title?: string;
}

const variantClasses: Record<ReasonTagVariant, string> = {
  save: "bg-ok-tint text-ok",
  pantry: "bg-ok-tint text-ok",
  fast: "bg-lock-tint text-lock",
};

export function ReasonTag({ variant, children, title }: ReasonTagProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-tag px-1 py-px text-12 font-semibold ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
