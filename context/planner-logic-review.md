# Planner logic: current behavior and repair plan

Reviewed 2026-09-18 against the current working tree, including step-31 meal-detail and replacement changes. This is a description and proposed repair plan, not a record of implemented fixes. Product choices below remain proposals until confirmed.

## Scope and terminology

The algorithm is deterministic application code, with seeded random choices. It does not call an AI model. It generates seven dinners; breakfast, lunch and snacks exist in the shared types but are not generated.

Everyone receives the same recipe for a dinner, with a separate portion size for each household member. The algorithm does not currently plan separate meals for different members, leftovers, batch cooking or lunches.

Keep these concepts separate:

- **Eligibility:** whether a recipe can be considered for a slot.
- **Validity:** whether the completed plan satisfies all its constraints.
- **Preference score:** which of the considered arrangements the algorithm likes better.
- **Persistence:** whether the arrangement was saved. Currently saving does not guarantee validity.

Some comments still describe 28 slots or say initial filling is driven by calories. The executable code now returns seven dinner slots and fills them using preference scores.

## Generation, step by step

### 1. Receive the week and generation request

The web page supplies a week-start date and a randomly chosen integer seed. A seed controls the pseudo-random sequence; it is not a quality setting.

For a new week, generation creates a new plan. For an existing week, the API requires the client's expected revision and reads the existing locked meals. The current web page only exposes initial generation; regeneration exists in the API.

Source: `api/src/services/plans.ts`, `generatePlan`; `web/src/features/week/WeekPage.tsx`.

### 2. Load current planning inputs

The service reads household members, household settings, recipes and their ingredient lines, prices, pantry rows and ingredient preferences. It requires at least one member, settings, and a dinner-calorie target for every member.

Actual input use:

| Input                         | Current behavior                                                          |
| ----------------------------- | ------------------------------------------------------------------------- |
| Dinner calorie target         | Determines each member's portion                                          |
| Daily calorie target          | Not used for dinner planning                                              |
| Weekly budget                 | Limit for estimated recipe cost, in CZK                                   |
| Start day of week             | Used to decide weekdays for cooking-time scoring                          |
| Timezone                      | Stored in settings but not consumed by planning/date logic                |
| Recipe meal type, yield, cost | Required to enter the planning recipe list                                |
| Ingredient nutrition          | Used to derive recipe calories per serving                                |
| Ingredient `never` rules      | Combined into household-wide exclusions after resolving member overrides  |
| Ingredient `dislike` rules    | Not used in scoring                                                       |
| Cuisine and diet labels       | Not used in filtering or scoring                                          |
| Protein label                 | Used for recent-repeat scoring                                            |
| Pantry                        | Only ingredient ID and expiry offset reach the planner; quantities do not |
| Prices                        | Only offers valid on the first day of the week are loaded                 |

Preference resolution starts with household rules, applies a member's override for the same ingredient, then combines all members' resolved `never` rules. A member override of `dislike` can replace a household `never` for that member. This is existing behavior and needs an explicit product policy before treating household exclusions as immutable.

Source: `api/src/services/plan-inputs.ts`, `api/src/services/ingredientPreferences.ts`, `api/src/repositories/ingredientPrices.ts`.

### 3. Calculate calories and assemble planning recipes

The nutrition service sums `amountBase / 100 × kcalPer100g` for ingredient lines, then divides by the recipe's base serving count. A recipe with a missing meal type, cost, serving count or computed calories is omitted from planning inputs.

There is a correctness gap: missing ingredient quantity/nutrition is skipped rather than represented as incomplete. A partial calorie total can therefore look complete. The calculation also does not receive the ingredient's base unit, although base amounts can be grams, millilitres or pieces. Non-gram quantities need a declared compatible nutrition basis or conversion.

Source: `api/src/services/nutrition.ts`, `buildPlannerRecipes` in `api/src/services/plan-inputs.ts`.

### 4. Apply prerequisites and ordinary recipe eligibility

Generation currently refuses to run if the entire price catalog is empty **or the resolved exclusion list is empty**. Having no excluded ingredients is therefore treated as an error. This should be distinguished from missing configuration.

Ordinary dinner candidates must:

1. Have meal type `dinner`.
2. Contain no excluded ingredient.
3. Give every member a rounded portion between 0.25 and 4 servings, inclusive.

