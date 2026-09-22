import { useState } from "react";
import { Button } from "../../shared/ui/Button";

interface ArchiveRecipeControlProps {
  onArchive: () => void;
  onCancel: () => void;
  isArchiving: boolean;
  error?: string;
}

export function ArchiveRecipeControl({
  onArchive,
  onCancel,
  isArchiving,
  error,
}: ArchiveRecipeControlProps) {
  const [confirming, setConfirming] = useState(false);
  const errorId = error ? "archive-recipe-error" : undefined;

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
        Archive recipe
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-11 text-muted">
        Archive this recipe? It stops appearing in the recipe list and can no longer be planned, but
        stays available by direct link.
      </p>
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="danger"
          disabled={isArchiving}
          aria-describedby={errorId}
          onClick={onArchive}
        >
          Confirm archive
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isArchiving}
          onClick={() => {
            setConfirming(false);
            onCancel();
          }}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <p id={errorId} className="text-10 text-promo">
          {error}
        </p>
      )}
    </div>
  );
}
