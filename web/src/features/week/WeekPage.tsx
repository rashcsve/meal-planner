import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { EmptyState } from "../../shared/ui/EmptyState";
import {
  formatWeekRange,
  resolveWeekStartDate,
  addDays,
  formatDayLabel,
} from "../../shared/lib/week";
import { useRecipeCatalog } from "../../shared/api/recipeCatalog";
import {
  useHouseholdMembersCatalog,
  useHouseholdSettingsCatalog,
} from "../../shared/api/household";
import { useWeek, useGeneratePreview, useAcceptPlan, StalePreviewError } from "./useWeek";
import { deriveWeekRows } from "./deriveWeekRows";
import { WeekNav } from "./WeekNav";
import { WeekGrid } from "./WeekGrid";
import { MealDetailRail } from "./MealDetailRail";
import { PreviewBar, type PreviewStatus } from "./PreviewBar";

const START_PARAM = "start";
const DEFAULT_START_DAY_OF_WEEK = 1;

function useCurrentWeekStart(
  startDayOfWeek: number,
  timezone: string | undefined,
): [string, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const weekStartDate = resolveWeekStartDate(params.get(START_PARAM), startDayOfWeek, timezone);

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
    settingsQuery.data?.timezone,
  );
  const weekQuery = useWeek(weekStartDate);
  const generatePreview = useGeneratePreview();
  const acceptPlan = useAcceptPlan();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const preview = generatePreview.data;

  function discardPreview() {
    generatePreview.reset();
    acceptPlan.reset();
  }

  function goToWeek(next: string) {
    setWeekStartDate(next);
    setSelectedDay(null);
    discardPreview();
  }

  function handleGenerate() {
    acceptPlan.reset();
    generatePreview.mutate({ weekStartDate, seed: Math.floor(Math.random() * 1_000_000) });
  }

  function handleAccept() {
    if (!preview) return;
    acceptPlan.mutate(preview, { onSuccess: () => generatePreview.reset() });
  }

  const previewStatus: PreviewStatus =
    acceptPlan.isPending || generatePreview.isPending
      ? "busy"
      : acceptPlan.error instanceof StalePreviewError
        ? "stale"
        : acceptPlan.isError
          ? "error"
          : "ready";

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

  if (!weekQuery.data && !preview) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {nav}
        <div className="flex-1 overflow-auto p-3.5">
          <EmptyState
            message="No plan generated for this week yet."
            action={
              <Button onClick={handleGenerate} disabled={generatePreview.isPending}>
                Generate week
              </Button>
            }
          />
          {generatePreview.isError && (
            <div className="mt-2">
              <ErrorState
                title="Couldn't generate a plan"
                message={generatePreview.error.message}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const slots = preview?.slots ?? weekQuery.data?.slots ?? [];
  const selectedSlot =
    !preview && selectedDay !== null
      ? weekQuery.data?.slots.find((s) => s.day === selectedDay && s.mealSlot === "dinner")
      : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {nav}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex-1 overflow-auto p-3.5">
          {preview && (
            <div className="mb-2">
              <PreviewBar
                status={previewStatus}
                message={acceptPlan.error?.message}
                onAccept={handleAccept}
                onDiscard={discardPreview}
                onRegenerate={handleGenerate}
              />
            </div>
          )}
          {preview && preview.violations.length > 0 && (
            <div className="mb-2">
              <ErrorState
                title="Some slots couldn't be filled"
                message={preview.violations
                  .map((v) =>
                    v.slot
                      ? `${formatDayLabel(addDays(weekStartDate, v.slot.day))} ${v.slot.mealSlot}: ${v.detail}`
                      : v.detail,
                  )
                  .join(" ")}
              />
            </div>
          )}
          <div data-detail-rail-ignore>
            <WeekGrid
              rows={deriveWeekRows(
                weekStartDate,
                slots,
                recipesQuery.data ?? [],
                membersQuery.data ?? [],
              )}
              selectedDay={preview ? null : selectedDay}
              onSelectDay={preview ? () => {} : setSelectedDay}
              onDeselect={() => setSelectedDay(null)}
            />
          </div>
        </div>
        {selectedSlot && weekQuery.data && (
          <MealDetailRail
            weekStartDate={weekStartDate}
            revision={weekQuery.data.revision}
            slot={selectedSlot}
            members={membersQuery.data ?? []}
            recipes={recipesQuery.data ?? []}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>
    </div>
  );
}
