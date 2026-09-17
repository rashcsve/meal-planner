import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import type { GeneratePlanInput } from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "../../shared/api/unwrapResponse";
import { parseErrorResponse } from "../../shared/api/parseErrorResponse";

export const weekKeys = {
  detail: (weekStartDate: string) => ["plans", weekStartDate] as const,
};

export type PlanWeek = InferResponseType<(typeof apiClient.api.plans)[":weekStartDate"]["$get"]>;
export type PlanSlot = PlanWeek["slots"][number];
export type GeneratePlanResult = InferResponseType<typeof apiClient.api.plans.generate.$post>;

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
