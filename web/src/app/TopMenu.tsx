import { NavLink } from "react-router-dom";
import { HOUSEHOLD, MENU } from "./navItems";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock";

export function TopMenu() {
  return (
    <header className="flex h-14 items-stretch gap-6 border-b border-divider bg-surface px-8">
      <span className="type-body flex shrink-0 items-center text-ink">use it up.</span>
      <nav aria-label="Main" className="flex min-w-0 items-stretch gap-6 overflow-x-auto">
        {MENU.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "type-body flex shrink-0 items-center border-b-2",
                focusRing,
                isActive
                  ? "border-ok font-medium text-ink"
                  : "border-transparent text-muted hover:text-ink",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="ml-auto flex shrink-0 items-center">
        <NavLink
          to={HOUSEHOLD.to}
          className={`type-body inline-flex h-11 items-center rounded-control border border-border bg-surface px-4 font-medium text-ink hover:border-ink ${focusRing}`}
        >
          {HOUSEHOLD.label}
        </NavLink>
      </div>
    </header>
  );
}
