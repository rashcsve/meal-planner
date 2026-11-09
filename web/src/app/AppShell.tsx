import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";
import { TopMenu } from "./TopMenu";
import { useNavShortcuts } from "./useNavShortcuts";

export function AppShell() {
  useNavShortcuts();

  return (
    <div className="grid h-screen grid-rows-[56px_1fr]">
      <TopMenu />
      <main className="overflow-hidden">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
