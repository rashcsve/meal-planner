import { cloneElement, isValidElement, type ReactElement } from "react";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactElement;
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const field = isValidElement(children)
    ? cloneElement(children, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": errorId,
      } as Record<string, unknown>)
    : children;

  return (
    <>
      <label className="text-11 text-muted" htmlFor={id}>
        {label}
      </label>
      {field}
      {error && (
        <p id={errorId} className="col-span-2 text-10 text-promo">
          {error}
        </p>
      )}
    </>
  );
}
