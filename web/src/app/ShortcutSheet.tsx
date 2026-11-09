import { useEffect, useRef } from "react";
import { Kbd } from "../shared/ui/Kbd";
import { NAV_ITEMS } from "./navItems";

interface ShortcutSheetProps {
  open: boolean;
  onClose: () => void;
}

const ROWS = [
  ...NAV_ITEMS.map((item) => ({ key: item.key, label: item.label })),
  { key: "?", label: "Show or hide shortcuts" },
];

export function ShortcutSheet({ open, onClose }: ShortcutSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="shortcut-sheet-title"
      onClose={onClose}
      className="m-auto w-80 rounded-card border border-divider bg-surface p-6 text-ink backdrop:bg-ink/30"
    >
      <h2 id="shortcut-sheet-title" className="type-section mb-4">
        Keyboard shortcuts
      </h2>
      <ul className="flex flex-col gap-3">
        {ROWS.map((row) => (
          <li key={row.key} className="type-body flex items-center gap-3">
            <Kbd>{row.key}</Kbd>
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
