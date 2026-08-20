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
        "rounded border border-line bg-card px-2 py-1 text-11 text-ink",
        "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
        "disabled:cursor-default disabled:opacity-35",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
