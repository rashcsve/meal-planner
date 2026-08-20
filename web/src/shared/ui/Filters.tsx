import { cx } from "../lib/cx";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface SingleFiltersProps<T extends string> {
  multiple?: false;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
}

interface MultiFiltersProps<T extends string> {
  multiple: true;
  options: FilterOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  "aria-label"?: string;
}

type FiltersProps<T extends string> = SingleFiltersProps<T> | MultiFiltersProps<T>;

export function Filters<T extends string>(props: FiltersProps<T>) {
  const { options } = props;

  function isActive(value: T): boolean {
    return props.multiple ? props.value.includes(value) : props.value === value;
  }

  function toggle(value: T) {
    if (!props.multiple) {
      props.onChange(value);
      return;
    }
    const next = props.value.includes(value) ? props.value.filter((v) => v !== value) : [...props.value, value];
    props.onChange(next);
  }

  return (
    <div role="group" aria-label={props["aria-label"]} className="flex gap-0.75">
      {options.map((option) => {
        const active = isActive(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option.value)}
            className={cx(
              "cursor-pointer rounded border px-1.75 py-0.75 text-10 font-semibold font-stretch-88%",
              "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
              active ? "border-ink bg-ink text-paper" : "border-line bg-transparent text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