Each member's portion is calculated as:

`servings = round((dinner target / recipe kcal per serving) / 0.25) × 0.25`

The rounding step is fixed at a quarter serving. Eligibility does **not** yet check that the rounded result is within the calorie tolerance. That is checked later during whole-plan evaluation.

For a recipe with 400 kcal per serving, members targeting 500 and 800 kcal receive 1.25 and 2 servings, respectively. Total required servings are 3.25. For a four-serving recipe costing 400 Kč, its planned cost is `400 × 3.25 / 4 = 325 Kč`. Ingredients scale by `3.25 / 4` too.

Source: `checkSlotEligibility`, `computeMemberServings` and `plan` in `api/src/services/planner.ts`.

### 5. Copy locked meals

Locked recipe assignments are inserted first and protected from changes during generation. They bypass eligibility checks. If inputs changed since the lock was created, a locked recipe can conflict with new exclusions or become incomplete without a dedicated conflict being reported.

A lock currently pins the recipe assignment. Regeneration recomputes portions from the current member targets; it does not freeze the recipe contents, ingredient quantities or previous portions.

Source: `placeMustUseConstraints` and the output assembly in `plan`.

### 6. Force meals that use food expiring soon

For each pantry row with an expiry 0–3 days after the week starts, the planner finds recipes containing that ingredient. Already-expired items generate a violation. Items with no expiry or an expiry beyond day 3 do not create a must-use placement.

It handles the earliest deadlines first. For each one, it chooses a seeded-random empty dinner slot at or before the deadline and a matching dinner recipe. These assignments are also protected during this generation run, although they are not persisted as user locks.

Critical differences from ordinary eligibility:

- This path checks meal type but does not apply excluded-ingredient or portion-plausibility checks.
- It does not recognize that an already assigned meal may satisfy the same ingredient requirement.
- Pantry rows are processed independently, without stock amounts or allocation between meals.
- Failure becomes a reported violation; generation continues.

Source: `resolveExpiryConstraints`, `findPlacementOptions`, `placeMustUseConstraints`.

### 7. Fill remaining dinners in day order

Each empty day receives the ordinary eligible recipe with the highest current slot score. If there are no candidates, the slot stays empty and a violation is recorded. Ties retain the first candidate in the input list.

The score has three components:

| Component               | Current contribution                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| Promotional ingredients | +1 for each ingredient with any loaded promotional offer                      |
| Protein variety         | +1 if no same-protein recipe occurs in the preceding three days, otherwise −1 |
| Weekday cooking time    | `(60 − minutes) / 60`; zero on weekends                                       |

A 15-minute weekday recipe with one promotional ingredient and no recent protein repeat scores `1 + 1 + 0.75 = 2.75`.

There is no direct cheaper-recipe bonus, dislike penalty, cuisine-diversity score or maximum repeat count. A recipe missing its protein label receives the no-repeat bonus. Variety only looks backward within the current week. Promotional prices affect the score as flags; their actual discount value is not used.

Source: `fillRemainingSlots`, `scoreSlot`, `findProteinRepeatDay`.

### 8. Try 500 random single-slot changes

The search considers only assigned slots that are neither locked nor protected by pantry placement. Each attempt selects a slot and a candidate recipe. Picking the existing recipe consumes an attempt without changing anything.

For each proposed change it evaluates:

1. The number of member-calorie violations plus the number of weekly-budget violations.
2. The total slot preference score, minus 2 for each estimated required store.

Fewer violations always wins. With equal violation counts, only a strictly higher preference score wins. Otherwise the change is reverted.

Store count is estimated by repeatedly picking the store covering the most uncovered recipe ingredients. It is not a purchase plan, ignores pantry stock and price amounts, and does not flag ingredients for which no offer exists.

This is a bounded search, not a proof of the best or only possible plan. It cannot swap two days together, change protected pantry placements or refill originally empty slots. Crucially, one budget violation counts the same whether the overspend is 1 Kč or 1,000 Kč. Several individually useful cheaper substitutions can therefore all be rejected before they collectively reach the budget.

Source: `localSearch`, `evaluatePlan`, `isBetter`, `scorePlan`, `countDistinctStores`.

### 9. Run final checks and produce reasons

