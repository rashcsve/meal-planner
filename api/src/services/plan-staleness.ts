import type { CurrentInputVersions } from "../repositories/planInputVersions.js";

export type StaleInput = "recipes" | "targets" | "exclusions";

export interface PlanEvaluationStatus {
  status: "current" | "stale" | "not_evaluated";
  staleInputs: StaleInput[];
}

const WATERMARKS: [StaleInput, keyof CurrentInputVersions][] = [
  ["recipes", "recipesVersionAt"],
  ["targets", "targetsVersionAt"],
  ["exclusions", "exclusionsVersionAt"],
];

/**
 * Has any input changed since the plan was generated? null = the category was empty.
 * "current" means inputs unchanged, not that violations still match the slots after a lock or swap.
 * Misses partial deletes: they don't advance MAX(updated_at).
 */
export function evaluateStaleness(
  evaluated: boolean,
  stored: CurrentInputVersions,
  current: CurrentInputVersions,
): PlanEvaluationStatus {
  if (!evaluated) return { status: "not_evaluated", staleInputs: [] };

  const staleInputs = WATERMARKS.filter(([, key]) => {
    const now = current[key];
    const was = stored[key];
    // Live null with a stored value: every row was deleted since generation.
    if (!now) return was !== null;

    return !was || now.getTime() > was.getTime();
  }).map(([input]) => input);

  return { status: staleInputs.length > 0 ? "stale" : "current", staleInputs };
}
