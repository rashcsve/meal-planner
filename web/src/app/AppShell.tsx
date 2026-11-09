import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";
import { ShortcutSheet } from "./ShortcutSheet";
import { TopMenu } from "./TopMenu";
import { useNavShortcuts } from "./useNavShortcuts";

export function AppShell() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const toggleSheet = useCallback(() => setSheetOpen((open) => !open), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  useNavShortcuts(toggleSheet);

  return (
    <div className="grid h-screen grid-rows-[56px_1fr]">
      <TopMenu />
      <main className="overflow-hidden">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <ShortcutSheet open={sheetOpen} onClose={closeSheet} />
    </div>
  );
}
