# R01 — Representative examples and test impact

Written 2026-09-21 as part of R01's "specify representative examples... read existing
tests before adding coverage" deliverable. Every example below was checked against the
actual current code (`api/src/services/planner.ts`, `api/tests/*.test.ts`,
`api/src/db/schema.ts`), not copied from `planner-logic-review.md` without verification —
two of the seven areas below turned out to have precisely reproducible current bugs,
confirmed by reading the relevant function bodies directly (cited per example). This is a
specification for R02/R04 to implement against, not an implementation itself — no test
files were added or changed by this document.

## 1. Portions (quarter-serving rounding)

**Already covered, must remain unchanged.** `api/tests/planner.test.ts:40-70` fixes the
exact behavior: a 400-kcal/serving recipe against targets 500 and 800 gives 1.25 and 2.0
servings with zero rounding artifact (`"keeps every day within tolerance..."`); a target of
250 against the same recipe rounds to 0.75 servings (300 kcal, 20% over) and must report a
`member_dinner_calories` violation every day (`"reports a violation when quarter-serving
rounding can't hit a member's target"`). R02/R03 must not change this rounding rule — it's
an invariant, not something up for reinterpretation. `computeMemberServings`/
`isServingsPlausible` are already exported (step 31) for reuse; R03 adds the *share*
concept on top without touching this rounding step itself.

## 2. Original yield / ingredient scaling

**Currently duplicated, must be centralized — this is R02's actual job here.** The ratio
`totalServings / recipe.baseServings` is independently reimplemented in at least two
places: `validateWeeklyBudget` in `planner.ts` (`recipe.costCzk * (totalServings /
recipe.baseServings)`) and `web/src/features/week/deriveMealDetail.ts` (ingredient display
scaling, per the step-31 progress entry). Representative example: a recipe with
`baseServings: 4` and a rice ingredient line stored as `amountBase: 200` (grams, at that
recipe's own yield). A dinner slot needing 3.25 total servings (e.g. members needing 1.25
and 2.0 servings, per example 1) must scale rice to `200 × 3.25 / 4 = 162.5`g — computed
through **one** shared function both cost and ingredient-amount scaling call, not two
independently-written copies of the same division. R02 introduces that one function
(matches the "Recipe amount storage" resolution in `build-plan.md`); no existing test
currently pins the duplication down, so there's no test to "change" here, only new
coverage to add once the shared function exists — assert the two current call sites
produce the same number for the same inputs, then assert they both call the one function
rather than reimplementing it.

