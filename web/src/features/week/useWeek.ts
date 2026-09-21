import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import type { GeneratePlanInput, MealSlot } from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "../../shared/api/unwrapResponse";
import { parseErrorResponse } from "../../shared/api/parseErrorResponse";

export const weekKeys = {
  detail: (weekStartDate: string) => ["plans", weekStartDate] as const,
  candidates: (weekStartDate: string, day: number, mealSlot: MealSlot) =>
    ["plans", weekStartDate, "slots", day, mealSlot, "candidates"] as const,
};

export type PlanWeek = InferResponseType<(typeof apiClient.api.plans)[":weekStartDate"]["$get"]>;
export type PlanSlot = PlanWeek["slots"][number];
export type GeneratePlanResult = InferResponseType<typeof apiClient.api.plans.generate.$post>;
export type SlotCandidates = InferResponseType<
  (typeof apiClient.api.plans)[":weekStartDate"]["slots"][":day"][":mealSlot"]["candidates"]["$get"]
>;
export type SlotCandidate = SlotCandidates["candidates"][number];
export type ReplaceSlotResult = InferResponseType<
  (typeof apiClient.api.plans)[":weekStartDate"]["slots"][":day"][":mealSlot"]["$put"]
>;
export type SetSlotLockedResult = InferResponseType<
  (typeof apiClient.api.plans)[":weekStartDate"]["slots"][":day"][":mealSlot"]["lock"]["$put"]
>;

async function fetchWeek(weekStartDate: string): Promise<PlanWeek | null> {
  const res = await apiClient.api.plans[":weekStartDate"].$get({ param: { weekStartDate } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export function useWeek(weekStartDate: string) {
  return useQuery({
    queryKey: weekKeys.detail(weekStartDate),
    queryFn: () => fetchWeek(weekStartDate),
  });
}

async function postGeneratePlan(input: GeneratePlanInput): Promise<GeneratePlanResult> {
  const res = await apiClient.api.plans.generate.$post({ json: input });
  return unwrapResponse(res);
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postGeneratePlan,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(weekKeys.detail(variables.weekStartDate), data);
    },
  });
}

async function fetchSlotCandidates(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
): Promise<SlotCandidates> {
  const res = await apiClient.api.plans[":weekStartDate"].slots[":day"][
    ":mealSlot"
  ].candidates.$get({
    param: { weekStartDate, day: String(day), mealSlot },
  });
  return unwrapResponse(res);
}

export function useSlotCandidates(weekStartDate: string, day: number | null, mealSlot: MealSlot) {
  return useQuery({
    queryKey:
      day !== null ? weekKeys.candidates(weekStartDate, day, mealSlot) : ["plans", "no-selection"],
    queryFn: () => fetchSlotCandidates(weekStartDate, day!, mealSlot),
    enabled: day !== null,
  });
}

function mergeSlot(
  prev: PlanWeek | null | undefined,
  day: number,
  mealSlot: MealSlot,
  revision: number,
  slotPatch: Partial<PlanSlot>,
): PlanWeek | null | undefined {
  if (!prev) return prev;
  return {
    ...prev,
    revision,
    slots: prev.slots.map((slot) =>
      slot.day === day && slot.mealSlot === mealSlot ? { ...slot, ...slotPatch } : slot,
    ),
  };
}

export interface ReplaceSlotVariables {
  weekStartDate: string;
  day: number;
  mealSlot: MealSlot;
  recipeId: number;
  expectedRevision: number;
}

async function putReplaceSlot(input: ReplaceSlotVariables): Promise<ReplaceSlotResult> {
  const res = await apiClient.api.plans[":weekStartDate"].slots[":day"][":mealSlot"].$put({
    param: { weekStartDate: input.weekStartDate, day: String(input.day), mealSlot: input.mealSlot },
    json: { recipeId: input.recipeId, expectedRevision: input.expectedRevision },
  });
  return unwrapResponse(res);
}

export function useReplaceSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putReplaceSlot,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        weekKeys.detail(variables.weekStartDate),
        (prev: PlanWeek | null | undefined) =>
          mergeSlot(prev, variables.day, variables.mealSlot, data.revision, data),
      );
      queryClient.invalidateQueries({
        queryKey: weekKeys.candidates(variables.weekStartDate, variables.day, variables.mealSlot),
      });
    },
  });
}

export interface SetSlotLockedVariables {
  weekStartDate: string;
  day: number;
  mealSlot: MealSlot;
  locked: boolean;
  expectedRevision: number;
}

async function putSlotLocked(input: SetSlotLockedVariables): Promise<SetSlotLockedResult> {
  const params = {
    param: { weekStartDate: input.weekStartDate, day: String(input.day), mealSlot: input.mealSlot },
    json: { expectedRevision: input.expectedRevision },
  };
  const res = input.locked
    ? await apiClient.api.plans[":weekStartDate"].slots[":day"][":mealSlot"].lock.$put(params)
    : await apiClient.api.plans[":weekStartDate"].slots[":day"][":mealSlot"].lock.$delete(params);
  return unwrapResponse(res);
}

export function useSetSlotLocked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putSlotLocked,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        weekKeys.detail(variables.weekStartDate),
        (prev: PlanWeek | null | undefined) =>
          mergeSlot(prev, variables.day, variables.mealSlot, data.revision, {
            locked: data.locked,
          }),
      );
    },
  });
}
