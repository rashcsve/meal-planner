# Progress

## Active roadmap — 2026-09-21

**Status: revised plan written; implementation paused for user review.**

The active plan is now [build-plan.md](build-plan.md), milestones **R01–R14**,
based on the supplied `MASTER-PLAN-v2.md` and agreed product changes. All R
milestones are planned, not started. **Next proposed milestone: R01** — settle
the remaining contracts and prepare regression cases before changing behavior.

Agreed: standard-portion calorie target ±10%, fixed member shares, preserved
saved portions, trustworthy nutrition, consistent planning rules, expiry as a
preference, preview/accept, persistent warnings, quantity-aware stock/cooking,
and shopping for remaining uncooked meals. Details and unresolved defaults are
in the active plan; this entry is not an implementation claim.

**Search decision added:** R04 will replace the fixed 500 random attempts with
systematic single-dinner improvement, final validation and a measured work limit.
R01 will define the quality ordering and comparison fixtures. R04 will compare
initial/random/systematic results under the same rules before rollout; advanced
search remains contingent on evidence. This is a plan change only: current code
still uses 500 attempts and no implementation milestone has started.

An implementation attempt started before the plan was updated. Following the
user's correction, all 19 source files changed by that attempt were restored.
No migration was generated/applied and no application data was changed. Only
planning documentation is being updated; the user's existing
`.claude/settings.json` modification remains untouched. Application tests were
not rerun for this documentation-only revision.

## R01 — Confirm contracts and prepare regression cases — `implemented—awaiting review`

First slice (2026-09-21): resolved the four decision-table rows in `build-plan.md`
tagged as blocking R02/R03 (initial target/share values, recipe amount storage,
the R02-scoped slice of cooking adjustments, legacy plan editing). Two were
finalized directly since they only restated a decision already recorded
elsewhere in the plan (recipe amount storage; the R02 slice of cooking
adjustments). Two were real product/data tradeoffs and were put to the user:

- **Share migration policy** — user chose "derive from current data, then
  confirm" over "blank defaults, manual entry." Household target proposed as
  the max of existing per-member targets, each member's share derived from
  that and shown for explicit confirmation before the fixed-share model is
  used for planning; the current per-member-target model keeps working until
  confirmed. Full formula in `build-plan.md`'s "R01 resolutions" section. A
  follow-up question during understanding-check exposed a gap this slice had
  not answered — what happens if a member's legacy target changes after their
  share is confirmed — resolved separately: the confirmed share becomes its
  own independent setting; editing the legacy target afterward does not
  recompute or unconfirm it. Also recorded in "R01 resolutions."
- **Legacy plan editing** — user stated there is no real production data in
  the app yet, so R03 does not need dual-path legacy/new-model editing
  compatibility; existing dev/test data can be deleted and regenerated under
  the new model once R03 ships. Recorded explicitly as a scope reduction for
  *this* deployment's current (empty) data, not a reversal of the general
  preserve-real-data principle — that principle applies again the first time
  this app holds data worth keeping.

No code, schema, or test changes in this slice — `context/build-plan.md` only.
Not yet done: baseline/legacy-step-ID reconciliation check, R02 fixture
examples (portions, yield, missing nutrition, pantry exclusions, locks,
legacy plans, stale revisions), R04 search-quality ordering and comparison
fixtures, and breaking R04 into small rule/search/measurement slices — all
still open per `build-plan.md`'s R01 description.

Second slice (2026-09-21): audited `build-plan.md`'s "Confirmed current
baseline" bullets and historical-step cross-references against the actual
repository (schema, `planner.ts`, `plans.ts`) rather than trusting the prose.
Spot-checked: seven-dinner-only generation (`PLANNED_MEAL_SLOTS`), no fixed
share column in `household_members`, ingredient amounts stored against each
recipe's own yield (`recipe_ingredients.amountBase`/`displayAmount`,
`recipes.servings`), pantry quantities not reaching the planner, and
violations returned but not persisted (`plans.ts:92`). All matched — no drift
found, no doc changes needed for this slice. `MASTER-PLAN-v2.md` itself isn't
checked into the repo (supplied in an earlier conversation only), so its own
step numbers aren't independently re-verifiable here; not treated as a gap,
since `build-plan.md` already absorbed what it needed from it.

Third slice (2026-09-21): wrote [r01-fixtures.md](r01-fixtures.md) — the
"specify representative examples... read existing tests before adding
coverage" deliverable, covering portions, original yield, missing nutrition,
pantry exclusions, locks, legacy plans and stale revisions. Read
`nutrition.test.ts`, `planner.test.ts`, `plannerFixtures.ts`, `plans.test.ts`
and the relevant sections of `recipes.test.ts`/`units*.test.ts` before writing
it, and verified two of the seven areas directly against `planner.ts`'s
actual function bodies rather than trusting `planner-logic-review.md`
secondhand — both turned out to be real, currently-reproducible bugs with
exact fixture data now written down: `resolveExpiryConstraints` receives the
unfiltered recipe list, not the never-ingredient-filtered eligible set, so an
excluded ingredient can be placed via expiry with no violation reported; and
`placeMustUseConstraints`/`findPlacementOptions` only check whether a
`(day, mealSlot)` slot is occupied, never whether an already-locked recipe
already satisfies the same expiring ingredient, producing a false "no free
slot" violation. Also found one existing test that encodes a known gap as
expected behavior and must change deliberately, not as a regression:
`nutrition.test.ts:29-36`, `"sums only the computable lines, skipping the
rest"`, asserts a partial-nutrition recipe returns a total indistinguishable
from a complete one. No test files or application code changed by this
slice — `context/r01-fixtures.md` (new) and a `build-plan.md` source-list
addition only.

