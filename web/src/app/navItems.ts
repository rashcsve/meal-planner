export type NavItem = { to: string; label: string; key: string };

export const MENU: NavItem[] = [
  { to: "/today", label: "Today", key: "1" },
  { to: "/week", label: "Plan", key: "2" },
  { to: "/shopping", label: "Shopping", key: "3" },
  { to: "/pantry", label: "Fridge", key: "4" },
  { to: "/recipes", label: "Recipes", key: "5" },
  { to: "/import", label: "Import", key: "6" },
];
export const HOUSEHOLD: NavItem = { to: "/household", label: "Household", key: "7" };

export const NAV_ITEMS: NavItem[] = [...MENU, HOUSEHOLD];
