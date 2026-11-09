interface FlagTagProps {
  count: number;
}

export function FlagTag({ count }: FlagTagProps) {
  return (
    <span className="inline-flex items-center rounded-tag bg-check-tint px-1.25 py-px text-12 font-semibold text-check">
      {count} to check
    </span>
  );
}
