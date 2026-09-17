const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseIsoDate(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00Z`);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function localTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateIso: string, days: number): string {
  const date = parseIsoDate(dateIso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

export function startOfWeekContaining(todayIso: string, startDayOfWeek: number): string {
  const date = parseIsoDate(todayIso);
  const offset = (date.getUTCDay() - startDayOfWeek + 7) % 7;
  return addDays(todayIso, -offset);
}

export function resolveWeekStartDate(paramValue: string | null, startDayOfWeek: number): string {
  return paramValue ?? startOfWeekContaining(localTodayIso(), startDayOfWeek);
}

export function dayDate(weekStartDate: string, day: number): string {
  return addDays(weekStartDate, day);
}

export function formatDayLabel(dateIso: string): string {
  const date = parseIsoDate(dateIso);
  return `${DAY_LABELS[date.getUTCDay()]} ${date.getUTCDate()}`;
}

export function formatWeekRange(weekStartDate: string): string {
  const start = parseIsoDate(weekStartDate);
  const end = parseIsoDate(addDays(weekStartDate, 6));
  const startLabel = start.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel}–${endLabel}`;
}
