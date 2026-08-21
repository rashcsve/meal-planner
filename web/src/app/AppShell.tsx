import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useNavShortcuts } from "./useNavShortcuts";

export function AppShell() {
  useNavShortcuts();

  return (
    <div className="grid h-screen grid-cols-[194px_1fr]">
      <Sidebar />
      <div className="grid grid-rows-[42px_1fr] overflow-hidden">
        <div className="border-b border-line" />
        <main className="overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
