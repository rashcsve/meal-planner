import type { InputHTMLAttributes } from "react";
import { cx } from "../lib/cx";

type InputType = "text" | "number" | "search" | "date";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  type?: InputType;
}

export function Input({ type = "text", className, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cx(
        "type-body h-11 rounded-control border border-border bg-surface px-3 text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock",
        "disabled:cursor-default disabled:opacity-35",
        className,
      )}
      {...props}
    />
  );
}
