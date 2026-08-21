import type { InputHTMLAttributes } from "react";
import { Input } from "./Input";
import { cx } from "../lib/cx";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function SearchInput({ className, ...props }: SearchInputProps) {
  return (
    <div className="relative inline-flex items-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute left-2 h-3 w-3 text-faint"
      >
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <Input
        type="search"
        aria-label="Search"
        className={cx("ps-6!", className)}
        {...props}
      />
    </div>
  );
}