Final calorie checks compare each member's scaled dinner calories with their target at a fixed ±10% tolerance. Budget checking sums scaled stored recipe costs. It does not calculate checkout spend, subtract pantry stock, round packs or select cheapest current offers.

These checks append violations to earlier pantry/empty-slot violations. There is no independent final pass checking exclusions, portion bounds, current lock eligibility or accurate pantry allocation.

Every filled slot receives portions and text reasons for promotions, soon-expiring ingredients and protein repetition. These are annotations derived from the final arrangement, not a full explanation of why the search chose it. Cooking-time and store-count contributions are not included. Pantry text does not verify that this particular day uses unexpired remaining stock.

Source: `validateMemberDinnerCalories`, `validateWeeklyBudget`, `collectReasons`, `buildReasons`, `plan`.

### 10. Save atomically and display

The service saves the week and slots in one transaction. For an existing plan, it increments the revision only if the expected revision still matches. A conflict returns HTTP 409 without applying the plan mutation.

Saved fields include recipe IDs, lock flags, member servings, reasons, seed, planner version and revision. The service saves the generated plan even if it has violations. Violations are included in the generation response, but are not stored in the week/slot schema or returned by fetching the week later.

Consequently, a reload loses the warning state. The current UI also labels all generation violations as “Some slots couldn't be filled,” even when the actual problem is budget or calorie tolerance.

The UI joins saved assignments to live recipe and household data. A recipe or target edit is not a versioned plan mutation, so old portions/reasons can be combined with new recipe details. The persisted seed alone cannot reproduce old inputs.

Source: `api/src/services/plans.ts`, `api/src/repositories/planWeeks.ts`, `api/src/db/schema.ts`, `web/src/features/week/WeekPage.tsx`.

## Manual replacement is a separate path

1. Selecting a dinner loads the recipe details and, if unlocked, candidate recipes.
2. Candidates use current inputs, ordinary eligibility and that slot's preference score. They do not evaluate the resulting week's cost/calorie violations or changes to later days' scores.
3. Replacing checks that the week, slot and recipe exist, requires an unlocked slot, and reruns ordinary eligibility.
4. The service recalculates the selected slot's portions and reasons.
5. A revision-checked transaction saves that slot and increments the week revision.
6. The UI merges the returned slot into its cached week and invalidates that slot's candidate list.

Missing work: whole-plan validation before replacement; recalculating dependent reasons; invalidating other affected candidates; explicit stale-revision reconciliation; and preventing a delayed response/refetch from overwriting newer cached data. Expiry-protected meals are not user-locked, so manual replacement can undo pantry placement too.

Unlock is a separate mutation with the same revision mechanism. It currently updates the cache after success; it has no optimistic cancellation/snapshot/rollback behavior. The rail exposes unlock but not a full lock/unlock control.

Source: `getSlotCandidates`, `replaceSlot`, `setSlotLocked` in `api/src/services/plans.ts`; `web/src/features/week/useWeek.ts`.

## Confirmed examples from this review

Small fixtures were run directly against the current exported functions without database writes. The walkthrough's intermediate states were checked against a complete `plan()` call with the same ordered inputs and seed.

| Case                                                                                | Observed current result                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Excluded shrimp expires today                                                       | Shrimp is scheduled today; no violation is reported                                                                     |
| Today's locked salmon already uses salmon expiring today                            | Reports “no free slot” for the ingredient despite the assigned salmon meal                                              |
| Two same-ingredient pantry rows expire today                                        | Second row reports no free slot; quantities are unavailable to determine real coverage                                  |
| One known 100 kcal ingredient plus one ingredient of unknown nutrition              | Returns 100 kcal with no completeness indicator                                                                         |
| Seven fast dinners cost 700 Kč; slower substitutes could total 70 Kč; budget 100 Kč | Search retains the 700 Kč week because a single substitution still leaves one violation and lowers the preference score |
| Pantry-selected recipe yields zero servings for a member                            | Recipe is placed despite failing ordinary portion eligibility                                                           |

Previously reproduced in the step-31 review: 400 kcal target receives 500 kcal through replacement eligibility; detail cost differs from scaled grid cost; 0.025 litres renders with no numeric quantity; following days keep stale protein-variety reasons. Empty slots hide the replacement controls by inspection.

