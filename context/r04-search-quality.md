# R04 — search-quality ordering, comparison fixtures, work-limit methodology

Written 2026-09-21 as R01's "define the search-quality ordering and comparison fixtures
before R04... specify the runtime/quality measurements used to choose a work limit; do not
invent a new magic iteration count" deliverable. Grounded directly in the current
`localSearch`/`isBetter`/`scorePlan`/`fillRemainingSlots` code, not just the plan's prose —
citations below point at the actual functions being replaced. This is a specification for
R04 to implement; no search-algorithm code changes here.

## Current ordering, exactly as implemented today

`isBetter` (`planner.ts:817-822`) compares `{ violationCount, score }`: fewer violations
always wins; with equal violation counts, only a strictly higher `score` (`scorePlan`,
`planner.ts:776`) wins. `violationCount` is a plain count — `validateMemberDinnerCalories(...)
.length + validateWeeklyBudget(...).length` (`planner.ts:803-807`) — with no notion of how
badly a rule is broken. `score` never includes cost or calorie deviation at all; it's
promo/protein-variety/weekday-speed minus a store-count penalty. This is exactly the gap
`planner-logic-review.md` documents: a swap that cuts a 900 Kč overspend to 800 Kč against a
700 Kč budget doesn't change `violationCount` (still 1) and doesn't change `score` (cost
isn't in it), so `isBetter` rejects it — the search has no way to reward that improvement.

## Proposed ordering: three tiers, not two

1. **Violation count** — unchanged: fewer strictly wins. This still dominates everything
   below it; a soft-preference gain can never buy back a broken hard rule.
2. **Total severity (new tier)** — lower strictly wins. This is what's missing today and
   is what makes incremental repair visible to the search.
3. **Preference score** (`scorePlan`, unchanged) — higher strictly wins. Only reached when
   tiers 1 and 2 are exactly tied.

### Severity, defined per rule so it can be summed across rule types

`PlanViolation` (`planner.ts`, wherever it's currently defined) needs a numeric
`severity: number` field going forward — today `detail` is free text with the numbers
embedded in the string (`` `week totals ${total} Kč, over budget of...` ``), which isn't
something a comparator can read back out. Compute severity as a normalized "how far past
the limit, as a fraction of the limit" so different rule types can be added together
without unit mismatches:

- `weekly_budget`: `max(0, (totalCostCzk - weeklyBudgetCzk) / weeklyBudgetCzk)`. Example
  from the plan's own text: 900 Kč vs. 700 Kč budget → 0.286; 800 Kč vs. 700 Kč → 0.143 —
  strictly lower, so tier 2 now prefers 800 over 900 even though both are still exactly one
  `weekly_budget` violation.
- `member_dinner_calories`: per violating member-day,
  `max(0, (abs(actualCalories - target) - target * CALORIE_TOLERANCE) / target)`, summed
  across every violating member-day in the plan. This is "how far beyond the already-allowed
  ±10% band," not raw deviation — a result inside tolerance contributes 0, matching
  `validateMemberDinnerCalories`'s existing pass/fail boundary (`planner.ts:488-491`)
  exactly, just extended with a magnitude for the failing case.
- Plan's total severity = sum of every individual violation's severity. A plan with zero
  violations always has severity 0 (tiers 2 and 3 only ever discriminate between plans that
  already tie on violation count).
- `severity` is optional on `PlanViolation` (R04.9): only the two rules above set it, and
  weeks persisted before R04.9 have none. When summing, a missing `severity` counts as 0 —
  deliberately, since tier 1 (violation count) already penalises those violations.
- `weeklyBudgetCzk` is always > 0 (Zod + DB check), so the budget formula never divides by 0.

### Stable tie-break, made explicit

`fillRemainingSlots`'s current tie-break (`planner.ts:440-445`) is "first candidate in
`eligibleRecipes`'s array order wins a `>`-only comparison" — i.e., input recipe order,
not recipe id. R04 must keep this same rule for the new ordering (all three tiers exactly
equal → keep the earlier-in-input-order candidate) rather than introducing a second,
different tie-break convention (e.g., lowest id) that would silently make the same fixture
produce a different result depending on which function evaluates it. `localSearch`'s
equivalent case — proposed swap ties the current assignment on all three tiers — keeps the
current assignment (mirrors today's `else` branch at `planner.ts:864`, unaffected by this
change).

## Required comparison fixtures

Each of these must exist as a concrete case (recipes/pantry/targets/locked input →
expected result) before R04's implementation, per the plan's own R04 acceptance criteria
list. None are written as executable tests yet — this section specifies what each fixture
must demonstrate, for R04 to turn into `plannerFixtures.ts` additions and
`planner.test.ts` cases.

1. **Incremental budget repair.** The existing `planner-logic-review.md` fixture: seven
   fast dinners costing 700 Kč total against a 700→100 Kč tightened budget, with slower
   substitutes available that total 70 Kč. Must demonstrate: under the current two-tier
   ordering, a single substitution is rejected (documented, reproducible today); under the
   proposed three-tier ordering, each substitution that lowers total cost is accepted one
   at a time via tier 2, even while `violationCount` stays at 1, converging toward the 70
   Kč arrangement across successive passes.
2. **Locked meals.** A plan where the unconstrained best arrangement would want to change a
   locked slot's recipe. Must demonstrate: the locked slot's key is excluded from
   `freeKeys` exactly as today (`planner.ts:839`, unaffected by this change) and never
   changes, while the search still finds the best arrangement of the remaining free slots
   given the locked slot's fixed contribution to both violation count and severity (e.g., a
   locked recipe that itself contributes to a `weekly_budget` overage the free slots then
   have to compensate for).
3. **Empty slots.** **Resolved by R04.12 (2026-10-14): not a search case.** Eligibility
   depends only on meal type and household rules (`eligibleRecipes`), not on the rest of
   the week, so a slot `fillRemainingSlots` leaves empty (`no_eligible_recipe`) has no
   candidates the search could try either. A loosened exclusion means a new `plan()` call,
   which rebuilds the context and fills the slot from scratch. Contract kept: `localSearch`
   only swaps assigned slots; filling is `fillRemainingSlots`' job (test: "leaves an empty
   slot empty"). Revisit if R05 runs the search over a saved week with gaps.
4. **A case requiring coordinated (multi-slot) change.** Weekly cost is linear and
   additive per slot (`validateWeeklyBudget`'s `sum + recipe.costCzk * (totalServings /
   recipe.baseServings)`, `planner.ts:525`), so budget repair is always reachable by a
   sequence of independent single-slot improvements — fixture 1 above, not a coordination
   case. `countDistinctStores` (`planner.ts:723-760`) is **not** linear per slot: total
   store count depends on the joint set of ingredients needed across every assigned slot.
   Concrete fixture: two dinner slots currently assigned recipes whose ingredients are
   split across two stores; an alternative pair of recipes exists that would consolidate
   both slots' ingredients into one store — but switching *either slot alone* to its
   alternative doesn't reduce the total store count yet (the other slot's ingredients still
   require the original second store), so a single-slot move shows no `scorePlan`
   improvement and is never accepted by a greedy single-slot search, even though switching
   both together would. This fixture is expected to **fail to reach the two-store-saving
   arrangement** under single-slot local search — per the plan's own instruction ("record
   the limitation... evaluate multi-dinner moves... as a separate bounded proposal"), the
   R04 test for this fixture should assert the search *detects and reports* that a full
   pass found no single-slot improvement (a normal, honest "converged" result), not that it
   silently found the two-store optimum it structurally cannot reach.

## Work-limit methodology — measured, not invented

`DEFAULT_LOCAL_SEARCH_ITERATIONS = 500` (`planner.ts:891`) is exactly the "legacy
implementation choice, not an acceptance criterion" the plan warns against replacing with
another guessed constant. R04 replaces the random-attempt loop with the systematic
per-dinner pass described in `build-plan.md`'s R04 "Search procedure" (examine every
eligible replacement for every changeable dinner each pass; apply the single best strict
improvement under the ordering above; repeat until a full pass finds none). The work
budget for *that* algorithm should be chosen from three measurements, taken by running the
comparison harness `build-plan.md`'s R04 section already calls for (initial week vs. legacy
random search vs. systematic search, same fixtures) across recipe-library sizes anchored to
this household's actual scale (current real data: on the order of tens of recipes, not an
arbitrary "large" synthetic case) rather than assumed:

1. **Evaluations per pass** = (number of unlocked, unprotected slots) × (number of
   eligible candidates for that slot) — computed directly from each fixture's actual
   inputs, not assumed constant across fixtures of different sizes.
2. **Passes to convergence** — the pass number at which a full pass first finds zero
   improving moves, measured on each comparison fixture.
3. **Wall-clock time per evaluation** — measured against the real `evaluatePlan`/
   `scorePlan` implementation, not estimated.

The evaluation-budget cutoff is then set from the *measured* maximum passes-to-convergence
across the fixtures actually run, with a stated safety margin (e.g., observed maximum + a
fixed number of extra passes, or observed evaluations × a fixed multiplier). The measured
numbers are in `progress-archive.md` (R04.13); the chosen number and margin are recorded
below. Stop reasons are "converged" vs. "hit evaluation budget" only — no wall-clock cutoff
(see "Chosen"). Recording the measured numbers (not just the methodology) is part of R04's
own acceptance criteria — "comparison results justify the chosen work limit," per
`build-plan.md`.

**Chosen (R04.14, 2026-10-14):** `MAX_SEARCH_EVALUATIONS = 10_000` candidate evaluations
per `localSearch` call (`planner.ts`). Largest measured run: 1,372 evaluations / 4 passes
(50 dinners); max passes anywhere: 8. So 10,000 is ~7× headroom, ~55 ms worst case at the
measured ~5.5 µs per evaluation. A count, not a pass cap, because evaluations per pass grow
with the library (7 × (N − 1)). On hitting it mid-pass, that pass's best swap so far is
applied, then search stops. No wall-clock cutoff: the count already bounds time, and a timer
would make results depend on machine speed and break deterministic replay. Reporting the
stop reason is R04.15.
