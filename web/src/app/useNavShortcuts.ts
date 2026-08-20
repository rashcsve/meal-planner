import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "./Sidebar";

const SHORTCUTS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.key, item.to]),
);

export function useNavShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && /input|textarea/i.test(e.target.tagName)) return;
      const path = SHORTCUTS[e.key];
      if (path) navigate(path);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);
}
