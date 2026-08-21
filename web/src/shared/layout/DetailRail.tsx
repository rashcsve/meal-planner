import { useEffect, useRef, type PropsWithChildren } from "react";
import { CloseButton } from "../ui/CloseButton";
import { isClickOutside } from "../lib/clickOutside";

const IGNORE_SELECTOR = "[data-detail-rail-ignore]";

interface DetailRailProps {
  label: string;
  onClose: () => void;
}

export function DetailRail({
  label,
  onClose,
  children,
}: PropsWithChildren<DetailRailProps>) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (isClickOutside(e.target, railRef.current, IGNORE_SELECTOR)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [onClose]);

  return (
    <div
      ref={railRef}
      className="w-73 shrink-0 overflow-auto border-l border-line bg-rail"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-rail px-3 py-2">
        <span className="type-label text-9 text-faint">{label}</span>
        <CloseButton className="ml-auto" onClick={onClose} />
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
