import type { InputHTMLAttributes } from "react";

type InputType = "text" | "number" | "search";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  type?: InputType;
}

export function Input({ type = "text", className, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={[
        "rounded border border-line bg-card px-2 py-1 text-11 text-ink",
        "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
        "disabled:cursor-default disabled:opacity-35",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
