import { Button } from "../../shared/ui/Button";

interface WeekNavProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export function WeekNav({ label, onPrev, onNext }: WeekNavProps) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-3.5 py-2">
      <Button variant="ghost" onClick={onPrev}>
        ← Prev week
      </Button>
      <span className="type-name text-13">{label}</span>
      <Button variant="ghost" onClick={onNext}>
        Next week →
      </Button>
    </div>
  );
}
