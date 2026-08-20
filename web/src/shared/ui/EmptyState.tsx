import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  action: ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed border-line bg-card p-5.5 text-center text-11 text-faint">
      <p>{message}</p>
      {action}
    </div>
  );
}
