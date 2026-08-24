import type { ButtonHTMLAttributes } from "react";
import { cx } from "../lib/cx";

export function CloseButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Close"
      className={cx(
        "grid h-5 w-5 cursor-pointer place-items-center rounded text-faint hover:text-ink",
        "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
        className,
      )}
      {...props}
    >
      ✕
    </button>
  );
}
