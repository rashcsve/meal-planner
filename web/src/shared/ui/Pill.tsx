import type { ReactNode } from "react";

interface PillProps {
  children: ReactNode;
}

export function Pill({ children }: PillProps) {
  return (
    <span className="inline-flex items-center rounded border border-line px-1 py-0 text-9 font-semibold uppercase tracking-wider text-muted font-stretch-88%">
      {children}
    </span>
  );
}