**Proposed fix, for R02:** add one exported function (e.g. `scaleToServings(amount:
number, baseServings: number, totalServings: number): number`, likely in
`api/src/lib/units.ts` or a new `api/src/lib/scaling.ts`, since both cost and
ingredient-amount math need it, not just nutrition) doing exactly `amount * totalServings /
baseServings`. Replace `validateWeeklyBudget`'s inline `recipe.costCzk * (totalServings /
recipe.baseServings)` and `deriveMealDetail.ts`'s equivalent ingredient-scaling line with
calls to it. No behavior change intended — same numbers, same rounding — this is a reuse
fix, not a calculation change, so existing `validateWeeklyBudget` tests should keep
passing unmodified once it's wired through the shared function.

## 3. Missing nutrition

**One existing test currently encodes the bug as a feature — must change deliberately.**
`api/tests/nutrition.test.ts:29-36`, `"sums only the computable lines, skipping the rest"`,
asserts that a recipe with one 330-kcal computable line and two lines with missing
data (`amountBase: null` or `kcalPer100g: null`) returns `{ kcalTotal: 330 }` — a number
indistinguishable from a recipe whose nutrition is genuinely complete. This is exactly the
gap R02 exists to close ("expose complete/partial/unknown nutrition... one missing caloric
ingredient cannot certify the target"). R02 must replace `summarizeKcal`'s return shape
with something like `{ kcalTotal, status: "complete" | "partial" | "unknown" }`, and this
test's expectation changes from `{ kcalTotal: 330 }` to `{ kcalTotal: 330, status:
"partial" }` — deliberately, not as a regression. The three sibling tests directly above it
(null `amountBase`, null `kcalPer100g`, empty line list) need the same status field added,
but their *totals* are correct already and must stay correct. `computeKcalPerServing`
(`nutrition.test.ts:43-55`) is unaffected — it only divides an already-computed total, and
its null-servings/zero-servings guards are independent invariants that must survive R02.

**Proposed fix, for R02:** `summarizeKcal` currently returns `{ kcalTotal: number }`.
Change it to also count computable vs. total lines: if every line contributed (no null
`amountBase`/`kcalPer100g`), `status: "complete"`; if at least one line contributed but at
least one didn't, `status: "partial"`; if zero lines contributed and at least one line
existed, `status: "unknown"`; an empty line list stays `"complete"` (zero ingredients, zero
gaps — a recipe with no lines yet is a different problem, not this one). Every downstream
caller that currently treats a `kcalTotal` as automatically trustworthy (recipe eligibility
in `buildPlannerRecipes`, `computeKcalPerServing`'s input) must check `status !== "unknown"`
before treating the number as usable for planning — `"partial"` still blocks certifying
full compliance per the plan's own rule ("Unknown or partial nutrition cannot pass as a
complete calorie estimate"), so both `"partial"` and `"unknown"` should be treated the same
way at the planning boundary, differing only in what's shown to the user (a partial number
is still shown, labelled; an unknown one has no number to show at all).

## 4. Pantry exclusions

**Confirmed reproducible bug, not yet covered by any test.** Read directly in
`planner.ts`: `resolveExpiryConstraints(pantry, recipes)` (`planner.ts:930`) receives the
*unfiltered* `recipes` array passed into `plan()`, not `ctx.eligibleRecipesBySlot` (the
never-ingredient-filtered set built by `buildPlannerContext`). Concretely, using the
existing fixture book (`plannerFixtures.ts`): `dinnerShrimp` contains the household's
never-ingredient (shrimp, `FIXTURE_PREFERENCES.neverIngredientIds`). Add a pantry row
`{ ingredientId: INGREDIENT_ID.shrimp, daysUntilExpiry: 0 }` and run `plan()` — the current
code will find `dinnerShrimp` as a valid `candidateRecipeId` for the expiry constraint and
may place it into a slot, with **no violation reported**, even though ordinary generation
(`fillRemainingSlots`/`eligibleRecipes`) would never place it. This exactly matches the
existing `planner-logic-review.md` example ("Excluded shrimp expires today → Shrimp is
scheduled today; no violation is reported") — confirmed here against the actual function
body, not assumed from the review doc. This is R04 scope ("Expiry is a preference: never
bypass exclusions or calorie rules") — the fix is to intersect `resolveExpiryConstraints`'s
candidate search with the same `ctx.eligibleRecipesBySlot` ordinary eligibility already
computes, not a second, separately-maintained exclusion check.

**Proposed fix, for R04:** change the call in `plan()` (`planner.ts:930`) from
`resolveExpiryConstraints(pantry, recipes)` to pass the already-eligible recipe set instead
of the raw list — `resolveExpiryConstraints(pantry, PLANNED_MEAL_SLOTS.flatMap((slot) =>
ctx.eligibleRecipesBySlot.get(slot) ?? []))` — so `candidateRecipeIds` can never include a
recipe that ordinary generation would have rejected (excluded ingredient or implausible
portion). `resolveExpiryConstraints` itself needs no internal change, only what it's
called with. The `"no recipe uses ingredient X"` violation message (`planner.ts:292`)
should also change to `"no eligible recipe uses ingredient X"` once this lands, since it
can now correctly fire for a pantry item whose only recipe exists but is excluded — no
test currently pins that exact string, so the wording is free to correct.

## 5. Locks

**Confirmed reproducible bug, exact fixture below.** `placeMustUseConstraints`
(`planner.ts:369-378`) seeds its `assigned` map directly from `locked` slots with zero
re-validation — no exclusion check, no portion-plausibility check, no meal-type check.
Separately, `findPlacementOptions` (`planner.ts:328-341`) only asks "is this `(day,
mealSlot)` key already occupied," never "does an already-assigned recipe already satisfy
this ingredient's must-use requirement." Concrete repro: lock day 0 dinner to
`dinnerSalmon` (which contains salmon) via the `locked` parameter; pantry has
`{ ingredientId: salmon, daysUntilExpiry: 0 }` (deadline day 0). `resolveExpiryConstraints`
correctly finds `dinnerSalmon` as the sole candidate; `placeMustUseConstraints` sees
`assigned` already has `"0:dinner"` (from the lock) and skips it as a placement *option*
rather than recognizing the requirement is already met — with no other day eligible
(`deadlineDay: 0` means only day 0 is searched), `findPlacementOptions` returns `[]` and a
`"no free slot by day 0 for ingredient <salmon id>"` violation is reported despite the
locked meal already using salmon. Matches `planner-logic-review.md`'s documented example.
No test currently exercises this — `planner.test.ts` has no `describe("locks", ...)`
block at all; the only lock-related tests live in `plans.test.ts` and test optimistic
concurrency (revision CAS), not planner-level lock content validation. This is R04 scope
("Evaluate retained locks and final assignments independently... report conflicting locks
rather than silently replacing them").

**Proposed fix, for R04:** before the `sortedByDeadline` loop in `placeMustUseConstraints`,
compute once — from `locked` only, not from the `assigned` map that grows during the loop
— the set of ingredient ids already covered by a locked slot's recipe:
`const lockedIngredientIds = new Set(locked.flatMap((slot) => recipesById.get(slot.recipeId)
?.ingredientIds ?? []))`. Then, for each constraint, `if
(lockedIngredientIds.has(constraint.ingredientId)) continue;` before calling
`findPlacementOptions` — the requirement is already met, so no placement search and no
violation. Deliberately scoped to `locked` only (not the growing `assigned` map): a second
pantry lot of the *same* ingredient placed by an earlier must-use constraint in this same
run is a different, still-open product question (`planner-logic-review.md`'s "two
same-ingredient pantry rows" case — no quantity/lot tracking exists until R08), and this
fix must not silently change that case's behavior while fixing the locks case.

## 6. Legacy plans

**Deliberately out of scope for now — no fixture needed, per the R01 resolution already
recorded.** `plan_weeks.plannerVersion` (schema.ts:216, currently `shared/src/planner.ts`'s
`PLANNER_VERSION = "1.0.0"`) already exists and already stamps every generated week, so
the mechanism to *detect* a legacy plan (`plannerVersion !== current PLANNER_VERSION`) is
in place with no change needed. Per the "Legacy plan editing" resolution in
`build-plan.md`, since there's no real production data, R03 does not need to define what
happens when a `GET`/replace/lock touches a row with an old `plannerVersion` — existing dev
data gets deleted and regenerated instead. Recorded here only as a pointer: the first time
this app holds real data across a `PLANNER_VERSION` bump, this area needs its own
resolution (read-only old plan? explicit conversion? compatible dual-path editing?) —
`plannerVersion` is already the field to key that decision on, nothing new to add to the
schema.

## 7. Stale revisions

**Already covered, must remain unchanged.** `api/tests/plans.test.ts` has three full
`describe` blocks (`"revision contract"`, `"stale mutations"`, `"concurrent mutations"`,
lines 196-415) — 10 tests total, covering: `expectedRevision` required on every mutation,
malformed revision is a 400 validation error not a 409, a stale revision is rejected with
no partial write, two same-revision mutations race to exactly one winner, and a lock raced
against a regeneration is never silently dropped. Representative example already in the
suite: client reads `revision=3`; a concurrent mutation bumps the row to `revision=4`; the
client's `replace-slot` request sent with `expectedRevision: 3` gets a 409
`STALE_PLAN_REVISION` and writes nothing (`plans.test.ts:271-303`). R02/R03/R04 must not
touch this mechanism — none of the four milestones' scope (nutrition, shares, rule
consistency) needs to change the CAS contract. Treat every test in these three blocks as a
regression gate: if a later step's diff makes any of them fail, that's a sign the step
strayed into `plans.ts`'s revision handling by accident, not an expected side effect to
wave through.

## Summary: test impact by area

| Area | Existing test status | Action needed |
| --- | --- | --- |
| Portions | Covered, correct | None — invariant, keep passing |
| Original yield / scaling | Not covered (duplication itself untested) | New coverage once R02 centralizes the calculation |
| Missing nutrition | One test encodes the bug as expected behavior | Deliberately rewrite `nutrition.test.ts:29-36`'s expectation; add `status` assertions to its three siblings |
| Pantry exclusions | Not covered; bug confirmed live | New `describe("locks and exclusions interact with expiry", ...)`-style coverage in R04 |
| Locks | Not covered at planner level; bug confirmed live | New coverage in R04 (planner-level, distinct from `plans.test.ts`'s concurrency tests) |
| Legacy plans | N/A — deliberately deferred | None now; revisit when real data exists |
| Stale revisions | Covered, correct (10 tests) | None — regression gate, keep passing |
