import type { RowState } from "../ui/Table";

export function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateIso}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

export function expiryRowState(days: number): RowState {
  if (days <= 1) return "promo";
  if (days <= 3) return "check";
  return "none";
}

export function formatExpiry(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
