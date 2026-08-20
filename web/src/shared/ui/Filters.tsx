interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FiltersProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Filters<T extends string>({ options, value, onChange }: FiltersProps<T>) {
  return (
    <div className="flex gap-0.75">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={[
              "cursor-pointer rounded border px-1.75 py-0.75 text-10 font-semibold font-stretch-88%",
              "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
              active ? "border-ink bg-ink text-paper" : "border-line bg-transparent text-muted",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
