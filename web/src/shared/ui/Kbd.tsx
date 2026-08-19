import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-[3px] border border-b-2 border-line px-1 py-px text-9 font-bold text-faint font-stretch-88%">
      {children}
    </kbd>
  );
}
