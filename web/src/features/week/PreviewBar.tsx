import { Button } from "../../shared/ui/Button";
import { ErrorState } from "../../shared/ui/ErrorState";

export type PreviewStatus = "ready" | "busy" | "stale" | "error";

interface PreviewBarProps {
  status: PreviewStatus;
  message?: string;
  onAccept: () => void;
  onDiscard: () => void;
  onRegenerate: () => void;
}

export function PreviewBar({
  status,
  message,
  onAccept,
  onDiscard,
  onRegenerate,
}: PreviewBarProps) {
  const busy = status === "busy";

  if (status === "stale") {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded border border-l-2 border-check bg-check-tint/35 px-2.75 py-2.25 text-11 text-ink"
      >
        <p className="flex-1">{message}</p>
        <Button onClick={onRegenerate}>Preview again</Button>
        <Button variant="secondary" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded border border-line bg-card px-2.75 py-2.25 text-11 text-ink">
        <p className="flex-1">This is a preview. Nothing is saved until you accept.</p>
        <Button onClick={onAccept} disabled={busy}>
          Accept
        </Button>
        <Button variant="secondary" onClick={onRegenerate} disabled={busy}>
          Try again
        </Button>
        <Button variant="secondary" onClick={onDiscard} disabled={busy}>
          Discard
        </Button>
      </div>
      {status === "error" && message && (
        <ErrorState title="Couldn't save the plan" message={message} />
      )}
    </div>
  );
}
