# Progress

The active milestone (R04) is recorded in full below. Earlier entries moved unchanged to
[progress-archive.md](progress-archive.md); read an archived entry only when the current
step depends on it. Statuses below are copied from the archived headings as written.

## Open follow-ups

- R04 — Decide whether budget enforcement can be optional before checkout pricing
  exists; R04.5 settled only zero vs unknown cost. (decision table: "Budget before offers")
- R05 — Persisted `violations` go stale after a lock or swap, because `setSlotLocked` and
  `replaceSlot` don't re-evaluate. Fix by extracting an evaluate-existing-slots function.
  Stopgap if the UI shows violations first: null them in those two calls. (R04.8b)
  Since R04.8c, GET also labels such a week `current` — that means inputs unchanged,
  not "violations match the slots". (R04.8c review)
- R07 — `recipesVersionAt` ignores `ingredients.updated_at`, so editing an ingredient's
  nutrition doesn't mark plans stale. Deliberate for now. (R04.8b)
- R07 — Deleting some (not all) rows of an input category doesn't advance
  `MAX(updated_at)`, so the plan still reads `current`. Fix with a per-category version
  counter bumped on every write/delete, or soft deletes. (R04.8c)
- R07 — `now()` is transaction start, not commit time: a write whose transaction started
  before a plan's generation but commits after it stamps an older `updated_at`, so the
  plan reads `current`. Same version-counter fix closes it. (R04.8 review)
- R04.8 — Expiry violations depend on the generation date, but staleness checks
  neither pantry changes nor the date. A plan generated Monday still reads `current`
  on Thursday with outdated expiry violations. (R04.6b/R04.7 review)
- R04 — Nine slices await review: R04.1, .2, .3, .6a, .6b, .7, .8a, .8b, .8c.

## Archived entries

| Entry | Status |
| --- | --- |
| Active roadmap — 2026-09-21 | — |
| R01 — Confirm contracts and prepare regression cases | implemented—awaiting review |
| R02 — Reliable quantities, nutrition and recipe writing | in progress |
| Steps 1–27 | complete |
| Step 28 — Plan persistence and endpoints | blocked |
| Step 29 — Audit current implementation and adopt agentic development | complete |
| Step 29.1 — Prevent lost updates in plan mutations | complete |
| Step 27.1 — Per-member dinner-only calorie targets and portion scaling | complete |
| Step 30 — Week grid and planning settings | complete |
| Step 31 — Meal detail rail and replacement | implemented—awaiting review |
| R03.1 — Propose household target and member shares | implemented—awaiting review |
| R03.2 — Schema for confirmed household target and member shares | implemented—awaiting review |
| R03.3a — Read-only share-proposal endpoint | implemented—awaiting review |
| R03.3b — Transactional confirm/persist endpoint | implemented—awaiting review |
| R03.4 — Household UI | implemented—awaiting review |
| R03.4 recovery — unordered member list — 2026-09-22 | — |
| R03 `/review` fixes — 2026-09-22 | — |

## R04.1 — Empty price catalog / empty exclusions are valid states, not errors — `implemented—awaiting review` (2026-09-22)

`plan()` threw `EmptyPriceCatalogError`/`EmptyPreferencesError` whenever `prices` or
`preferences.neverIngredientIds` was empty, conflating two legitimate states ("no
promos this week", "household excludes nothing") with "settings never configured."
Neither array is ever indexed unconditionally elsewhere in the pipeline (only
mapped/filtered/iterated), so removing both guards is safe. The real "not configured"
cases (`NoHouseholdMembersError`, `HouseholdMemberMissingDinnerTargetError`,
`HouseholdSettingsNotConfiguredError`) live in `plan-inputs.ts`, are unrelated to
these two arrays, and still block generation.

Removed `EmptyPriceCatalogError`/`EmptyPreferencesError` entirely (`lib/errors.ts`,
their `mapPlanError` branches in `routes/plans.ts`, the `@throws` doc lines in
`planner.ts`) rather than keeping unused dead classes.

`api/tests/planner.test.ts`: replaced the two "throws" tests with two "plans
successfully" tests for the same empty-input cases.

Verified: api 11 files/132 pass (unchanged count); typecheck/lint/prettier clean.

**Not yet done:** R04.2–R04.15.

## R04.2 — Fix pantry-exclusion bypass — `implemented—awaiting review` (2026-09-22)

Implemented [r01-fixtures.md §4](r01-fixtures.md)'s fix exactly: `plan()` (`planner.ts`)
called `resolveExpiryConstraints(pantry, recipes)` against the raw recipe list, so an
excluded ingredient expiring soon could force-place its recipe with no violation. Now
called with `PLANNED_MEAL_SLOTS.flatMap((mealSlot) => ctx.eligibleRecipesBySlot.get(mealSlot)
?? [])` instead; `resolveExpiryConstraints` itself unchanged. Also reworded the "no recipe
uses ingredient X" violation to "no eligible recipe uses ingredient X" (no test pinned the
old string), per the fixture doc.

