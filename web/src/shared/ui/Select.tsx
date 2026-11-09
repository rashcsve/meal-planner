import type { SelectHTMLAttributes } from "react";
import { cx } from "../lib/cx";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "type-body h-11 rounded-control border border-border bg-surface px-3 text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock",
        "disabled:cursor-default disabled:opacity-35",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
