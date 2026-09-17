import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { EmptyState } from "../../shared/ui/EmptyState";
import { formatWeekRange, resolveWeekStartDate, addDays } from "../../shared/lib/week";
import { useRecipeCatalog } from "../../shared/api/recipeCatalog";
import {
  useHouseholdMembersCatalog,
  useHouseholdSettingsCatalog,
} from "../../shared/api/household";
import { useWeek, useGeneratePlan } from "./useWeek";
import { deriveWeekRows } from "./deriveWeekRows";
import { WeekNav } from "./WeekNav";
import { WeekGrid } from "./WeekGrid";

const START_PARAM = "start";
const DEFAULT_START_DAY_OF_WEEK = 1;

function useCurrentWeekStart(startDayOfWeek: number): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const weekStartDate = resolveWeekStartDate(params.get(START_PARAM), startDayOfWeek);

  function setWeekStartDate(next: string) {
    const updated = new URLSearchParams(params);
    updated.set(START_PARAM, next);
    setParams(updated);
  }

  return [weekStartDate, setWeekStartDate];
}

export function WeekPage() {
  const settingsQuery = useHouseholdSettingsCatalog();
  const membersQuery = useHouseholdMembersCatalog();
  const recipesQuery = useRecipeCatalog();
  const [weekStartDate, setWeekStartDate] = useCurrentWeekStart(
    settingsQuery.data?.startDayOfWeek ?? DEFAULT_START_DAY_OF_WEEK,
  );
  const weekQuery = useWeek(weekStartDate);
  const generatePlan = useGeneratePlan();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  function goToWeek(next: string) {
    setWeekStartDate(next);
    setSelectedDay(null);
    generatePlan.reset();
  }

  function handleGenerate() {
    generatePlan.mutate({ weekStartDate, seed: Math.floor(Math.random() * 1_000_000) });
  }

  const nav = (
    <WeekNav
      label={formatWeekRange(weekStartDate)}
      onPrev={() => goToWeek(addDays(weekStartDate, -7))}
      onNext={() => goToWeek(addDays(weekStartDate, 7))}
    />
  );

  if (
    settingsQuery.isLoading ||
    membersQuery.isLoading ||
    recipesQuery.isLoading ||
    weekQuery.isLoading
  ) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {nav}
        <div className="flex-1 overflow-auto p-3.5">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const loadError =
    settingsQuery.error ?? membersQuery.error ?? recipesQuery.error ?? weekQuery.error;

  if (loadError) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {nav}
        <div className="flex-1 overflow-auto p-3.5">
          <ErrorState title="Couldn't load the week" message={loadError.message} />
        </div>
      </div>
    );
  }

  if (!weekQuery.data) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {nav}
        <div className="flex-1 overflow-auto p-3.5">
          <EmptyState
            message="No plan generated for this week yet."
            action={
              <Button onClick={handleGenerate} disabled={generatePlan.isPending}>
                Generate week
              </Button>
            }
          />
          {generatePlan.isError && (
            <div className="mt-2">
              <ErrorState title="Couldn't generate a plan" message={generatePlan.error.message} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {nav}
      <div className="flex-1 overflow-auto p-3.5">
        {generatePlan.isSuccess && generatePlan.data.violations.length > 0 && (
          <div className="mb-2">
            <ErrorState
              title="Some slots couldn't be filled"
              message={generatePlan.data.violations.map((v) => v.detail).join(" ")}
            />
          </div>
        )}
        <WeekGrid
          rows={deriveWeekRows(
            weekStartDate,
            weekQuery.data.slots,
            recipesQuery.data ?? [],
            membersQuery.data ?? [],
          )}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onDeselect={() => setSelectedDay(null)}
        />
      </div>
    </div>
  );
}
