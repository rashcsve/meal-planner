import { NavLink, useLocation, useSearchParams } from "react-router-dom";
import { Kbd } from "../shared/ui/Kbd";
import { formatWeekRange, resolveWeekStartDate } from "../shared/lib/week";
import { useHouseholdSettingsCatalog } from "../shared/api/household";

export type NavItem = { to: string; label: string; key: string };

const PLAN: NavItem[] = [
  { to: "/week", label: "Week", key: "1" },
  { to: "/shopping", label: "Shopping", key: "2" },
];
const DATA: NavItem[] = [
  { to: "/recipes", label: "Recipes", key: "3" },
  { to: "/pantry", label: "Pantry", key: "4" },
  { to: "/household", label: "Household", key: "5" },
];
const INPUT: NavItem[] = [{ to: "/import", label: "Import", key: "6" }];

export const NAV_ITEMS: NavItem[] = [...PLAN, ...DATA, ...INPUT];

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <>
      <div className="type-label px-3.5 pt-3 pb-1.25 text-9 text-faint">{title}</div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              "flex h-6.75 items-center gap-2 border-l-2 px-3.5 font-stretch-92% font-semibold",
              isActive
                ? "border-ink bg-paper text-ink font-bold"
                : "border-transparent text-muted hover:bg-ink/5 hover:text-ink",
            ].join(" ")
          }
        >
          {item.label}
          <span className="ml-auto">
            <Kbd>{item.key}</Kbd>
          </span>
        </NavLink>
      ))}
    </>
  );
}

function useWeekRangeLabel(): string | null {
  const location = useLocation();
  const [params] = useSearchParams();
  const settingsQuery = useHouseholdSettingsCatalog();

  if (location.pathname !== "/week") return null;
  const weekStartDate = resolveWeekStartDate(
    params.get("start"),
    settingsQuery.data?.startDayOfWeek ?? 1,
  );
  return formatWeekRange(weekStartDate);
}

export function Sidebar() {
  const weekRangeLabel = useWeekRangeLabel();

  return (
    <aside className="flex flex-col overflow-hidden border-r border-line bg-sink">
      <div className="border-b border-line px-3.5 pt-3.25 pb-2.75 text-15 leading-[1.15] tracking-[-0.01em] font-stretch-70% font-black">
        MEAL
        <br />
        PLANNER
        {weekRangeLabel && (
          <span className="mt-0.5 block text-9 font-stretch-88% font-semibold tracking-widest text-faint">
            {weekRangeLabel}
          </span>
        )}
      </div>
      <nav className="flex-1 overflow-auto py-1.75">
        <NavSection title="Plan" items={PLAN} />
        <NavSection title="Data" items={DATA} />
        <NavSection title="Input" items={INPUT} />
      </nav>
    </aside>
  );
}
