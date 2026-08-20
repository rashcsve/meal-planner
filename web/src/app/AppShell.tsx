import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="grid h-screen grid-cols-[194px_1fr]">
      <Sidebar />
      <div className="grid grid-rows-[42px_1fr] overflow-hidden">
        <div className="border-b border-line" />
        <main className="overflow-auto p-3.5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