The earlier review's full checks passed: 81 API tests, 43 frontend tests, type checking, and lint with two pre-existing warnings. These results do not cover the failing cases above. No application behavior was changed by this review.

## Recommended repair order

### A. Correctness before further UI features

1. **One authoritative validation path.** Use the same rules for ordinary choices, pantry choices, retained locks, replacements and final validation. Reject excluded ingredients everywhere; report invalid locked meals as conflicts instead of silently certifying them.
2. **Complete, unit-aware nutrition.** Return known/partial/unknown status. Convert compatible quantities before calculation. Missing facts must not certify calorie compliance.
3. **Persistent plan status.** Distinguish validated, incomplete, conflicting and stale plans. Persist or reliably recompute violations so GET/reload retains them. Report missing recipe references and input changes.
4. **Honest cost basis.** Use one shared portion-cost calculation in generation, replacement and UI. Label the initial basis as estimated recipe cost. Checkout spend needs pantry quantities, pack units and eligible offers first.
5. **Replacement validation and dependencies.** Validate the proposed resulting week, update affected reasons and summaries, reconcile all affected caches and recover explicitly from revision conflicts.

### B. Make planning behavior useful and predictable

6. **Repair the pantry model.** Resolve whether expiry is a preference or a strict rule. Check existing coverage before placing anything else. Represent lot quantities, dates and allocation when claiming an amount of stock is used. Do not mark expired stock as successfully used.
7. **Separate feasibility repair from preference improvement.** Reduce violation severity as well as count, including overspend and calorie deviation. Add bounded multi-slot changes/restarts where needed. Always finish with independent validation; describe search failure without claiming impossibility.
8. **Distinguish empty settings from missing settings.** Allow an explicitly empty exclusion list. Define what missing offers mean for a recipe-cost estimate versus a checkout-cost calculation.
9. **Make dates and replay consistent.** Derive actual weekdays from the requested date, use the household timezone for “today,” stabilize input ordering/tie-breaks, version algorithm changes and record the input snapshot or versions used.
10. **Clarify preference policy.** Decide repeat limits, dislike handling, unknown protein labels and whether household exclusions may be overridden per member. Make weights explainable before exposing preference controls.

### C. Update the UI against the settled rules

11. **Correct today's panel.** Scale costs consistently; keep small quantities visible; label unknown nutrition/cost; allow filling empty slots; expose complete reasons instead of only promo/pantry tags.
12. **Show honest week status.** Keep violations visible after reload, distinguish empty dinners from invalid portions/budget conflicts, and identify missing inputs with an action to repair them.
13. **Preview the effect of a replacement.** Show per-member portions/calories, meal-cost change, resulting weekly budget and any conflict before applying it.
14. **Complete lock/regenerate interactions.** Show what a lock protects, pending state, conflicts and retry behavior. Preserve the previous saved plan on generation failure or when presenting an invalid draft.

## Product choices to confirm

- **Expiry:** recommended default is a preference with unused-food warnings; explicit must-use requirements should be separate.
- **No valid result found:** recommended default is to keep the current plan and present a draft with conflicts; do not silently replace it with a plan portrayed as valid.
- **Budget:** recommended initial basis is estimated cost of planned portions. Expected checkout spend is a separate capability requiring stock and offer modeling.
- **Locks:** recommended meaning is preserve the recipe choice during regeneration, while still validating it and explaining conflicts from changed inputs.

The first three choices were asked in this review. Until answered, these are recommendations, not accepted implementation requirements.

## Minimum regression coverage for the repair

- An excluded ingredient never appears through ordinary generation, expiry placement, locks or replacement without an explicit reported blocking conflict.
- Incomplete or incompatible nutrition cannot pass as a complete calorie estimate.
- Already-covered pantry requirements and multiple lots are handled without inventing consumption or false missing-slot failures.
- A simple cheaper feasible week is found in the 700-to-70 Kč fixture, or a truthful bounded-search result is returned without certifying invalidity as success.
- Replacement evaluates calorie tolerance and weekly cost, and updates dependent reasons.
- Plan validity and warning details survive GET/reload; changing inputs makes old evaluations visibly stale.
- Cost and quantities agree between API, grid, detail and replacement preview, including fractional units and missing portions.
- Delayed responses, conflicting mutations and navigation cannot downgrade a newer plan revision in the client cache.
