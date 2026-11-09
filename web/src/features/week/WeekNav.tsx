import { Button } from "../../shared/ui/Button";

interface WeekNavProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export function WeekNav({ label, onPrev, onNext }: WeekNavProps) {
  return (
    <header className="flex items-center gap-3 px-8 pt-8 pb-4">
      <Button variant="secondary" className="w-11 px-0" aria-label="Previous week" onClick={onPrev}>
        <span aria-hidden="true">←</span>
      </Button>
      <Button variant="secondary" className="w-11 px-0" aria-label="Next week" onClick={onNext}>
        <span aria-hidden="true">→</span>
      </Button>
      <div className="ml-1">
        <p className="type-label">Seven dinners</p>
        <h1 className="type-page-title text-ink">{label}</h1>
      </div>
    </header>
  );
}
