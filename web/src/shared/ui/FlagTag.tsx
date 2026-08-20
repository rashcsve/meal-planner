interface FlagTagProps {
  count: number;
}

export function FlagTag({ count }: FlagTagProps) {
  return (
    <span className="inline-flex items-center rounded bg-check-tint px-1.25 py-px text-9 font-bold uppercase tracking-flag text-check font-stretch-88%">
      {count} to check
    </span>
  );
}