New test in `api/tests/planner.test.ts`'s existing "pantry items expiring soon" block:
shrimp (never-ingredient) expiring today, 5 seeds, asserts never scheduled + exactly one
`pantry_expiry` violation with the new wording.

Verified 2026-09-22: api tests 11 files/133 pass (was 132); typecheck/lint/prettier clean.

**Not yet done:** R04.3–R04.15.

## R04.3 — Fix locked-slot-already-covers-expiry false violation — `implemented—awaiting review` (2026-09-22)

r01-fixtures.md §5 fix: `placeMustUseConstraints` now computes `lockedIngredientIds`
from `locked` only, skips a constraint already covered by a locked recipe before
searching for a placement. Same-lot/same-ingredient case (R04.4) untouched.

New `describe("locks", ...)` in `planner.test.ts`: lock day 0 dinner to `dinnerSalmon`,
salmon expiring day 0 → no `pantry_expiry` violation, lock stays.

Verified: typecheck/lint/prettier clean; api 11 files/134 pass (was 133). Web not re-run.

**Not yet done:** R04.4–R04.15.

## R04.5 — Distinguish unknown recipe cost from zero cost — `complete` (2026-09-22)

Skipped ahead of R04.4 (still needs its own decision). R04.5 also needed a decision
("Budget before offers" row): asked user, keep excluding unknown-cost recipes from
planning vs. make them plannable with an explicit "unknown" status. User chose **keep
excluding** (matches R02.1's unknown-calorie precedent).

Audit before asking found no "unknown read as zero" bug exists anywhere:
`PlannerRecipe.costCzk` is non-nullable; `plan-inputs.ts` already excludes
`cost === null` recipes before the planner sees them; manual swap
(`plans.ts`) and web display all null-check/exclude consistently. So this
slice is **no code change** — only a regression test, since none existed:
`plans.test.ts`'s new "recipe eligibility" describe seeds a null-cost dinner
recipe, generates a week, asserts it's never assigned.

`build-plan.md`'s R04.5 entry updated from "needs a decision" to "resolved,"
noting this only closes the zero-vs-unknown half of "Budget before offers" —
whether enforcement can be optional before checkout pricing exists is still open.

Verified: typecheck/lint clean (same 2 pre-existing web warnings); prettier clean on
the touched test file; api 11 files/135 pass (was 134, +1 new test, no regressions).

## R04.4 — Generalize "existing coverage" beyond locked slots — `complete` (2026-09-22)

No lot/row id on `PlannerPantryItem`, so true lot tracking isn't representable
(R08's job) — only remaining question: silent skip vs. a partial-coverage note.
User chose **silent** (matches R04.3).

`placeMustUseConstraints`: `lockedIngredientIds` → `coveredIngredientIds`, now
also grows from each placement made this pass, not just `locked`.

New `planner.test.ts` test (direct `placeMustUseConstraints` call, not full
`plan()`, to avoid other-search interference): two salmon lots, different
deadlines → exactly one placement, no violations.

Verified: typecheck/lint/prettier clean; api 11/136 pass (was 135, +1).

**Next step:** R04.6 (needs a decision first) or another R04 slice, after review.

## R04.6a — Derive weekday from weekStartDate, not startDayOfWeek setting — `implemented—awaiting review` (2026-09-22)

Split R04.6 into weekday derivation (this slice) and timezone-based "today"
for expiry (R04.6b, blocked on the decision below).

`isWeekday` (`planner.ts`) now derives each day's weekday from
`targets.weekStartDate` (`Date.getUTCDay()`) instead of the stored
`startDayOfWeek` setting, which could drift out of sync with the actual date
being planned. `PlannerTargets` gained `weekStartDate`; `buildPlannerTargets`
(`plan-inputs.ts`) now takes it as a param. `startDayOfWeek` stays (frontend
week-start picker still uses it) but `isWeekday` no longer reads it.

Asked the user first, per build-plan.md's "needs a decision" flag: how should
pantry-expiry "today" behave for weeks other than the one containing today
(WeekPage has working prev/next nav, so this is reachable). Chosen: skip
must-use expiry constraints/violations entirely for weeks not containing
today — R04.6b, not yet implemented.

New `isWeekday` test (`planner.test.ts`): overrides `startDayOfWeek` to a
wrong value while `weekStartDate` stays real, proves the fix is load-bearing.

Later (859ccf5): `startDayOfWeek` was dropped from `PlannerTargets`, which also
removed that override test. The review added a Wednesday-start week case so
a hard-coded `day < 5` would fail.

Verified: typecheck/lint/prettier clean; api 11/137 pass (was 136, +1).

**Next step:** R04.6b, after review.

## R04.4 follow-up — Lock coverage must respect the constraint's deadline day — `complete` (2026-09-22)

Bug in R04.4's `coveredIngredientIds`: a lock was treated as covering *any*
constraint on that ingredient, regardless of day. A lock placed after a
constraint's deadline can't actually save the expiring lot — it arrives too
late. `placeMustUseConstraints` now checks `lockedSlot.day <=
constraint.deadlineDay` before treating a lock as coverage; earlier-placement
coverage (the rest of R04.4) is unchanged, since sorting tightest-deadline-first
already guarantees those placements land on-or-before every later deadline.

New `planner.test.ts` test: lock uses salmon on day 6, constraint deadline is
day 0, no other candidate recipe — still a violation.

Verified: typecheck/lint clean (same 2 pre-existing web warnings); api 11/138 pass (was 137, +1).

**Next step:** R04.6b, after review.

## R04.6b — Skip expiry constraints for weeks not containing today — `implemented—awaiting review` (2026-09-23)

`buildPlannerPantry` (`plan-inputs.ts`) now nulls out `daysUntilExpiry` for every
pantry item when the requested `weekStartDate` isn't the week containing today,
using `household_settings.timezone` (default `Europe/Prague`) to decide what
"today" means — a server running in UTC could otherwise disagree with the
household about which calendar day it is near midnight. No change needed in
`planner.ts`: `resolveExpiryConstraints` already treats a null
`daysUntilExpiry` as "no constraint," so nulling it out there is enough to
silence both the must-use placement logic and the "expiring in N days" reason
text for other weeks.

New helpers `todayInTimezone`/`weekContainsToday` in `plan-inputs.ts`, both
local (not exported — no existing pattern here for unit-testing pure
date logic without DB access, and the behavior only matters wired through
`getPlanInputs`). `buildPlannerTargets` no longer calls `getHouseholdSettings`
itself; `getPlanInputs` now fetches settings once and passes it to both
`buildPlannerPantry` (for `timezone`) and `buildPlannerTargets`, avoiding a
duplicate query.

New `plans.test.ts` integration test ("pantry expiry across weeks"): seeds a
household on `timezone: "UTC"` (deterministic against the test's own UTC date
math), a pantry item on an ingredient no recipe uses, expiring tomorrow.
Generating the current week reports a `pantry_expiry` violation; generating a
week 30 days out reports none. `seedPlannableHousehold` gained an optional
`timezone` param (default `Europe/Prague`, matching the schema default) to
support this without touching the 14 existing call sites.

Verified: typecheck/lint/prettier clean (same 2 pre-existing web warnings);
api 11/139 pass (was 138, +1).

Later (961b098): `daysUntilExpiry` is measured from today (household
timezone), not from `weekStartDate`. `PlannerTargets.todayIndex` gives today's
offset in the week and is `null` for other weeks, where
`resolveExpiryConstraints` returns nothing. `buildReasons` ignores items that
have already expired. Review added a frozen-clock test (Sunday 22:30 UTC = Monday
in Prague) proving the household timezone picks the week.

**Next step:** R04.7 (needs a decision first) or another R04 slice, after review.

## R04.7 — Report conflicting locks instead of silently keeping them uncontested — `implemented—awaiting review` (2026-09-23)

Decision (user, before implementing): a stale lock reports through the
existing `PlanViolation` shape with a new `locked_slot_conflict` constraint,
not a distinct plan-level status — no schema change, no dependency on R04.8.

New `validateLockedSlots` (`planner.ts`) reuses `checkSlotEligibility` (the
same check `indexEligibleRecipesBySlot`/`replaceSlot` use) against each
locked slot's recipe; wired into `plan()` alongside the other final-check
validators. The recipe stays in the slot either way — reporting, not
dropping, per the plan's stated intent.

New `planner.test.ts` test ("locks" describe block): locks `dinnerShrimp`
into day 0 dinner while `FIXTURE_PREFERENCES` excludes shrimp, asserting the
`locked_slot_conflict` violation and that the recipe still occupies the slot.

**Two issues found by `/review`, both fixed (2026-09-23):** (1) the original
scope note above claimed calorie/budget conflicts were already covered by
the existing whole-plan validators, so `validateLockedSlots` was scoped to
"exclusion/meal-type eligibility only" — inaccurate on two counts. First,
`checkSlotEligibility` also has a third branch (implausible per-member
portion count from a changed target), which the code already exercised;
proven not redundant with `validateMemberDinnerCalories` using
`dinnerTooBig` (50 kcal/serving, 16 servings for the 800-kcal member): that
lands on an exact multiple, so `actualCalories` matches the target exactly
and `member_dinner_calories` never fires, while `locked_slot_conflict`
correctly does. Second, this branch and the meal-type-mismatch branch had
no test coverage at all — only the excluded-ingredient case was tested.
Fixed by adding both missing cases as tests, not by narrowing the code
(the behavior already matched build-plan.md's own R04.7 framing, "a new
exclusion, a changed target"; only the write-up and the test coverage were
wrong).

(2) `validateLockedSlots` silently skipped (`if (!recipe) continue`) any
locked slot whose recipe was absent from `ctx.recipesById` — which happens
for exactly the most severe staleness case: the recipe itself is gone from
the planning set (archived via R02.5, or has regressed to unknown cost or
incomplete nutrition, both of which `buildPlannerRecipes` already filters
out before recipes ever reach `plan()`). Verified before fixing: locking a
recipe id absent from `recipes` produced `violations: []` while the recipe
still occupied its slot — the exact "silently keeping them uncontested"
failure this step exists to close. Fixed: when `recipesById.get(...)` finds
nothing, `validateLockedSlots` now reports a `locked_slot_conflict` directly
("locked recipe {id} is no longer available for planning") instead of
skipping the slot.

`planner.test.ts` gained three more tests in the "locks" describe block: a
lock referencing a recipe id absent from `recipes` (simulating an archived
recipe), a lock whose recipe's `mealType` no longer matches its slot
(simulating a post-lock recipe edit), and the `dinnerTooBig` implausible-
portion case above (which also asserts no `member_dinner_calories`
violation accompanies it, locking in that this is a genuinely distinct
check, not a duplicate).

Re-verified: `npm run typecheck -w api` clean; `npm run lint -w api` clean;
`npx prettier --check` clean on both touched files; `npx vitest run
tests/planner.test.ts` → 23/23 pass (was 20, +3). Full Docker-backed
`npm run test -w api` not re-run this pass — not re-verified against the
rest of the suite.

**Next step:** another R04 slice (R04.8 or R04.9), after review.

## R04.8a — Schema for persisted violations and input-version watermarks — `implemented—awaiting review` (2026-09-23)

R04.8 itself already flagged "likely splits further into a migration slice and a
service-logic slice, given its size" — split accordingly, same reasoning as R03.2's
schema-only slice. Nothing reads or writes these columns yet; that's R04.8b.

`plan_weeks` gained four nullable columns, no defaults, no rewrite: `violations`
(jsonb, `PlanViolation[]`) and `recipes_version_at`/`targets_version_at`/
`exclusions_version_at` (timestamps). Null is deliberate, not a placeholder default —
an existing week genuinely has no recorded evaluation under this system, and null says
that honestly rather than `[]` (which would misread as "evaluated, zero violations").
The three version columns are meant as snapshots of `MAX(updated_at)` across each
input category (`recipes`; `household_members` + `household_settings`; `ingredient_preferences`)
taken at generation time — R04.8b will populate them and compare against live `MAX(updated_at)`
to decide staleness, per build-plan.md's "mark an evaluation stale when recipes/targets/
exclusions change since." Deliberately excludes `prices`/`pantry` from the staleness
categories, matching build-plan.md's own wording — those change every week by design and
would make almost every evaluation stale trivially.

Migration `0022_lyrical_grey_gargoyle.sql`: four `ALTER TABLE ADD COLUMN`, no defaults, no
rewrite. Applied to the dev database.

Verified 2026-09-23: typecheck/lint/prettier clean (api+web, same 2 pre-existing unrelated
`web` warnings); `npm run test -w api` → 11 files/144 tests pass, unchanged (schema only, no
new tests this slice). Confirmed via `\d plan_weeks` and a direct `SELECT` that all 4 existing
rows still load with the new columns `NULL`, not dropped.

**Not yet done:** R04.8b (persist `violations` and the three watermarks at generation time;
compute and expose staleness on `GET`).

**Next step:** R04.8b, after review.

## R04.8b — Persist violations and input-version watermarks at generation time — `implemented—awaiting review` (2026-09-23)

Write side only, per R04.8a's own "not yet done" line — staleness-on-`GET` (comparing
stored watermarks against live data) is left for a further slice, same split R03.2→R03.3
used for schema vs. API.

New `api/src/repositories/planInputVersions.ts` — `getCurrentInputVersions()` runs 5
parallel `MAX(updated_at)` queries (`recipes`, `recipe_ingredients`, `household_members`,
`household_settings`, `ingredient_preferences`) and folds them into the three watermark
categories the schema already has columns for: `recipesVersionAt` takes the later of
`recipes`/`recipe_ingredients` (an ingredient-line edit changes a recipe's kcal/eligibility
without touching `recipes.updated_at` itself — confirmed by reading `recipeIngredients.ts`'s
repository, which bumps only its own table's timestamp); `targetsVersionAt` takes the later
of `household_members`/`household_settings`. An empty table (e.g. no preferences configured
yet) yields `NULL` via `MAX`, not a default `now()` — carried through as a genuine `null`
watermark, consistent with R04.8a's schema decision and R04.1's "empty exclusions is a valid
state" precedent.

`plans.ts`'s `generatePlan` fetches `getCurrentInputVersions()` alongside `getPlanInputs`
and writes both it and `result.violations` into `insertPlanWeek`/`casIncrementRevision` —
`planWeeks.ts`'s `PlanWeekInput` gained the four optional fields and `casIncrementRevision`'s
`data` param widened from a two-key `Pick` to `Omit<PlanWeekInput, "weekStartDate">` rather
than growing an ever-longer `Pick` list. `generatePlan`'s returned object still explicitly
overrides `violations: result.violations` after the `{...week}` spread — not redundant: the
column type is nullable (an unregenerated legacy week has none), but a response from
`generatePlan` itself always has a definite, just-computed value, so the explicit override
keeps that response's type non-null. Caught this by running `npm run typecheck -w web`
first, which broke on `WeekPage.tsx` assuming non-null `violations` — restoring the override
was the fix, not loosening the frontend's type.

`api/tests/plans.test.ts` (+2, new "persisted evaluation (R04.8b)" describe block): generating
then reloading returns matching `violations`/watermarks (with `exclusionsVersionAt` asserted
`null`, not "not null" — this fixture seeds zero ingredient preferences, so that's the
honest answer, not a bug); regenerating after an ingredient line's `displayAmount` changes
(with `updatedAt` bumped explicitly, since this schema has no DB-level trigger for it — only
application code sets it) advances `recipesVersionAt` past its prior value.

Verified 2026-09-23: typecheck/lint/prettier clean (api+web); `npm run test -w api` → 11
files/146 tests pass (was 144, +2, no regressions); `npm run test -w web` not re-run, no
web-side change. No manual browser/dev-server check — no UI this slice, and
`plans.test.ts` already exercises the real Postgres path end to end (same rationale as
R02.4a). Confirmed via a direct `SELECT` that the 4 pre-existing dev-database rows are
untouched (tests run against a separate Testcontainers Postgres instance).

**Not yet done:** staleness computed and exposed on `GET /api/plans/:weekStartDate` (compare
stored watermarks against a fresh `getCurrentInputVersions()` call); the deliberate,
documented gap that `recipesVersionAt` doesn't cover `ingredients.updated_at` (nutrition
edits) — including the whole `ingredients` table would false-flag every plan as stale
whenever *any* ingredient anywhere is touched, not just one actually used in that week.

**Deliberate gap (decided in review):** persisted `violations` and the watermarks are a
snapshot as of *generation*. `setSlotLocked` and `replaceSlot` bump `revision` but do not
re-evaluate, so after a lock or swap `GET /api/plans/:weekStartDate` can return violations
describing the pre-swap plan. No evaluate-existing-slots function exists (`violations` is
only produced inside `plan()`), so fixing it means extracting one — that belongs with R05's
informed swaps and locks, not this slice. Revisit if the UI starts showing `violations`
somewhere a swap could contradict it (stopgap: null them in those two
`casIncrementRevision` calls).

**Review fix:** `generatePlan` now reads `getCurrentInputVersions()` *before*
`getPlanInputs()` (sequential, not `Promise.all`), so an edit landing between the two reads
leaves the watermark older than the data used — a false "stale", never a false "fresh".

**Next step:** the staleness-on-read slice, after review.

## R04.8c — Staleness on read — `implemented—awaiting review` (2026-10-13)

`GET /api/plans/:weekStartDate` now returns `evaluation: { status: "current" | "stale" |
"not_evaluated", staleInputs: ("recipes"|"targets"|"exclusions")[] }`, comparing the stored
watermarks with a fresh `getCurrentInputVersions()` call. Read side only; no schema change.

New pure `api/src/services/plan-staleness.ts` (`evaluateStaleness`); `getWeek` in
`services/plans.ts` reads slots and live versions in parallel and attaches the result.

Decisions:
- Per-category `staleInputs`, not one boolean — the UI can say what changed.
- `not_evaluated` = stored `violations` is null (legacy week never regenerated).
- Stale if live > stored; stored null + live non-null (first row added); stored non-null +
  live null (all rows deleted — found during self-check). Both null = current.
- Known gap: a partial delete doesn't advance `MAX`, so it's missed (Open follow-ups, R07).

`api/tests/plan-staleness.test.ts` (+5 unit); `api/tests/plans.test.ts` (+1 integration:
generate → `current`; edit an ingredient line with `updatedAt` +1s → `stale`, `["recipes"]`).

Verified 2026-10-13: `npm run test -w api` → 12 files/152 tests pass (was 146);
typecheck api+web clean. No web change, so `npm run test -w web` not run; no UI yet.

**Review fixes:** `generatePlan` now also returns `evaluation` (`current`), because
`useWeek.ts` seeds the GET cache with the POST response and an untyped `setQueryData`
hid the missing field. Doc comment says `current` = inputs unchanged (lock/swap gap, R05).
+2 integration tests: generate returns `evaluation`; legacy row → `not_evaluated`.
`npm run test -w api` → 154 pass; typecheck api+web and lint clean.

**Next step:** R04.9 (`severity` on `PlanViolation`), after review.
