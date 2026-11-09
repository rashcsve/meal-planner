import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="type-label inline-flex min-w-6 items-center justify-center rounded-tag border border-border bg-surface px-1.5 py-0.5 font-sans">
      {children}
    </kbd>
  );
}