Fourth slice (2026-09-21): at the user's request, added concrete **proposed
fixes** (not applied — design only, per the user's explicit "propose the
fixes into the plan, don't do it now") for the confirmed bugs in
`r01-fixtures.md`'s pantry-exclusions and locks sections, plus a fix sketch
for the missing-nutrition status field and the yield-scaling duplication:
pantry exclusions — call `resolveExpiryConstraints` with
`ctx.eligibleRecipesBySlot`-filtered recipes instead of the raw list;
locks — precompute `lockedIngredientIds` from `locked` (not the growing
`assigned` map, to avoid changing the separate, still-open
same-ingredient-multiple-lots behavior) and skip already-covered constraints
before searching for a placement; nutrition — `summarizeKcal` returns a
`status: "complete" | "partial" | "unknown"` alongside `kcalTotal`; yield
scaling — one shared `scaleToServings` function replacing the two
independent `totalServings / baseServings` implementations. All four are
R02/R04 implementation work, not yet started; no application code changed.

Fifth slice (2026-09-21): wrote [r04-search-quality.md](r04-search-quality.md)
— the "define the search-quality ordering and comparison fixtures before
R04... specify the runtime/quality measurements used to choose a work limit;
do not invent a new magic iteration count" deliverable. Read `isBetter`,
`evaluatePlan`, `scorePlan`, `countDistinctStores`, `fillRemainingSlots` and
`localSearch` directly to ground the proposal: today's `isBetter` only
compares a plain violation count then a preference score that never
includes cost or calorie deviation, which is exactly why the plan's own
900→800 Kč incremental-repair example currently can't be recognized as
progress. Proposed a three-tier ordering (violation count, then a new
normalized "how far past the limit" severity sum, then the existing
preference score) with concrete severity formulas for both hard rules, an
explicit stable tie-break (kept identical to `fillRemainingSlots`'s existing
input-order rule, not a new convention), and four required comparison
fixtures — incremental budget repair, locked meals, empty slots, and a
genuine coordinated-change case identified by reasoning about which
constraint is actually non-separable per slot (store count, since
`countDistinctStores` depends on the joint ingredient set across all
assigned slots, unlike the linear/additive weekly-budget cost) rather than
assumed. The work-limit section specifies three measurements to take (
evaluations per pass, passes to convergence, wall-clock per evaluation)
against fixtures sized to this household's real recipe count, deferring the
actual cutoff number to when R04 runs that measurement — no number is
invented here. No test files, schema, or application code changed.

Sixth slice (2026-09-21): added the "R04 implementation slices" subsection to
`build-plan.md` under R04 — the last remaining R01 deliverable ("break the
R04 work into small rule, search and measurement slices"). 15 bounded slices
(R04.1-R04.8 rule, R04.9-R04.12 search, R04.13-R04.15 measurement), each
citing `r01-fixtures.md` or `r04-search-quality.md` where a concrete design
already exists, and explicitly marked **needs a decision first** where R04.4
through R04.7 depend on a decision-table row R01 did not resolve (only four
rows were in R01's scope: share migration, recipe amount storage, the
R02-scoped cooking-adjustment slice, legacy plan editing — "Budget before
offers," "Dates and expiry," and "Locks and changed rules" remain open,
tagged R04/R04-R05, and are flagged rather than guessed at). Dependencies
between slices recorded (e.g. R04.14's work-limit number cannot be chosen
before R04.13 produces measured data). No code changed.

**All five R01 deliverables are now done**: baseline/legacy-step-ID
reconciliation (no drift found), the four blocking decisions resolved (plus
one follow-up gap closed during understanding-check), `r01-fixtures.md`
(portions/yield/nutrition/pantry-exclusions/locks/legacy-plans/stale-revisions,
with proposed fixes for the two confirmed bugs added at the user's request),
`r04-search-quality.md` (severity-aware ordering, four comparison fixtures,
work-limit measurement methodology), and the R04 slice breakdown above.
Marked `implemented—awaiting review` rather than `complete`, per this
project's own rule that a step's status reflects verified evidence, and the
user has not yet reviewed the full set of R01 changes together.

**Next step:** user review of R01's five deliverables together, then R04.1
(the first, decision-free rule slice) whenever the user asks to resume
implementation.

## R02 — Reliable quantities, nutrition and recipe writing — `in progress`

R02 bundles several distinct pieces of work (nutrition status, scaling
centralization, ingredient-line writing/editing, archiving/versioning), so it
was broken into slices in `build-plan.md`'s new "R02 implementation slices"
subsection before implementing, the same way R01 broke down R04.

**R02.1 — Nutrition status and unit-compatible computability — `complete`
(2026-09-21).** Implemented `r01-fixtures.md §3`'s design: `summarizeKcal`
(`api/src/services/nutrition.ts`) returns `{ kcalTotal, status: "complete" |
"partial" | "unknown" }` instead of a bare total.

Found while implementing, not in `r01-fixtures.md`: a line only counts as
computable if the ingredient's `baseUnit === "g"` — `kcalPer100g` is defined
per 100g, but `recipe_ingredients.amountBase` can be `g`, `ml`, or `pcs`
(`shared/src/recipes.ts`'s `BASE_UNITS`), and the prior code multiplied every
line's `amountBase` by `kcalPer100g` regardless of unit, silently treating
`ml`/`pcs` amounts as grams. This directly matches R02's own verification
line ("ml/pcs are not interpreted as grams"), so it was fixed in this slice
rather than opened as a separate one. `findIngredientLinesForRecipe`/
`findIngredientLinesForAllRecipes` (`api/src/repositories/
recipeIngredients.ts`) now also select `baseUnit`.

Planning eligibility (`buildPlannerRecipes` in `api/src/services/
plan-inputs.ts`) now requires `status === "complete"` before treating a
recipe's calories as usable — a `"partial"` recipe no longer silently passes
as a complete calorie estimate, per the plan's own rule. Recipe display
(`api/src/services/recipes.ts`, `listRecipes`/`getRecipe`) keeps showing the
computed number when `status` is `"partial"` (still shown, just based on
fewer lines) and only nulls `kcalPerServing` for `"unknown"` — the frontend
(`RecipesPage.tsx`) already renders a null `kcalPerServing` as "—", so no web
change was needed this slice.

`api/tests/nutrition.test.ts` rewritten per `r01-fixtures.md`'s explicit
instruction: the "sums only the computable lines, skipping the rest" test's
expectation changed from `{ kcalTotal: 330 }` to `{ kcalTotal: 330, status:
"partial" }` (deliberately, not a regression — it previously encoded the gap
R02 exists to close); its siblings gained `status` assertions; three new
tests cover the `ml`/`pcs`/mixed-unit cases. No existing `recipes.test.ts`
assertions needed changes (they use `toMatchObject`, which ignores the added
`status` field, and none touch a non-gram ingredient).

Verified 2026-09-21: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing `web` warnings, unrelated); `npm run test -w api`
→ 7 files / 84 tests pass (was 81 — 3 new nutrition tests); `npm run test -w
web` → 20 files / 43 tests pass, unchanged (backend-only slice).

Not yet done: R02.2 (scaling centralization) through R02.5 (archiving,
needs a decision first) — see `build-plan.md`.

**R02.2 — Centralize yield/servings scaling — `complete`
(2026-09-21).** Implemented `r01-fixtures.md §2`'s design, with one
deviation from its own tentative suggestion: the doc suggested
`api/src/lib/units.ts` or a new `api/src/lib/scaling.ts` as "likely"
locations, but one of the two duplicated call sites
(`web/src/features/week/deriveMealDetail.ts`) is in the `web` workspace,
which cannot import from `api/src/lib` (only a type-only `AppType` import
crosses that boundary, per `architecture.md`'s contracts-boundary note). A
function placed in `api/src/lib` could not actually be the *one* function
both sides call. Added `scaleToServings(amount, baseServings, totalServings)`
to a new `shared/src/scaling.ts` instead (exported via `shared/src/index.ts`)
— `shared` already exports plain values/consts alongside Zod schemas
(`MEAL_SLOTS`, `PLANNER_VERSION`), so this isn't a new kind of export from
that package, and both `api` and `web` already depend on it.

Replaced `validateWeeklyBudget`'s inline `recipe.costCzk * (totalServings /
recipe.baseServings)` (`api/src/services/planner.ts`) and
`deriveMealDetail.ts`'s `ingredientRow` ratio calculation with calls to
`scaleToServings`. No behavior change intended: `deriveMealDetail.ts` keeps
its existing guard (skip scaling, show the recipe's raw `displayAmount`, when
`baseServings` is falsy/null or `totalServings <= 0` — the zero-guard fixed
during step 31's manual verification) and its existing 1-decimal display
rounding; only the division itself now goes through the shared function.

Added `api/tests/scaling.test.ts` (3 tests, no Docker needed — pure
function): the exact `r01-fixtures.md §2` worked example (200g rice,
baseServings 4, totalServings 3.25 → 162.5g), an identity case, and the
`validateWeeklyBudget` docblock's own worked cost example (400 Kč, 4
servings, 2.25 needed → 225 Kč). No test added in `web` for
`deriveMealDetail.ts`'s call site — it has no existing test file (no
Storybook story either, per step 31's note that query-owning containers rely
on manual verification here), and adding one is a scope expansion beyond
this reuse-only slice, not something this slice's "no behavior change"
framing calls for.

Verified 2026-09-21: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing `web` warnings, unrelated).
**`npm run test -w web` → 20 files / 43 tests pass, unchanged.**

**`npm run test -w api` — re-verified 2026-09-21, no longer blocked.** Docker
Desktop's daemon was hung again this session (socket present, every request
timed out — same symptom as before); quit and relaunched it, then confirmed
the daemon actually answered (`curl --unix-socket .../docker.sock
.../v1.41/info` returning 200) before retrying, rather than assuming a
relaunch fixed it. `npm run test -w api` → **8 files / 87 tests pass** (was
7/84 before `scaling.test.ts`'s 3 tests): `scaling.test.ts` and the existing
`planner.test.ts`/`validateWeeklyBudget` assertions all pass unchanged,
confirming the refactor's "no behavior change" intent. Re-ran
`npm run typecheck` and `npm run lint` (both api+web) after the restart —
still clean, same 2 pre-existing unrelated `web` warnings.

R02.2 is now fully verified — status is `complete`, not
`implemented—awaiting review`.

**Next step:** R02.3, R02.4, or R02.5 (needs a decision first) per the
user's choice.

**R02.3 — Ingredient-line writing and editing — `in progress`.** Broken
into three further sub-slices before implementing, since "add/edit/remove
ingredient lines (API + UI)" alone is too large for one diff: R02.3a
(ingredients API), R02.3b (recipe ingredient-line CRUD), R02.3c (frontend
picker + line editor). Decision made with the user first: creating a
brand-new ingredient (name/baseUnit/optional kcal-macros) inline while
editing a recipe is in scope, not deferred — R02.3a's `POST /api/ingredients`
exists for this reason, not just as a read-side prerequisite for a picker.

**R02.3a — Ingredients API — `complete` (2026-09-21).** New
`GET /api/ingredients` (list) and `POST /api/ingredients` (create: name,
baseUnit, optional kcalPer100g/proteinPer100g/carbsPer100g/fatPer100g) —
previously ingredients only entered the database via test fixtures and
`api/scripts/seed-aktin.ts`, with no API at all. `shared/src/ingredients.ts`
(new `createIngredientSchema`); `api/src/repositories/ingredients.ts`,
`api/src/services/ingredients.ts`, `api/src/routes/ingredients.ts` (new,
mirroring `recipes.ts`'s list/create/409-on-duplicate pattern exactly —
`ingredients.name` is already unique-constrained, same as `recipes.title`);
`DuplicateIngredientNameError` added to `api/src/lib/errors.ts`; mounted at
`/api/ingredients` in `api/src/index.ts`. No schema/migration change — the
`ingredients` table already had every column this needed. No UI this
sub-slice (R02.3c).

`api/tests/ingredients.test.ts` (new, 7 tests): empty list, seeded list,
create with nutrition data, create with none (nulls, not invented), 409 on
duplicate name, 422 on invalid `baseUnit`, 422 on missing name.

Verified 2026-09-21: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing unrelated `web` warnings); `npm run test -w api`
→ 9 files / 94 tests pass (was 8/87 — 7 new).

**R02.3b — Recipe ingredient-line CRUD — `complete` (2026-09-21).** Added
`POST /api/recipes/:id/ingredients`, `PUT /api/recipes/:id/ingredients/:lineId`,
`DELETE /api/recipes/:id/ingredients/:lineId`. No schema/migration needed —
`recipe_ingredients` already had every column this required.

Design decision made with the user before implementing: `PUT` is a full
replace, not a partial update — the body must include every field
(`ingredientId`, `amountBase`, `displayAmount`, `displayUnit`, `isOptional`),
and omitting an amount field clears it to `null` rather than leaving the
existing value untouched. This makes "missing amounts stay editable, never
invented" (R02's own text) concrete: a caller can deliberately blank an
amount back to unknown through the same endpoint used to set it.

`shared/src/recipeIngredients.ts` (new, `recipeIngredientLineSchema`, reused
for both create and full-replace update since they're the same shape);
`api/src/lib/params.ts` (`recipeIngredientLineParamSchema`, two-key
`{id, lineId}`); `api/src/lib/errors.ts`
(`RecipeIngredientLineNotFoundError`); `api/src/repositories/
recipeIngredients.ts` (`findRecipeIngredientLineById`,
`insertRecipeIngredientLine`, `updateRecipeIngredientLine`,
`deleteRecipeIngredientLine` — FK-violation-on-`ingredientId` maps to
`IngredientNotFoundError`, following the exact pattern already used by
`pantryItems.ts`'s `insertPantryItem`); `api/src/services/
recipeIngredients.ts` (new — `addIngredientLine` checks the recipe exists
first, since an FK violation on `recipeId` alone isn't distinguishable from
one on `ingredientId` by the existing catch; `editIngredientLine`/
`removeIngredientLine` rely on the `{id, lineId}` `WHERE` clause matching
nothing as the not-found signal, which also correctly 404s a line requested
under the wrong recipe id, not just a nonexistent one); `api/src/routes/
recipes.ts` extended with the three nested endpoints, mapping
`RecipeNotFoundError`/`IngredientNotFoundError`/
`RecipeIngredientLineNotFoundError` to 404, same convention as the existing
recipe/ingredient/pantry routes.

`api/tests/recipeIngredients.test.ts` (new, 12 tests): add with/without an
amount, 404 on a nonexistent recipe or ingredient, 422 on a missing
`ingredientId`; edit replaces fields, edit clears an omitted amount to
`null`, edit 404s for a nonexistent line and for a line under the wrong
recipe id; delete removes the line (204, confirmed via a follow-up `GET`)
and 404s for a nonexistent line.

Verified 2026-09-21: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing unrelated `web` warnings); `npm run test -w api`
→ 10 files / 106 tests pass (was 9/94 — 12 new, no regressions).

**R02.3c — Frontend ingredient picker + line editor — `in progress`.** Too
large for one diff (edit/remove hooks, list/create-ingredient hooks, line
editor UI, and the add-line picker UI are each their own slice), so broken
down the same way R02.3 itself was, before implementing.

**R02.3c-1 — Edit/remove ingredient-line hooks — `complete` (2026-09-21).**
`web/src/features/recipes/useRecipes.ts` gained `useEditIngredientLine`
(`PUT /api/recipes/:id/ingredients/:lineId`) and `useRemoveIngredientLine`
(`DELETE .../:lineId`, via the existing `unwrapEmptyResponse` helper for the
204 response). Both invalidate `recipesKeys.detail(recipeId)` on success
rather than writing the mutation response into the cache directly — the
route's response is the raw repository row (no `ingredientName`), while the
cached recipe detail is the joined view `RecipeDetail.tsx` renders, so an
invalidate-and-refetch is the correct match for that shape gap, not a
`setQueryData` merge. No UI wired yet — `RecipeDetail.tsx`'s ingredient list
is still read-only; that's R02.3c-2. No new test file: these are thin
TanStack Query wrappers with nothing to render yet, matching this file's
existing pattern (`useCreateRecipe`/`useRecipe` etc. have no dedicated test
either — query hooks here are verified through the UI that calls them).

Verified 2026-09-21: `npm run typecheck -w web` clean; `npm run lint -w web`
clean (same 2 pre-existing warnings, unrelated, in `Sidebar.tsx`/`Table.tsx`).
`npm run test -w web` and api tests not re-run — no test-relevant or
api-side change in this slice.

**R02.3c-2 — Remove button on ingredient lines — `implemented—awaiting
review` (2026-09-21).** Narrowed further from the originally planned
"edit + remove" — a full react-hook-form row (per `MemberTargetRow.tsx`'s
always-editable-row pattern) plus a remove button together would exceed
`CLAUDE.md`'s ~40-line step cap, so remove came first, matching
`PantryPage.tsx`'s existing single-click `CloseButton` removal pattern (no
confirmation dialog, consistent with that precedent). Inline amount/unit
editing is deferred to the next slice.

`RecipeDetail.tsx`: each ingredient `<li>` is now a flex row with the label
and a `CloseButton` (`aria-label="Remove {ingredientName}"`, disabled while
`removeLine.isPending`) calling `useRemoveIngredientLine().mutate({recipeId:
id, lineId: line.id})`. ~10 lines of functional diff.

Verified 2026-09-21: `npm run typecheck -w web` clean; `npm run lint -w web`
clean (same 2 pre-existing unrelated warnings); `npm run test -w web` → 20
files / 43 tests pass, unchanged (`RecipeDetail.tsx` has no Storybook story,
matching its established convention of manual-only verification for
query-owning containers). Manual browser verification (dev api+web servers
against dev Postgres, Playwright driving real Chromium since `chromium-cli`
wasn't available in this environment): opened Chia puding's detail rail,
clicked remove on "Řecký jogurt" — the line disappeared from the rail
without a page reload, no console errors, and a direct
`GET /api/recipes/1` afterward confirmed the line was actually gone
server-side (2 remaining ingredients). Seed data was inadvertently modified
during verification — see below — and has been restored.

**Data-restoration note:** the first restoration attempt used the deleted
*line's* id (27) as the `ingredientId` in the re-add request, which silently
added the wrong ingredient ("Sýr") — line ids and ingredient ids are
different id spaces and the recipe-detail response doesn't expose
`ingredientId` directly, only `ingredientName`. Caught by inspecting the
response instead of assuming success; deleted the wrong line, looked up
"Řecký jogurt"'s real ingredient id (19) via `GET /api/ingredients`, and
re-added with the correct id. Final `kcalTotal` (370.3) and `status`
("complete") verified matching the pre-verification response; the restored
line has a new database id (283, was 27) but that's an
internal detail, not user-visible or referenced elsewhere.

**R02.3c-3 — Inline amount/unit/optional editing for existing ingredient
lines — `implemented—awaiting review` (2026-09-21).** Wires up
`useEditIngredientLine` (added in R02.3c-1, unused until now).

Blocker found while orienting, fixed as part of this slice: `PUT
/api/recipes/:id/ingredients/:lineId` is a full replace requiring
`ingredientId`, but `GET /api/recipes/:id`'s ingredient lines never exposed
it (only `ingredientName`) — the exact gap R02.3c-2's data-restoration note
flagged. Added `ingredientId` to `findIngredientLinesForRecipe`
(`api/src/repositories/recipeIngredients.ts`) and `getRecipe`'s ingredient
mapping (`api/src/services/recipes.ts`); no schema change, the column was
already selected for the join. Updated the one test asserting the exact
ingredient-line response shape (`api/tests/recipes.test.ts`).

Scope decision made without a fresh user question (documented here for
review): this slice edits only `displayAmount`/`displayUnit`/`isOptional`
— the user-facing pair plus the optional flag — not `amountBase` (the
normalized quantity nutrition/scaling actually reads) or which ingredient a
line points to. Editing `amountBase` correctly needs a unit-aware
picker against the ingredient's `baseUnit`, which is separate scope (a
future picker slice, same shape as R02.3c-1's still-partly-unused
ingredient list). Since the PUT is a full replace, the edit form still
must submit `ingredientId`/`amountBase` on every save or silently null
them out; `IngredientLineRow`'s `useForm` `defaultValues` carries both
through unedited (react-hook-form keeps unregistered `defaultValues` keys
in the submitted data), verified in the browser check below (`amountBase`
stayed `150` after only `displayAmount`/`isOptional` were changed).

New `web/src/features/recipes/IngredientLineRow.tsx` — presentational,
mirrors `MemberTargetRow.tsx`'s always-editable-row pattern (a per-row
`<form>`, react-hook-form + `zodResolver(recipeIngredientLineSchema)`,
explicit ghost Save button) rather than inlining a form per `<li>` inside
`RecipeDetail.tsx`, matching that file's existing row-component precedent.
`RecipeDetail.tsx` now owns `useEditIngredientLine` alongside its existing
`useRemoveIngredientLine`, passing `onSave`/`isSaving`/`error` down —
same ownership split `HouseholdPage.tsx`/`MemberTargetRow.tsx` already use.
Removed the now-redundant `ingredientLabel` formatting helper (the row's
inputs display the amount/unit directly).

`web/src/stories/IngredientLineRow.stories.tsx` (new, 5 stories: default,
unknown amount, optional, saving, save-failed) — required a `decorators`
wrapper (`<ul>{Story()}</ul>`) since the component renders an `<li>`;
without it `@storybook/addon-a11y`'s axe check failed ("list item does not
have a `<ul>`/`<ol>` parent"), a real accessibility rule, not a test
artifact.

Verified 2026-09-21: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing unrelated `web` warnings); `npm run format --
--check` clean on touched files. `npm run test -w api` → 10 files / 111
tests pass (was 106 — the exact-shape test now also asserts `ingredientId`,
no other count change). `npm run test -w web` → 21 files / 48 tests pass
(was 20/43 — 5 new stories, no a11y violations, no console errors). Manual
browser verification (dev api+web servers against dev Postgres via `npm
run dev:all`, Playwright driving real headless Chromium — `chromium-cli`
still unavailable in this environment, same as prior manual checks):
opened Chia puding's detail rail, edited "Řecký jogurt"'s amount 150→175,
unit unchanged "g", checked "optional"; saved; a follow-up
`GET /api/recipes/1` confirmed `displayAmount: 175`, `isOptional: true`,
and — the key correctness check — `amountBase` unchanged at `150` and
`ingredientId` unchanged at `19`, not nulled out by the full-replace PUT.
No console errors during the flow. Seed data was then restored to its
original values (`displayAmount: 150`, `isOptional: false`) via a direct
`PUT`, confirmed with a follow-up `GET`.

**`/review` found four issues after this commit, all fixed (2026-09-21):**

Important: (1) `RecipeDetail.tsx` stopped showing `removeLine`'s error
after the refactor into `IngredientLineRow` — the old list-level
`ErrorState` for failed removes was dropped and never replaced;
`IngredientLineRow`'s `error` prop now also falls back to `removeLine`'s
error, not just `editLine`'s. (2) `IngredientLineRow`'s `useForm`
`defaultValues` captured `line.ingredientId`/`line.amountBase` once at
mount and never resynced — harmless today (nothing else writes those
fields yet) but a silent full-replace clobber waiting to happen the moment
R02.3c-4's picker adds a second writer, since the row is keyed by `line.id`
and never remounts. Fixed by merging the *current*
`line.ingredientId`/`line.amountBase` into the submitted payload inside the
submit handler, instead of trusting the form's captured defaults — `line`
is always fresh (a normal prop), so this can't go stale the way the hidden
`defaultValues` could. Deliberately not fixed via `reset()`-on-prop-change,
which would also wipe any in-progress edit on this row triggered by an
unrelated sibling row's save (the shared `recipesKeys.detail` invalidation
refetches the whole list).

Minor: (3) the two `Input`s had no `aria-invalid`/`aria-describedby` wiring
to the error message, unlike `MemberTargetRow`'s equivalent fields — added
both, pointing at a new optional `id` prop on the shared `ErrorState`
primitive (`web/src/shared/ui/ErrorState.tsx`) so the error box itself can
be the `aria-describedby` target. (4) no test locked in the payload-merge
behavior fix (2) depends on — added
`PreservesLatestValuesAfterExternalUpdate` to
`IngredientLineRow.stories.tsx`, a `play`-function story using a small
local harness component that changes the `line` prop after mount (without
remounting, matching how a real `recipesKeys.detail` refetch behaves) and
asserts the submitted payload reflects the new value, not the mount-time
one. Confirmed this test actually catches (2)'s bug: temporarily reverted
the submit-handler fix, reran — the new test failed with the exact
symptom (`ingredientId`/`amountBase` from the stale snapshot, not the
updated prop) — then restored the fix and reran clean.

Re-verified: `npm run typecheck`/`lint -w web` clean; `npm run test -w
web` → 21 files / 50 tests (was 48 — the merge-payload story from the
first review pass plus this external-update story); `npx prettier --check`
clean on all touched files.

**Not yet done, left for later slices:** editing `amountBase` directly, or
reassigning a line's ingredient — both need the unit-aware picker this
slice deliberately deferred; no confirmation dialog or optimistic
update/rollback on save (same minimal-mutation pattern R02.3c-2 used for
remove); no keyboard-specific test beyond the a11y check the new stories
already run.

**R02.3c-4 — Ingredient list + add-line hooks — `complete` (2026-09-21).**
User chose to continue with the add-line picker UI next; narrowed further
before implementing, same reasoning R02.3c-1 used to split hooks from UI —
a list hook, an add-line mutation hook, and a new form component (with a
`<select>` pattern not used anywhere else in `recipes` yet, plus an
empty-ingredients state) together would clear CLAUDE.md's ~40-line step cap.
This slice is hooks only, no UI change.

New `web/src/features/recipes/useIngredients.ts` — `useIngredients()`
(`GET /api/ingredients`), typed via `InferResponseType`, same shape as
`recipeCatalog.ts`'s pattern. `web/src/features/recipes/useRecipes.ts`
gained `useAddIngredientLine()` (`POST /api/recipes/:id/ingredients`),
mirroring `useEditIngredientLine`'s structure exactly: invalidates
`recipesKeys.detail(recipeId)` on success rather than writing the mutation
response into the cache, for the same reason as the edit/remove hooks — the
add response is the raw repository row, not the joined `ingredientName`
shape the cached detail uses.

No UI wired yet — `RecipeDetail.tsx` unchanged. No new test file, matching
R02.3c-1's own precedent: thin TanStack Query wrappers with nothing to
render yet.

Verified 2026-09-21: `npm run typecheck -w web` clean; `npm run lint -w web`
clean (same 2 pre-existing unrelated warnings in `Table.tsx`/`Sidebar.tsx`);
`npx prettier --check` clean on both touched files. `npm run test -w web`
and api tests not re-run — no test-relevant or api-side change in this
slice, same rationale R02.3c-1 gave.

**R02.3c-5 — Add-line form UI — `implemented—awaiting review` (2026-09-21).**
Finishes what R02.3c-4 was originally scoped to include. New
`web/src/features/recipes/AddIngredientLineForm.tsx` — presentational, same
family as `IngredientLineRow.tsx`/`MemberTargetRow.tsx` (a `<form>` inside a
trailing `<li>`, react-hook-form + `zodResolver(recipeIngredientLineSchema)`,
explicit ghost Add button), not a page-level "create" form like
`RecipeForm.tsx` — chosen because this component only mounts once its
`ingredients` prop is a known non-empty list (see below), which a
page-level form pattern doesn't need but this one relies on for its
`defaultValues`. Submits only `ingredientId`/`displayAmount`/`displayUnit`/
`isOptional` — never `amountBase` — matching R02.3c-3's same deliberate
scope limit ("missing amounts stay editable, never invented"); a unit-aware
`amountBase` picker stays out of scope for both edit and add.

`RecipeDetail.tsx` now also owns `useIngredients()` and the new
`useAddIngredientLine()` (added in R02.3c-4), passing the loaded list down.
The "Ingredients" section header is no longer gated on
`recipe.ingredients.length > 0` — a recipe with zero lines still needs
somewhere to add its first one. Three states handled inline in the list:
an ingredients-list load error (`ErrorState`, in its own `<li>` — a bare
`<div>` directly inside a `<ul>` is invalid list markup, the same class of
a11y issue `IngredientLineRow.stories.tsx`'s decorator already worked
around), an empty ingredient catalog (a one-line `<li>` fallback text, no
inline "create ingredient" — deliberately deferred, see below), and the
normal case (the form itself).

Bug caught by the Storybook interaction test, fixed before it shipped:
`handleSubmit(onAdd)` passed straight through calls `onAdd(data, event)` —
react-hook-form's `SubmitHandler` always receives the DOM event as a second
argument. `IngredientLineRow.tsx`'s existing submit handler already avoids
this by wrapping in an inline arrow (`handleSubmit((data) => onSave(...))`);
`AddIngredientLineForm.tsx` now does the same
(`handleSubmit((data) => onAdd(data))`), so `useAddIngredientLine`'s
`data` argument can't end up being a `SyntheticEvent` instead of the form
payload.

`web/src/stories/AddIngredientLineForm.stories.tsx` (new, 4 stories:
default, adding, add-failed, and a `play`-function story that selects an
ingredient, fills amount/unit, submits, and asserts the exact payload —
including `isOptional: false`, since an unchecked checkbox is submitted as
`false`, not omitted, unlike the optional text/number fields which really
do become `undefined` via `emptyToUndefinedNumber`/`emptyToUndefined`,
reused here from `shared/lib/formValues.ts` rather than re-inlined the way
`IngredientLineRow.tsx` did it).

Verified 2026-09-21: `npm run typecheck -w web` clean; `npm run lint -w web`
clean (same 2 pre-existing unrelated warnings); `npx prettier --check`
clean on all touched files. `npm run test -w web` → 22 files / 54 tests
pass (was 21/53 — 4 new stories; the interaction-test story caught the
`onAdd(data, event)` bug on the first run, failed with the extra
`SyntheticBaseEvent` argument, then passed clean after the arrow-wrap fix).
Manual browser verification (`npm run dev:all` against dev Postgres,
Playwright driving real headless Chromium — `chromium-cli` still
unavailable in this environment): opened Chia puding's detail rail, used
the add-line form to add "Skořice" (15 g) — the new line appeared in the
list immediately (row-state bar showing "check", since its `amountBase` is
correctly left `null`), no console errors, and a follow-up
`GET /api/recipes/1` confirmed the line server-side with `amountBase: null`
(not invented) and `status` correctly dropping from `"complete"` to
`"partial"`. Seed data restored via `DELETE` on the added line, confirmed
`kcalTotal`/`status` matched the pre-verification response.

**Correction and fix (2026-09-21, found and fixed via `/review`):** this
entry originally claimed "no reset-after-add (the form keeps its last
values...)" — that was inaccurate: `handleAdd` called `reset()` with no
arguments after a successful add, which reverted every field, including
`ingredientId`, to the `defaultValues` captured at mount
(`ingredients[0]?.id`), not the ingredient the user just picked. Fixed by
calling `reset()` (clearing amount/unit/optional as before) followed by
`setValue("ingredientId", data.ingredientId)`, so the picker keeps
showing the just-used ingredient — adding several lines of the same
ingredient in a row now only requires re-entering the amount/unit each
time, matching the originally intended design. (`reset({ ingredientId })`
alone does not work here — passing partial values to RHF's `reset` merges
with, rather than clears, the omitted fields, which was verified by
running the test before landing on the two-call fix.) The Storybook
`SubmitsSelectedIngredient` play test now also asserts the ingredient
selection survives a submit, and was confirmed to fail without the fix.
Two minor findings from the same review pass were also fixed: the "+ New
ingredient" toggle now clears `newName` on cancel, and `RecipeDetail.tsx`
shows a `Skeleton` row while `useIngredients()` is loading instead of
rendering nothing.

**Not yet done, left for later slices:** inline "create a new ingredient"
from this form (R02.3a's `POST /api/ingredients` exists for this, still
unused from the UI); no empty-ingredient-catalog affordance beyond the
fallback text, since inline-create is what would actually resolve that
state.

**R02.3c-6 — Create-ingredient hook — `complete` (2026-09-21).** User chose
to continue with inline ingredient creation; narrowed to hooks-before-UI
again, same reasoning as R02.3c-1/R02.3c-4 — the toggle UI, two new inputs
(name, base unit), and chaining two mutations (create ingredient, then add
the line with its new id) together would clear the step-size cap and mix
"add a mutation" with "build a two-step form flow" that doesn't exist
elsewhere in this codebase yet.

`web/src/features/recipes/useIngredients.ts` gained `useCreateIngredient()`
(`POST /api/ingredients`), mirroring `useCreateRecipe`'s shape: invalidates
`ingredientsKeys.list` on success (so the new ingredient appears in the
picker) and resolves with the created `Ingredient`, so a caller can chain
straight into `useAddIngredientLine` without waiting on a refetch. No UI
change yet — `AddIngredientLineForm.tsx` unchanged. No new test file, same
rationale as every other hooks-only slice: a thin TanStack Query wrapper
with nothing to render yet.

Verified 2026-09-21: `npm run typecheck -w web` clean; `npm run lint -w web`
clean (same 2 pre-existing unrelated warnings); `npx prettier --check`
clean. `npm run test -w web` not re-run — no test-relevant change.

**R02.3c-7 — Wire inline ingredient creation into the add-line form —
`implemented—awaiting review` (2026-09-21).** Closes the last gap left open
by R02.3c-5/R02.3a: creating a brand-new ingredient from the recipe detail
rail itself, not just picking an existing one.

Went through two rejected designs before landing on this one, both worth
recording since they're real traps: (1) a single form validated as one
`recipeIngredientLineSchema` object, with `ingredientId` defaulting to
`ingredients[0].id` as a throwaway placeholder while in "new ingredient"
mode, replaced by the real id only after creation succeeded — rejected for
carrying a meaningless value through validation just to satisfy Zod.
(2) the same shape but with `useCreateIngredient` owned inside
`AddIngredientLineForm` itself — rejected for breaking the ownership split
every other row/form in this feature uses (`RecipeDetail.tsx` owns every
mutation; presentational components only get callbacks and state as props).

Final design ("create-then-select"): `RecipeDetail.tsx` now also owns
`useCreateIngredient()`. `AddIngredientLineForm` gained an `isNew` toggle
(a plain `useState`, not part of the react-hook-form-managed fields) that
swaps the ingredient `<select>` for name/base-unit inputs with their own
"Create" button — a separate `type="button"` action, not the form's
submit. Clicking it calls the new `onCreateIngredient` prop
(`createIngredient.mutateAsync`, passed down from the container); on
success the form calls `setValue("ingredientId", ingredient.id)` and flips
back to the normal picker — so by the time the quantity fields' "Add"
button can even be clicked, `ingredientId` is always a real id, never a
placeholder. The main form's `ingredientId` field is never touched or
validated while `isNew` is true, since "Add" is disabled during that state.

A small correctness detail: the just-created ingredient might not yet be in
the `ingredients` prop when `setValue` runs — `useCreateIngredient`'s
`invalidateQueries` triggers a refetch, but that refetch is async and the
prop update lands after this render. `AddIngredientLineForm` holds the
just-created ingredient in one extra bit of local state and merges it into
the `<select>`'s options (deduped by id) until the real list catches up, so
the select always has a matching `<option>` for the value being set.

`RecipeDetail.tsx`'s ingredients section no longer needs the
zero-ingredients-catalog fallback text from R02.3c-5 — the form itself is
now a valid empty-catalog affordance, so it's rendered whenever `ingredients`
has loaded, even as `[]`. `AddIngredientLineForm`'s `defaultValues` uses
`ingredients[0]?.id` (`undefined` when the catalog is empty) instead of the
non-null assertion from before, since mounting with zero ingredients is now
a real, reachable state.

`AddIngredientLineForm.stories.tsx` gained a `CreatesNewIngredient`
interaction story: clicks "+ New ingredient", fills a name, clicks
"Create", and asserts `onCreateIngredient` was called with
`{ name, baseUnit }` and that the form collapsed back to the picker with
the new ingredient genuinely selected (`toHaveValue("99")` against the
story's stubbed `onCreateIngredient` result) — not a placeholder.

Verified 2026-09-21: `npm run typecheck -w web` clean; `npm run lint -w web`
clean (same 2 pre-existing unrelated warnings); `npx prettier --check`
clean on all touched files. `npm run test -w web` → 22 files / 55 tests
pass (was 54 — the new interaction story). Manual browser verification
(`npm run dev:all` against dev Postgres, Playwright driving real headless
Chromium — a stray dev server left running from an earlier session had
taken port 5173, which silently pushed this run's web server to 5174 and
broke the API's CORS allow-list; caught via a CORS console error, not a
guess, then fixed by killing the stray process and restarting on the
correct port): opened Chia puding's detail rail, clicked "+ New
ingredient", created "Verify Cinnamon XYZ" (g), confirmed it appeared
pre-selected in the now-restored picker, added it as a 2 g line — the line
appeared immediately, no console errors, and a follow-up
`GET /api/recipes/1` confirmed the line server-side (`ingredientId: 135`,
`amountBase: null`, `status` correctly dropping to `"partial"`). No
`DELETE /api/ingredients/:id` route exists (R02.3a only added list/create),
so cleanup for the test ingredient row went through direct SQL against the
dev container after confirming by id and name that it was exactly the test
row and nothing else referenced it; the test line itself was removed
through the existing `DELETE /api/recipes/:id/ingredients/:lineId` route.
Confirmed restored: `kcalTotal`/`status` back to their pre-verification
values and the ingredient catalog back to 134 rows.

**Not yet done:** no way to add macros (`kcalPer100g` etc.) to a newly
created ingredient from this form — only `name`/`baseUnit`, matching
`createIngredientSchema`'s only-two-required-fields shape; a new
ingredient created this way starts nutritionally unknown, same as any
ingredient with no macros today. No `DELETE /api/ingredients/:id` route
(out of scope for R02.3; noted here only because manual verification
needed it and had to fall back to direct SQL).

**Next step:** R02.4 (yield editing) or R02.5 (archiving, needs a decision
first), per the user's choice — this closes out R02.3.

**R02.4 — Yield editing — `in progress`.** User chose to continue with R02.4
over R02.5 (still blocked on the snapshot-shape decision). Split into API
first, UI after, same reasoning as every R02.3 hooks-then-UI sub-slice.

**R02.4a — API endpoint to edit a recipe's `servings` — `implemented—awaiting
review` (2026-09-22).** New `PUT /api/recipes/:id` accepting `{ servings }`
only — mirrors `PUT /household/members/:id`'s single-field
(`dinnerCalorieTarget`) pattern exactly, not a general recipe-edit endpoint.
No reinterpretation of ingredient lines: `amountBase`/`displayAmount` are
never touched, per R01's "Recipe amount storage" resolution — every
downstream calorie/cost figure already reads `recipe.servings` live via
R02.2's `scaleToServings`/`computeKcalPerServing`, so changing the column is
the entire fix.

`shared/src/recipes.ts` (`updateRecipeServingsSchema`: `servings` required,
positive integer); `api/src/repositories/recipes.ts`
(`updateRecipeServings`); `api/src/services/recipes.ts`
(`editRecipeServings`, 404s via the existing `RecipeNotFoundError` if the
`UPDATE ... RETURNING` matches no row); `api/src/routes/recipes.ts` (new
`PUT /:id`, same `idParamSchema`/`zValidator` pattern as every other route
here).

`api/tests/recipes.test.ts` (+4 tests): servings persists and is reflected
in a follow-up `GET`; changing servings 2→4 rescales `kcalPerServing`
(165→82.5 for a fixed 330 kcal total) while the ingredient line's
`amountBase` stays unchanged at 200 — the concrete proof this doesn't
reinterpret source quantities; 404 for a nonexistent recipe; 422 for
`servings: 0`.

Verified 2026-09-22: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing unrelated `web` warnings); `npx prettier --check`
clean on all touched files. `npm run test -w api` → 10 files / 115 tests
pass (was 111 — 4 new, no regressions). `npm run test -w web` not re-run —
no web-side change this sub-slice, same rationale as R02.3c-1/c-4/c-6. No
manual browser check — this sub-slice has no UI; the integration test
already exercises the real Postgres path R02.4b's UI will call.

**Not yet done:** R02.4b (frontend hook + inline UI to edit servings from
`RecipeDetail.tsx`'s existing read-only "Servings" `Stat`).

**R02.4b — Frontend hook + inline UI to edit servings — `implemented—awaiting
review` (2026-09-22).** Wires up R02.4a's `PUT /api/recipes/:id`.

`web/src/features/recipes/useRecipes.ts` gained `useEditRecipeServings()`,
same shape as `useEditIngredientLine`: invalidates `recipesKeys.detail(id)`
on success rather than writing the response into cache, since `PUT /:id`
returns the raw `recipes` row (no `kcalPerServing`, no `ingredients`) — the
same shape gap R02.3c-1 already found for ingredient-line mutations.

New `web/src/features/recipes/ServingsField.tsx` — presentational,
always-editable-row pattern (mirrors `MemberTargetRow.tsx`: a `<form>`,
react-hook-form + `zodResolver(updateRecipeServingsSchema)`, ghost Save
button). `RecipeDetail.tsx` now owns `useEditRecipeServings()` and replaces
the static `Stat label="Servings"` with `ServingsField`, reusing the
existing `firstMutationError` helper for its error prop, same as the
add-line form's error wiring.

Scope decision, not asked about separately: this slice only covers editing
servings when the "Portion" section already renders (`weightG` or
`servings` non-null) — a recipe with neither has no way to *set* an initial
servings value through this control. `weightG` editing and adding servings
to a portion-less recipe are both out of scope, matching R02.4a's own
"editing, not reinterpreting" framing.

`web/src/stories/ServingsField.stories.tsx` (new, 4 stories: default,
saving, save-failed, and a `play`-function story asserting the submitted
payload is the edited number).

Verified 2026-09-22: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing unrelated `web` warnings); `npx prettier --check`
clean on all touched files. `npm run test -w web` → 23 files / 59 tests
pass (was 22/55 — 4 new stories, no a11y violations). `npm run test -w api`
not re-run — no api-side change this sub-slice. Manual browser verification
(`npm run dev:all` against dev Postgres, a scratch-installed Playwright
driving real headless Chromium since `chromium-cli` remains unavailable in
this environment): opened Chia puding's detail rail (`/recipes/1`), changed
Servings 2→4, saved — input reflected `4` after save, no console errors; a
follow-up `GET /api/recipes/1` confirmed `servings: 4` and `kcalPerServing`
correctly rescaled 185.15→92.575 (`kcalTotal` unchanged at 370.3, proving
ingredient amounts were not touched). Restored via a direct `PUT` back to
`servings: 2`, confirmed `kcalPerServing` back to 185.15.

**Bug found by user, fixed same slice:** editing servings then switching to
another recipe and back showed the old value until a full reload.
`ServingsField`'s uncontrolled RHF input had no `key`, so it never remounted
across recipe switches. Fix: `<ServingsField key={recipe.id} .../>` in
`RecipeDetail.tsx`. Re-verified via Playwright (puding 2→3→save→wraps→back
to puding shows 3, no reload); typecheck/lint/prettier clean; web tests
unchanged (bug was in wiring, not `ServingsField` itself, so no new story).

**Not yet done:** editing `weightG`; setting servings on a recipe with no
existing portion info.

R02.4 (yield editing) is now complete — both R02.4a and R02.4b are done.

**Next step:** R02.5 (archiving, needs a decision first) — the only
remaining piece of R02 — or the user may choose to start R03, per the
build plan's dependency note that R03 needs R02's reliable calories/scaling,
already in place.

The entries below retain their historical step numbers, statuses and evidence.
They refer to [build-plan-v1.md](build-plan-v1.md). Historical “next step” notes
do not override the active roadmap above. In particular, old step 31 is the
detail rail; step 31 in the supplied v2 means optimistic locking.

Status values: `in progress`, `blocked`, `implemented—awaiting review`, `complete`.

## Steps 1–27 — `complete`

Verified 2026-09-17: `npm run typecheck` (api+web) clean; `npm run lint` clean
(2 pre-existing `react/only-export-components` warnings, not step-blocking);
`npm run test -w api` → 5 files / 50 tests pass; `npm run test -w web` → 17
files / 34 tests pass. Recipes, ingredients/nutrition, unit conversion, pantry,
household members/settings/preferences/prices, and the deterministic planner
are implemented and exercised by at least the planner/nutrition/recipes/unit
test files. Frontend scaffold, design tokens, primitives, table, state
components, shell/routing, query client + typed API boundary, and keyboard
shortcuts are all present in `web/src`.

Known pre-existing gap, not part of step 29: pantry, household members,
household settings, ingredient prices and ingredient preferences have
route/service/repository code but **no test files** (`api/tests/` only has
`recipes.test.ts`, `nutrition.test.ts`, `planner.test.ts`,
`unitConversions.test.ts`, `units.test.ts`). Tracked as a follow-up; not
backfilled here to avoid silently expanding step 29's scope.

## Step 28 — Plan persistence and endpoints — `blocked`

Implemented: `POST /api/plans/generate`, `GET /api/plans/:weekStartDate`,
explicit `PUT`/`DELETE` lock endpoints (correctly using explicit desired state,
not a toggle), `PUT` replace-slot. Generation is wrapped in one
`db.transaction`; `plan_weeks.week_start_date` and
`(plan_week_id, day, meal_slot)` are unique-constrained.

**Blocking gap:** there is no `revision` (or equivalent) column on `plan_weeks`
or `plan_slots`, and no optimistic-concurrency check anywhere in
`api/src/services/plans.ts`. The code says so directly
(`api/src/services/plans.ts:32-33`):

> A lock/unlock that happens right after this line, before the write below
> finishes, gets overwritten and lost. Fine for a single-user app.

This does not meet the build plan's acceptance criteria for step 28 ("Stale
mutations produce a documented conflict (409)"; "optimistic revision checks for
competing edits"). There is also no `api/tests/plans.test.ts` — none of the
plan endpoints have persistence, concurrency, rollback or lock-invariant tests,
which the plan requires as step 28's own verification.

**Decision (2026-09-17):** recorded as an approved follow-up rather than fixed
inside step 29 — this is real feature work (schema migration + service
rewrite + integration tests), not a bounded reconciliation task. It must be
completed as its own step before step 32 ("Optimistic locking") and step 33
("Regeneration and dependent cache consistency") are attempted, since both
assume a working revision contract already exists on the backend. Do not start
step 32/33 until this is resolved. Tracked as step 29.1 below, scheduled
between step 29 and step 30.

## Step 29 — Audit current implementation and adopt agentic development — `complete`

Part A audit (2026-09-17) found:

- `context/` had only `build-plan.md`; `product.md`, `architecture.md`,
  `code-standards.md`, `progress.md` (this file) were missing — now added.
- `.claude/skills/{build-step,review,recover}/SKILL.md` were already adapted to
  the step-29 workflow before this session — no rework needed.
- `.claude/skills/architecture-review/` and `.claude/skills/frontend-review/`
  were already deleted in the working tree (uncommitted) when this audit
  started, superseded by `/review`. Confirmed with the user to finalize this
  removal rather than restore them.
- No hooks were configured in `.claude/settings.json`. No formatter existed in
  the repo (no Prettier/`.editorconfig`), so the plan's "format changed files"
  hook had nothing to call.
- No secret scanning existed locally or in CI.
- `shared/` already serves as the plan's `packages/contracts` concept safely
  (zod-only dependency, no server imports) — documented in
  `context/architecture.md` instead of creating a second package.

Changes made in this step: added `context/{product,architecture,code-
standards,progress}.md`; added a short pointer section to `CLAUDE.md` naming
the three skills and `context/`; added Prettier (devDependency, config only —
not run repo-wide); added one `PostToolUse` hook to `.claude/settings.json`
(format-on-write for the touched file); added `scripts/verify.sh` (a
standalone bounded typecheck+lint script, not wired to any hook — run
manually or by `/build-step`, does not replace `npm test`) and
`scripts/scan-secrets.sh`; added a `secret-scan` CI job.

`/review 29` (2026-09-17) found two blocking-before-complete issues, both
fixed: this paragraph previously miscounted the hooks as three and mislabeled
`verify.sh` as one of them; and a migration-SQL destructive-keyword warning
hook's Bash-tool branch (added to cover the realistic `drizzle-kit generate`
case) had not been fixture-tested since being rewritten — fixture-testing it
required creating throwaway files under the real `api/drizzle/`, which the
user declined twice. Also fixed from that review before the decision below:
`prettier-format.sh`'s exclusion check used unanchored substring matching
(could false-exclude an unrelated path) — now uses slash-bounded glob
matching.

Re-verified 2026-09-17 (no code changes since `36a632c`, working tree clean):
`npm run typecheck` (api+web) clean; `npm run lint` clean (same 2 pre-existing
`react/only-export-components` warnings); `npm run test -w api` → 5 files / 50
tests pass; `npm run test -w web` → 17 files / 34 tests pass. All three skills
load `context/`; hooks have demonstrated fixtures except the noted
`drizzle-kit generate` fixture the user declined to exercise against real
migration files (accepted, not blocking). Marking `complete` per this step's
own rule: "update progress to `complete` only when evidence supports it."

**Next step: 29.1** (approved blocking follow-up, below) — must land before
step 30 begins its optimistic-locking-dependent later siblings (32, 33); step
30 itself may start in parallel since it does not depend on 29.1.

## Step 29.1 — Prevent lost updates in plan mutations — `complete`

Approved 2026-09-17 as a blocking follow-up to the step-28 gap above (not
folded into step 29 — real feature work, not reconciliation). Scope, agreed
before implementation:

- Add one `revision` column on `plan_weeks` covering the whole plan (week +
  slots), not a separate counter per slot.
- Every mutation of an existing plan (lock, unlock, replace-slot, regenerate)
  must supply the revision it read and pay for it atomically: a single
  `UPDATE plan_weeks SET revision = revision + 1 ... WHERE id = $1 AND
  revision = $2` (compare-and-swap in SQL, not a read-then-check in
  application code) inside the same `db.transaction` as the slot write. Zero
  rows affected means a stale mutation.
- Regeneration's locked-slot snapshot is read before the transaction; the same
  CAS at write time means a lock made after that snapshot bumps the revision
  first and the regeneration's write is rejected rather than silently
  overwriting it.
- Stale mutations return 409 with a stable `error.details.code` (matching the
  existing `HTTPException` → `details` convention in `errorHandler.ts`), not a
  bare message; clients are expected to refetch (`GET
  /plans/:weekStartDate`) rather than retry blindly.
- Concurrent initial creation is already handled by the existing
  `plan_weeks.week_start_date` unique constraint (`WeekAlreadyGeneratedError`
  → 409) — no new constraint needed there, only for the revision column.
- Migration adds `revision integer not null default 1` (Postgres 11+ fast
  path for a constant default, no table rewrite) — safe for existing rows.
- New `api/tests/plans.test.ts` against real Postgres (testcontainers,
  already wired in `api/tests/global-setup.ts`) covers persistence,
  concurrency and rollback — this also backfills step 28's own missing
  verification, not just 29.1's acceptance tests.
- Remove the lost-update comment at `api/src/services/plans.ts:32-33` once the
  CAS lands.

Transaction approach presented to the user for review before implementation
(2026-09-17); approved, then implemented the same day.

**Implemented:** `plan_weeks.revision` (migration `0015_add_plan_weeks_
revision.sql`, additive column, default `1`); `casIncrementRevision` in
`repositories/planWeeks.ts` replaces `updatePlanWeek` — one `UPDATE ... WHERE
id = $1 AND revision = $2` per mutation, run inside the same `db.transaction`
as the slot write; `StaleRevisionError` → 409 with `cause.code:
"STALE_PLAN_REVISION"`; `expectedRevision` required on lock/unlock/replace
schemas; `updateSlotLocked`/`updateSlotRecipe` now accept the caller's
transaction client.

New `api/tests/plans.test.ts` (10 tests, real Postgres via testcontainers):
revision required on mutations, stale-revision rejection with the stable
error code, no partial writes on a mid-transaction failure, regeneration
cannot overwrite a lock made after its snapshot, two same-revision mutations
race to exactly one winner, a lock raced against a regeneration is never
silently dropped, concurrent initial creation still 409s via the unique
constraint, and existing lock-preservation across regeneration still holds.
Also found and fixed a pre-existing test-harness gap while adding this file:
`vitest.config.ts` let test files run in parallel against the one shared
Postgres database from `global-setup.ts`, so `plans.test.ts` sharing
`recipes`/`ingredients` with `recipes.test.ts` caused blanket-delete
`afterEach` hooks in different files to corrupt each other's fixtures under
parallel execution — fixed with `fileParallelism: false`, not by narrowing
cleanup (the other files' own blanket deletes would still collide).

Verified 2026-09-17: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing warnings); `npm run test -w api` → 6 files / 60
tests pass (was 5/50); `npm run test -w web` → 17 files / 34 tests pass
(unchanged). This also backfills step 28's own missing verification
("real-Postgres integration tests for persistence, concurrency, rollback and
lock invariants"), not just 29.1's acceptance tests.

**Missing vs. stale revision (corrected after `/review`):** `generatePlan`'s
`expectedRevision ?? -1` fallback let a client that forgot to send a revision
get the same 409 message as a genuine conflict, with the internal `-1`
sentinel leaking into the response text. Replaced with three distinct,
tested outcomes for an existing plan: no `expectedRevision` → 400
`EXPECTED_REVISION_REQUIRED` (checked before any planning work runs, so it's
cheap); a non-integer or sub-1 `expectedRevision` → 400 with the standard
Zod validation shape (`shared/src/plans.ts`'s `expectedRevisionSchema` now
requires `.positive()`, not `.nonnegative()` — the column never holds 0); a
correctly-shaped but outdated `expectedRevision` → 409
`STALE_PLAN_REVISION` (renamed from `PLAN_REVISION_CONFLICT` for clarity, and
applied uniformly since lock/unlock/replace share the same error class).
Initial creation of a week with no `expectedRevision` is unaffected — that
branch never reaches the revision check — and concurrent initial creation is
still caught by the `plan_weeks.week_start_date` unique constraint.

**Transaction ownership (corrected after `/review`):** `services/plans.ts`
opening its own `db.transaction` around `generatePlan` predates this step, but
this task expanded that pattern's scope: `setSlotLocked` and `replaceSlot`
previously did a single bare `UPDATE` with no transaction at all, and now also
open their own `db.transaction` for the same reason — the revision CAS and
the slot write must be atomic. This is an approved, scoped exception, not a
carried-over deviation; the rationale and its boundary (plan mutations
needing an atomic revision check, nothing else) are recorded in
`context/code-standards.md`'s "Layering" section. An earlier version of this
entry understated the change as unchanged pre-existing behaviour — corrected
2026-09-17.

**Context accuracy (corrected after `/review`):** `context/architecture.md`
still described `plan_weeks`/`plan_slots` as having no revision column and
`plans` as having no test file — both stale as soon as the implementation
above landed. Updated its "Database" and "Testing" sections to describe the
revision column and its CAS mechanism (cross-referencing
`code-standards.md`'s transaction-ownership rationale), and to name which
test files exist versus which were last verified passing, rather than
conflating the two.

Re-verified 2026-09-17 after all three `/review` fixes above:
`npm run typecheck` (api+web) clean; `npm run lint` clean (same 2
pre-existing warnings); `npm run test -w api` → 6 files / 61 tests pass (was
60 — added a test for the malformed-revision 400 case, and strengthened two
existing tests with error-code assertions); `npm run test -w web` → 17 files
/ 34 tests pass, unchanged (no web files touched this round, re-run to
confirm rather than assumed). Ran the api suite three times in a row with no
flake in the concurrency tests.

**Next step: 27.1**, then 30 — see below.

## Step 27.1 — Per-member dinner-only calorie targets and portion scaling — `complete`

Decision (2026-09-17), by user request, not an audit finding: household is one
user (1500 kcal/day) plus one member (2200 kcal/day); the app is needed for
dinner only right now. Step 27's implemented calorie model — sum every member's
`dailyCalorieTarget` into one combined household figure and check the day's
total against it (`api/src/services/planner.ts`, `ctx.targets.dailyCalories`) —
never matched build-plan's own step 27 text ("planned-meal calorie target, not
an implied whole-day target") and does not support the actual need: one shared
dinner recipe with each member's portion scaled to their own per-meal target
(500 kcal / 800 kcal). Recorded as a new step rather than rewritten into step
27's history, following the 29.1 precedent for a scope correction discovered
after a step was marked complete.

An in-progress, uncommitted attempt at a partial fix (single shared
`mealCalorieTarget`/`calorieTolerance` on `household_settings`, replacing
per-member targets entirely) was reverted 2026-09-17 before this step began —
it moved further from per-member targets, not closer. See step 27.1's
requirements in `context/build-plan.md` for the agreed design: dinner-only
generation (seven slots, not fourteen), a new per-member per-dinner calorie
target field, and per-member serving-count scaling from one recipe's
kcal-per-serving.

Migration `0016_add_household_member_dinner_calorie_target.sql` landed:
nullable `dinner_calorie_target` numeric column plus a `> 0` check constraint
on `household_members`. Nullable deliberately, not backfilled — an
unconfigured member must block planning, not default to 0 (see algorithm
approval below).

Algorithm design presented to the user for review before implementation
(2026-09-17); approved:

- Calorie fit moves out of recipe *selection* entirely — since any recipe's
  calories can be absorbed by scaling a member's portion, `fillRemainingSlots`
  no longer scores candidates by calorie-closeness (removing that heuristic
  from `api/src/services/planner.ts:369-376`); the dinner slot is chosen by
  the existing soft preferences (promo, protein variety, speed, store count),
  same as `localSearch` already applies.
- Per-member servings are computed after a recipe is chosen for a slot:
  `servings = memberTarget / recipe.caloriesPerServing`, rounded to the
  nearest 0.25. A recipe is ineligible for a dinner slot if any configured
  member's servings would round outside roughly 0.25–4 (filtered at
  eligibility time, same pattern as the existing `neverIngredientIds` filter —
  not generated then reported as a violation).
- Cost and (later, step 34's) shopping quantities scale from total servings
  needed for the slot vs. the recipe's own base yield, not a flat per-slot
  recipe cost. `PlannerRecipe` needs its base `servings` count back — it is
  currently discarded in `plan-inputs.ts` right after computing per-serving
  calories.
- A member with no `dinnerCalorieTarget` configured throws a new
  configuration error before planning starts, same pattern as
  `HouseholdSettingsNotConfiguredError` — never silently excluded from the
  calorie check.

**Implemented** (2026-09-17): `shared/src/planner.ts` (`MemberDinnerTarget`,
`MemberServing`, `PlannerTargets.memberTargets` replacing `dailyCalories`,
`PlannerRecipe.baseServings`, `PlannedSlot.memberServings`);
`plan-inputs.ts` (`baseServings` threaded through, `memberTargets` built
from each member's `dinnerCalorieTarget`, throwing
`HouseholdMemberMissingDinnerTargetError` — mapped to 422 in
`routes/plans.ts`, same pattern as the other household-configuration
errors — for a member with none set); `api/src/services/planner.ts`:
`PLANNED_MEAL_SLOTS = ["dinner"]` restricts generation/placement/final
assembly to one slot per day; `computeMemberServings`/
`roundToNearestServing`/`isServingsPlausible` (quarter-serving rounding,
0.25–4 plausible range) filter dinner eligibility per member;
`fillRemainingSlots` now picks the best-`scoreSlot` eligible candidate
instead of the closest-calorie one; `validateDailyCalories` replaced by
`validateMemberDinnerCalories` (per-member, ±10%); `validateWeeklyBudget`
scales cost by total servings needed versus each recipe's `baseServings`.

Test fixtures (`tests/fixtures/plannerFixtures.ts`) and
`tests/planner.test.ts` rewritten for the dinner-only/per-member model:
fixture recipes are dinner-only, calories chosen (400/serving) so both
fixture members' targets (500, 800) hit exactly with no rounding
deviation; added tests for the implausible-servings eligibility exclusion
and the quarter-rounding tolerance-breach edge case. `tests/plans.test.ts`
needed two fixes as a direct consequence: `seedPlannableHousehold`'s
household member now sets `dinnerCalorieTarget`, and three tests that
locked a real generated plan's `slots/0/lunch` now use `slots/0/dinner`
(lunch slots no longer exist in a generated plan; tests that seed a
`plan_slot` row directly, bypassing the real planner, were unaffected).

Verified 2026-09-17: root `npm run typecheck` clean (api+web); root
`npm run lint` clean (same 2 pre-existing `web` warnings); `npm run test
-w api` → 6 files / 64 tests pass.

Not yet done, left for step 34 (Shopping derivation API, not yet started):
shopping-list quantity derivation should assume scaled per-member portions
rather than a recipe's raw serving count, following the same
`baseServings`-ratio pattern used in `validateWeeklyBudget`.

**Next step: 30** (Week grid and planning settings); 29.1 already cleared
the unrelated optimistic-locking dependency for step 30's later siblings
(32, 33).

## Step 30 — Week grid and planning settings — `complete`

Scope agreed with the user before implementation (2026-09-17), since the
plan's text ("per-member dinner calorie target/tolerance, budget/currency,
exclusions, preferences and timezone") assumed several settings that did not
yet exist as real inputs: calorie tolerance stays hardcoded at ±10% in
`planner.ts` (displayed as fixed text, not editable); currency stays fixed to
CZK (displayed as a read-only label, no schema/type changes); a `timezone`
column was added to `household_settings` (editable, default `Europe/Prague`,
not yet consumed by any planning/date logic); ingredient exclusions/
preferences editing is deferred to a later step (only targets/tolerance/
budget/timezone are on `/household` for this step).

**Found and fixed as part of this step, not pre-existing:** there were no
API routes at all for household settings/members — only services/
repositories with no route file, so nothing was reachable over HTTP.
`findSlotsByWeekId` had no `ORDER BY`, so `GET /:weekStartDate` slot order
was undefined. `generatePlan` computed `violations` (via `plan()`) but
discarded them before returning — the API had no way to surface "why a slot
couldn't be filled," contradicting step 27's own acceptance criteria. All
three fixed here since step 30's acceptance criteria depend on them directly.

**Backend implemented:** migration `0018_add_household_settings_timezone.sql`
(additive `timezone text not null default 'Europe/Prague'`, same safe
constant-default fast path as the `revision` column — not destructive, no
approval gate needed); `HouseholdSettingsInput`/`updateDinnerCalorieTarget`
repository additions; new `api/src/routes/household.ts` (`GET`/`PUT
/settings`, `GET /members`, `PUT /members/:id`) mounted at `/api/household`;
`HouseholdMemberNotFoundError` (404); `shared/src/household.ts`
(`updateHouseholdSettingsSchema`, `updateMemberDinnerTargetSchema`).
Param-vs-body validation status split (400 for the `:id` param, 422 for the
JSON body) matches the existing convention in `recipes.ts`/`plans.ts`, not a
new rule. `findSlotsByWeekId` now orders by `day`. `generatePlan`'s response
includes `violations` (not persisted — only the generation attempt's own
response carries them, since a later `GET` can't know whether they still
apply after locks/edits).

**Frontend implemented:** `web/src/features/week/` (`WeekPage` container,
`WeekNav`, `WeekGrid` presentational, `deriveWeekRows` pure derivation,
`useWeek`/`useGeneratePlan`) and `web/src/features/household/`
(`HouseholdPage` container, `HouseholdSettingsForm`, `MemberTargetRow`,
`useHousehold`). Current week is URL state (`?start=YYYY-MM-DD` on `/week`),
not component state, so back/forward and the sidebar's date-range label
(wired into the pre-existing TODO in `Sidebar.tsx`) stay in sync without a
shared store. Since `features/` must never import from each other, the
recipe list and household settings/members *read* queries were extracted
into `web/src/shared/api/{recipeCatalog,household}.ts`; `features/recipes/
useRecipes.ts` and `features/household/useHousehold.ts` now delegate their
read hooks to those shared modules (same query keys, so the cache is
genuinely shared, not duplicated) while keeping their own mutations local.
Reason strings from the planner (free-text, e.g. `"promo: ... on sale at
..."`) are categorized into short `ReasonTag` labels by
`shared/lib/planReasons.ts` rather than rendering the raw prose.

Storybook stories added for `WeekGrid`, `HouseholdSettingsForm`, and
`MemberTargetRow` (interactive + state variants), run as real Vitest tests
per the project's existing convention. `api/tests/household.test.ts` added
(9 tests: settings null/persist/validation, members list, member update
success/404/400/422) — the new routes had no coverage otherwise, unlike the
pre-existing pantry/household gap noted under step 29, which was about
already-existing but unmounted code.

**Bug found and fixed during manual verification, not by the automated
suite:** `deriveWeekRows` mapped every row `GET /:weekStartDate` returned
into a day-card keyed by `day`, assuming every row was a dinner slot. The
dev database still had `breakfast`/`lunch`/`dinner` rows from before step
27.1 restricted planning to dinner-only, so the grid rendered 21 cards (3
stacked per day) with duplicate React keys. Fixed by filtering to
`mealSlot === "dinner"` in `deriveWeekRows` — the correct fix regardless of
this particular database's history, since nothing today enforces that
`plan_slots` only ever contains dinner rows going forward either.

Verified 2026-09-17: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing `web` warnings); `npm run test -w api` → 7 files
/ 76 tests pass (was 6/67 — new `household.test.ts`); `npm run test -w web`
→ 20 files / 43 tests pass (was 17/34 — three new story files). Manual
browser verification (Playwright against the dev servers, screenshots
inspected): `/household` loads, saves a weekly-budget/timezone change, and
saves a per-member dinner calorie target (confirmed via a direct `GET
/api/household/members` round-trip, not just the UI re-render, after an
earlier false-positive from an imprecise test-script selector); `/week`
shows "No plan generated for this week yet." with a working Generate button;
generating with incomplete member targets shows the exact 422 domain-error
message inline; generating with both members configured produces 7 dinner
day-cards with correct per-member servings/calories, cost, reason tags, a
locked-slot marker, and a "some slots couldn't be filled" violations banner
listing the actual unmet-constraint details; clicking a day-card shows the
outer selection ring. Migration applied to the dev database
(`npm run migrate`); no destructive statements.

**Not yet done, left for later steps:** selecting a day does nothing beyond
showing the ring (detail rail is step 31); there is no lock/unlock control
in the UI yet (interactive locking with rollback is step 32); regenerating
an existing week is not exposed (only initial generation — regeneration and
its cache consistency is step 33); ingredient exclusions/preferences have no
edit UI (deferred, see scope note above).

Committed as `feat(api): add household settings and member routes`,
`fix(plans): order returned slots by day and surface generation violations`,
`feat(household): add settings and dinner-target UI`,
`feat(week): add weekly plan grid and generation` (this entry previously said
"awaiting review/commit" — stale, corrected here since the commits already
landed).

**Next step: 31** (Meal detail rail and replacement).

## Step 31 — Meal detail rail and replacement — `implemented—awaiting review`

**Found while orienting, treated as in-scope (not a separate follow-up):**
`replaceSlot` (added in step 28/30) had three gaps against this step's own
acceptance criteria: no locked-slot check (would silently overwrite a locked
slot's recipe); no eligibility validation on the new recipe (meal type,
excluded ingredients, per-member servings plausibility); and it
unconditionally reset `reasons`/`memberServings` to `[]` instead of
recomputing them. Design (new `/candidates` endpoint, backend validation,
frontend rail) presented to the user for review before implementation
(2026-09-18); approved.

**Backend implemented:** `api/src/services/planner.ts` — `computeMemberServings`
and `isServingsPlausible` exported (were private); new `checkSlotEligibility`
(mealType/never-ingredient/servings-plausibility, one violation reason or
`null`) that `indexEligibleRecipesBySlot` now calls, replacing its inline
boolean checks (same behavior, deduped); `collectReasons` exported.
`api/src/lib/errors.ts` — `SlotLockedError` (409 `SLOT_LOCKED`),
`RecipeNotEligibleError` (422 `RECIPE_NOT_ELIGIBLE`). `api/src/services/plans.ts`
— new `getSlotCandidates(weekStartDate, day, mealSlot)` reuses
`getPlanInputs`/`buildPlannerContext`/`eligibleRecipes` (no new planning
logic) and ranks results by `scoreSlot`; `replaceSlot` now: 404s via a direct
`findRecipeById` check before touching household-config-dependent
`getPlanInputs` (preserves the existing "nonexistent recipeId still 404s"
behavior even for a week with incomplete household config); 409s
(`SlotLockedError`) if the target slot is locked; 422s
(`RecipeNotEligibleError`) if the recipe fails `checkSlotEligibility`; then
recomputes real `reasons`/`memberServings` from the rest of the week's
assigned slots instead of blanking them. New route
`GET /api/plans/:weekStartDate/slots/:day/:mealSlot/candidates`.
`updateSlotRecipe` (repository) now takes `reasons`/`memberServings`
parameters instead of hardcoding empty arrays.

**Frontend implemented:** `web/src/features/week/MealDetailRail.tsx` (new),
`deriveMealDetail.ts` (new, pure — `deriveMealDetail`/`deriveCandidateRows`),
wired into `WeekPage.tsx` next to `WeekGrid` when a day is selected. Shows
recipe title/meta/tags, per-member servings and calories, reason tags,
ingredients scaled by (total servings needed ÷ recipe's base servings —
same ratio `validateWeeklyBudget` already uses), and either a locked notice
with an "Unlock to edit" action or a ranked replacement-candidate list.
`useWeek.ts` gained `useSlotCandidates`, `useReplaceSlot`, `useSetSlotLocked`
— the lock mutation here is a plain mutate-then-cache-write (no query
cancellation/snapshot/rollback), since building the full optimistic-update
UX is step 32's scope; this step only needs enough to gate replacement
behind an explicit unlock. `web/src/shared/api/recipeCatalog.ts` gained
`useRecipeDetail`/`RecipeWithIngredients`/`RecipeIngredient` (moved out of
`features/recipes/useRecipes.ts`, which now re-exports them) since `week`
needed the single-recipe-with-ingredients query too and features may not
import each other's files — same pattern step 30 already used for the
recipe catalog list. `web/src/shared/layout/DetailRail.tsx` gained an
optional `className` override (default preserves its exact prior fixed
`w-73` behavior for `RecipeDetail`, its only other caller) so
`MealDetailRail` can render one content tree that's a side rail at `md:`
and a full-width inline panel below it — the project's `md:` breakpoint
convention (already used by `WeekGrid`'s `grid-cols-1 md:grid-cols-7`),
extended here to the rail primitive for the first time since this is the
first screen that needed a non-desktop-only rail.

**Bug found and fixed during manual browser verification, not by the
automated suite:** `deriveMealDetail`'s ingredient-scaling ratio was
`totalServings / recipe.servings` with no zero guard. A slot with an empty
`memberServings` array (the same pre-27.1 legacy dinner-slot data step 30's
verification already flagged as present in the dev database) produced a
ratio of exactly `0`; every scaled ingredient amount then rounded to `0`,
and `[amount, unit].filter(Boolean)` silently dropped it (`Boolean(0)` is
`false`) — ingredients rendered as a bare unit with no quantity (e.g. "g
Brambory"), not an error or an "unknown" state. Fixed by treating
`totalServings === 0` the same as "no scaling data" (falls back to the
recipe's own base/unscaled amounts) rather than a real `0` ratio — the
correct fix regardless of this specific database's history, since nothing
prevents a slot with empty `memberServings` from existing again. Re-verified
in the browser after the fix (locked slot with empty `memberServings` now
shows its base amounts correctly).

New api tests in `api/tests/plans.test.ts`: locked-slot replace rejection
(409 `SLOT_LOCKED`), wrong-meal-type replace rejection (422
`RECIPE_NOT_ELIGIBLE`), stale-revision replace rejection (409, no partial
write), candidates endpoint returns only eligible recipes ranked
best-scoring-first, candidates 404s for a week with no plan yet. Also
rewrote the "resets memberServings to empty when a slot's recipe is
replaced" test — it asserted the pre-fix bug's behavior (replacing a dinner
slot with a lunch-only recipe used to silently succeed and blank
`memberServings`; it now correctly 422s) — replaced with a test asserting
real recomputed `reasons`/`memberServings` for a validly-replaced recipe.
`seedPlannableHousehold` gained a second dinner recipe (needed so
replace/candidates tests have more than one valid recipe to work with),
which changed which recipe the deterministic planner assigns to day-0
dinner under seed 1; three unrelated pre-existing tests
("does not let a regeneration overwrite a lock made after its snapshot",
"still preserves a locked slot across regeneration with a valid revision",
"persists each member's servings...") hardcoded the single old recipe's id
and started failing — fixed by reading the actually-assigned recipe from
each test's own generate response instead of assuming which of the two
valid recipes the planner picked (the tests' real intent — lock survival,
persistence — is unaffected by which recipe that is).

Verified 2026-09-18: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing `web` warnings); `npm run test -w api` → 7 files
/ 81 tests pass (was 76 — 5 new, 3 existing rewritten as described above);
`npm run test -w web` → 20 files / 43 tests pass, unchanged (no new
Storybook story — `MealDetailRail` does its own data fetching/mutations,
and the project's established convention, per `RecipeDetail.tsx` having no
story either, is that only prop-driven presentational components get
stories; query-owning containers are verified by the manual browser
journey instead). Manual browser verification (Playwright driving the real
dev servers + dev Postgres, screenshots inspected, no console errors):
selecting an unlocked dinner day opens the rail with correct title,
tags, reasons, per-member servings/calories, and ingredients; picking a
replacement candidate persists (confirmed via the grid updating and a
direct API round-trip) and shows correctly recomputed reasons/servings for
the new recipe; a locked day shows the locked notice and no candidate
list; clicking "Unlock to edit" reveals the candidate list; at a narrow
(420px) viewport the rail renders as a full-width inline panel below the
grid, not a clipped side rail.

**Not yet done, left for later steps:** the lock/unlock control here is
intentionally minimal (no optimistic update, cancellation, or rollback —
step 32); replaceSlot's stale-revision recovery is "show the error and let
the next `staleTime`/focus refetch resolve it," not an explicit
reconcile-and-retry flow (also step 32/33 territory); no Playwright/E2E
journey test was added for the replace flow — only Vitest/API tests plus
the manual Playwright verification above, matching this project's existing
practice of manual-only verification for query-owning feature containers.

**Next step: 32** (Optimistic locking), after the user reviews this diff.
