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
 * Compares the watermarks stored at generation with the live ones. A null stored
 * watermark means that input category was empty at generation, so any live value
 * means it changed since. `evaluated` is false for a week never evaluated (legacy row).
 * Limitation: deleting some (not all) rows of a category doesn't advance MAX(updated_at),
 * so it goes undetected.
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
