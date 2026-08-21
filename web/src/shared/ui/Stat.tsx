interface StatProps {
  label: string;
  value: number | null | undefined;
  unit?: string;
}

export function Stat({ label, value, unit }: StatProps) {
  if (value == null) return null;
  return (
    <div>
      <span className="type-label block text-9 text-faint">{label}</span>
      <span className="type-num text-13">
        {value}
        {unit && <span className="ml-0.5 text-10 text-faint">{unit}</span>}
      </span>
    </div>
  );
}
