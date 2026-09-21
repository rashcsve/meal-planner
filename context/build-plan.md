# Meal Planner — revised build plan: Use It Up

Updated 2026-09-21. **Planning only; implementation has not started.**

This replaces the active roadmap using `MASTER-PLAN-v2.md` and the product decisions
agreed in conversation. The user explicitly wants the repository plan updated and
reviewed before code changes begin. Do not treat this document as an instruction to
execute all steps now. Implementation resumes only when the user asks for a build step.

The previous numbered plan is preserved in [build-plan-v1.md](build-plan-v1.md).
Existing progress entries and commits retain their old step numbers. New work uses
`R01`–`R14`, so historical step 31 is not confused with step 31 in the supplied v2.
Each R step is a milestone to break into small, explained implementation slices;
it is not a request for one large diff or an automatic commit.

## Sources and precedence

1. Explicit user decisions in this conversation, recorded below.
2. This revised plan: requirements, dependencies, acceptance criteria and open decisions.
3. Supplied `MASTER-PLAN-v2.md`: learning goals and feature coverage, mapped below.
4. Design 5, **Use It Up**, bottom row **Now**, in the supplied design HTML.
   Mobile boards supply layout only: ignore their older lunches/macros content.
5. [planner-logic-review.md](planner-logic-review.md): findings to verify against code,
   not a claim that proposed repairs have already been made.
6. [r01-fixtures.md](r01-fixtures.md): representative examples and test impact for R02's
   portions/yield/nutrition work and R04's exclusion/lock consistency work, each checked
   directly against current code, not assumed from the review above.
7. [r04-search-quality.md](r04-search-quality.md): the proposed severity-aware search
   ordering, required comparison fixtures and work-limit measurement methodology for R04,
   grounded directly in the current `localSearch`/`isBetter`/`scorePlan` implementation.

Mock values, prototype scripts, suggested prompts and model-accuracy examples are
reference material. They are not tested business rules or measured results.

## Confirmed current baseline

- Existing stack: Hono/TypeScript, Drizzle/PostgreSQL, React/Vite/Tailwind,
  TanStack Query and the `shared/` contracts workspace. Keep it.
- The planner already generates **seven dinners**, not fourteen slots.
- Current portions are derived from each member's dinner calorie target and rounded
  to quarter servings. Fixed shares are not implemented.
- Recipe/ingredient data, pantry rows, household settings, ingredient preferences,
  ingredient prices, plan persistence and revision checks already exist.
- Weekly grid, household forms and a detail rail with replacement are implemented.
  The rail is historical step 31; it is called step 30 in the supplied v2.
- Ingredient quantities belong to each recipe's original yield. Do not reinterpret
  them as per-portion amounts without an explicit migration or calculation boundary.
- Planning currently discards stock quantities, uses estimated recipe costs,
  persists generated results immediately, and does not persist generation violations.
- Known gaps include incomplete nutrition presented as a total, expiry placement
  bypassing ordinary eligibility, partial replacement validation, and cache recovery.
- Shopping, cooking/stock history, reviewed imports, scheduled leaflets, authentication
  and the new visual design are future work.

Evidence: `api/src/services/{planner,plan-inputs,plans,nutrition}.ts`,
`api/src/db/schema.ts`, `shared/src/{planner,household,plans}.ts`,
`web/src/features/{week,household}/`, and [architecture.md](architecture.md).

## Agreed product decisions

### Portions and calories

- One household calorie target per standard dinner portion, with a fixed ±10% band.
- Each member has a fixed portion share; the planner does not change it to fit a recipe.
- Example: target 520 kcal, shares 0.75 and 1.5. Select recipes with 468–572 kcal
  per standard portion, then cook 2.25 portions. The numbers are examples, not an
  instruction to overwrite the household's actual configuration.
- The same recipe is shared by the household. No separate recipe per member.
- Existing saved plans retain their original stored portions. The new model applies
  to newly generated plans; any conversion of an existing plan must be explicit.

### Trust and planning

- An incomplete recipe can be saved. Saving does not certify eligibility for planning.
- Unknown or partial nutrition cannot pass as a complete calorie estimate.
- Use the same rule definitions for generation, expiry suggestions, retained locks,
  replacement previews and final validation.
- Prioritize soon-expiring food and warn about unused food; do not break another rule
  to force its use. Ingredient presence alone does not prove all stock will be used.
- Generate a preview; only acceptance changes the saved plan. Rejected/failed previews
  leave the current plan intact. Warnings remain visible after reload.
- Show the consequences of a swap before confirmation. Document which rules permit
  an explicit override; never silently treat an overridden warning as compliance.

### Planning search: systematic improvement, not 500 random attempts

- Replace the fixed 500 random single-dinner attempts with systematic improvement:
  examine eligible replacements for every changeable dinner and apply the best
  strict improvement to the whole week. Re-evaluate after each accepted change.
- Prefer satisfying rules and reducing unresolved problems before improving variety,
  speed or other preferences. Measure problem severity as well as violation count:
  reducing an estimated overspend from 900 to 800 Kč against a 700 Kč budget is
  progress even though both results still have one budget violation.
- Stop after a complete pass finds no improvement, or when a measured maximum work
  budget is reached. Neither outcome proves global optimality or impossibility.
  Independently validate the final result and explain remaining problems.
- Compare this approach with the initial plan and the current random-search strategy
  using common fixtures and explicit quality/runtime measurements before rollout.
  The number 500 is a legacy implementation choice, not an acceptance criterion.
- A language model does not decide whether a plan is valid. More advanced search or
  a constraint solver is deferred unless measurements show the simpler approach is
  insufficient. AI suggestions, if added later, still pass deterministic validation.

### Stock and shopping

- Planning calculates demand; it does not deduct or physically reserve stock.
- Cooking deducts actual consumed quantities. Repeated requests must not deduct twice.
- Shopping covers remaining uncooked meals and subtracts usable stock once across
  the whole plan, not independently for every recipe.
- Keep mathematical recipe demand, cooking adjustments and purchased quantities
  separate. A purchase rounding rule must not silently change recipe nutrition.
- Meal cost and checkout spending are different figures; label their basis and unknowns.
- Start with shopping grouped by aisle; add shop allocation once offers are available.
- Preserve cooking/history facts when recipes, member shares or offers change later.

### Scope and delivery

- One household; dinner only; kcal only; responsive web app.
- Pasted-text recipe import first, with review before use. Deterministic code owns
  quantities, nutrition, money, inventory and rule checks. Models extract drafts.
- Core correctness before offer automation. Improve the existing application incrementally.
- Defer lunches/leftovers, macros, recipe link/photo import, offline shopping, native
  mobile and multiple households. Preserve existing member preference data while
  per-person allergy management is out of the new UI scope.
- Keep the old recipe yield and ingredient source data. A blanket ban on storing
  scaled amounts does not apply to immutable records of what was actually cooked.

## Decisions to finish at the relevant milestone

These are recommendations or unresolved details, **not silently approved requirements**.
They should not block unrelated documentation or preparatory analysis.

| Decision | Recommended default / work needed | Resolve before |
| --- | --- | --- |
| Initial target and share values | **Resolved in R01** — see "R01 resolutions" below. | R01/R03 migration |
| Recipe amount storage | **Resolved in R01** — see "R01 resolutions" below. | R02 |
| Cooking adjustments | **R02-scoped slice resolved in R01** — see "R01 resolutions" below. Ingredient-specific indivisible-amount adjustment mechanics remain open for R08. | R02/R08 |
| Budget before offers | Keep existing budget data; label recipe-cost estimates. Missing costs cannot prove compliance. Decide whether enforcement is optional before checkout pricing exists; zero must not secretly mean disabled. | R04 |
| Rule overrides | Never-plan ingredients and invalid quantities remain blocked. Time preferences may be overridden with acknowledgement; decide calorie/budget overrides explicitly. | R04/R05 |
| Locks and changed rules | Preserve user intent; report conflicting locks and require repair or an allowed explicit override. Do not silently drop a lock or certify a conflict. | R04/R05 |
| Legacy plan editing | **Resolved in R01** — see "R01 resolutions" below. | R03/R05 |
| Selected days / copy last week | Omitted days must have defined semantics. Recommend copying assignments into a new draft, then evaluating current rules/stock; preserve cooked records. | R05 |
| Dates and expiry | Use household timezone for today and actual planned dates for weekdays. Define expiry-day inclusion, past days, and expired stock eligibility. | R04/R08 |
| Cupboard ingredients | Explicit stock or explicit staple policy; no implicit unlimited stock. | R07/R09 |
| Shopping checks | Stable item identity, shared between Shopping and Today; define persistence and what resets when quantities change. Checks do not add stock automatically. | R09 |
| Waste tally | Define whether the monthly figure counts actions, lots or quantities; never sum incompatible units. Define partial removal and Undo semantics. | R08 |
| Shop choice | Lowest known basket cost subject to a hard maximum number of stops; distance as tie-breaker; savings threshold for another stop. Define missing prices, pack sizes, purchase dates and conditional offers. | R12 |
| Public deployment | Decide private single-household access versus a public service. Auth before exposure; no automatic JWT choice or multi-household framework solely for hypothetical native mobile. | Before exposure; R14 at latest |

### R01 resolutions

Four rows above were flagged as blocking R02/R03. Resolved 2026-09-21, by user decision
where the choice was a real product/data tradeoff, otherwise finalized directly because
the row already restated a decision recorded elsewhere in this document.

**Initial target and share values.** For a household with existing per-member dinner
targets and no shares yet, migration proposes a household target equal to the **maximum**
of the existing per-member targets (the largest eater defines the recipe's standard
1.0-share portion), then computes each other member's proposed share as
`round((memberTarget / proposedHouseholdTarget) / 0.25) × 0.25`, clamped to 0.25–4.
Example: existing targets 500 and 800 → proposed household target 800, shares 1 and 0.75.
A household with no existing members/targets (a genuinely new household) defaults to
target 520, share 1, per the plan's original proposal. Proposed values are shown on
`/household` for explicit confirmation before the fixed-share model is used for planning;
until confirmed, planning keeps using the current per-member-target model — confirmation
gates the new model, it does not block the app.

Once a member's share is confirmed, it becomes its own independent setting: editing that
member's legacy per-member dinner-calorie target afterward does **not** recompute or
re-propose their share, and does not mark it unconfirmed again. This matches the plan's
own rule that shares are a fixed, deliberate choice the planner never adjusts to fit a
target — the same must hold for the person setting the share, not only for the planner.
The legacy target field and the confirmed share are two separate settings from the moment
of confirmation onward, not one derived from the other.

**Recipe amount storage.** Preserve each ingredient line's source quantity and the
recipe's original yield/serving count exactly as entered; never normalize or pre-divide
at write time. Every per-portion value (calories, ingredient demand, estimated cost) goes
through one shared calculation — `sourceAmount / recipe.baseServings × targetServings` —
the same ratio `validateWeeklyBudget` already uses, extended to be the single call site
for this division rather than duplicated per feature. This closes the row by rejecting
the "normalize storage instead" alternative outright: it existed only as a fallback, and
nothing in R02's scope needs it.

**Cooking adjustments — R02-scoped slice.** R02 must keep internal demand math exact
(no intermediate rounding baked into calorie/cost/demand calculations); rounding happens
only at the existing quarter-serving boundary or at final display. R02 does **not** build
the "explicit ingredient-specific adjustment for indivisible cooking amounts" feature —
that mechanism, and what happens when actual cooking amounts change, remain open and
belong to R08. This resolution only removes R02's blocker: don't design R02's math in a
way R08 would have to unwind.

**Legacy plan editing.** The user confirmed there is no real production data in the app
yet. R03 therefore does not need dual-path editing compatibility for plans generated
before the fixed-share model — existing dev/test household and plan data can be deleted
and regenerated fresh once R03 ships, rather than building a compatible-editing or
conversion-preview path against data nobody needs preserved. This is a scope reduction
for *this* deployment's current data only, not a reversal of the general principle
(`CLAUDE.md`, `build-plan.md`'s "Scope and delivery" section: "Preserve existing recipe
IDs... do not invent missing history") — the general preserve-real-data rule still applies
the first time this app holds data worth keeping, and should be revisited explicitly then,
not assumed solved by this resolution.

## Build order and coverage

All milestones below are **planned — not started**. R01 is the next proposed step.
Dependencies override the order in the supplied v2: portion and nutrition contracts
must exist before a picker can truthfully say whether a dinner fits.

| Milestone | Result | Supplied v2 coverage |
| --- | --- | --- |
| R01 | Confirm contracts and reconcile existing work | 27–34, 39–40; current logic review |
| R02 | Reliable quantities, nutrition and recipe writing | 21–24, 40; prerequisites for 41/48 |
| R03 | Fixed household shares with preserved legacy plans | 34, 39–40 |
| R04 | Shared planning rules and complete evaluation | 27–30, 34; known correctness repairs |
| R05 | Preview/accept, informed swaps, locks and regeneration | 30–33, behavior behind 38 |
| R06 | Use It Up tokens, shell and existing screen layouts | 35–38 |
| R07 | Recipe detail with consistent scaling | 41; stock-source labels depend on R08/R09 |
| R08 | Stock movements, cooking, reasons and Undo | 42 |
| R09 | Aisle shopping and Today | 43–45 |
| R10 | Pasted recipe import, review and call records | 46–49 |
| R11 | Manual leaflet imports, safe review and measured extraction | 50–54; manual foundation for 56 |
| R12 | Confirmed ingredient matching and shop shopping | 55–57 |
| R13 | Scheduled leaflets, retention and quality reporting | 53, 56, 58 |
| R14 | Mobile completion, access control and release | 59–63 |

### R01 — Confirm contracts and prepare regression cases

**Goal:** make the next code change concrete without silently choosing product policy.

**Modules:** `context/`, relevant `shared/src` schemas, planner/nutrition/plan tests.

**Changes:** reconcile the verified baseline and legacy step IDs; finish the decisions
needed by R02/R03; specify representative examples for portions, original yield,
missing nutrition, pantry exclusions, locks, legacy plans and stale revisions.
Read existing tests before adding coverage. Identify old behavior tests that must
change deliberately and invariants that must remain unchanged.
Define the search-quality ordering and comparison fixtures before R04: rule
violations/severity first, then agreed preferences. Include incremental budget repair,
locked meals, empty slots and a case requiring coordinated changes. Specify the
runtime/quality measurements used to choose a work limit; do not invent a new magic
iteration count. Break the R04 work into small rule, search and measurement slices.

**Dependencies:** user review of this plan and instruction to begin this milestone.

**Verification / done:** agreed input/output examples and bounded implementation
slices. When regression tests are added, record which reproduce known failures;
do not call a failing suite a finished implementation.

**Risk / rollback:** documentation and tests first; no schema/data migration in R01.

### R02 — Reliable quantities, nutrition and recipe writing

**Goal:** the planner can distinguish a complete recipe from a saved draft.

**Modules:** `api/src/services/nutrition.ts`, `api/src/lib/units.ts`, recipe repositories,
services/routes, `api/src/db/schema.ts`, `shared/src/recipes.ts`, recipe UI/tests.

**Changes:** expose complete/partial/unknown nutrition; require compatible nutrition
units or explicit conversions; preserve original yield/source amounts; centralize
exact scaling for calories, ingredient demand and estimated recipe cost. Add reviewed
ingredient-line/yield writing and editing needed by detail/import flows. Keep missing
amounts editable rather than inventing them. Archive recipes before physical deletion;
define the historical snapshot/version data required before edits can affect old meals.

**Dependencies:** R01 quantity and history decisions.

**Verification / done:** known fixture totals agree across API and UI; one missing
caloric ingredient cannot certify the target; ml/pcs are not interpreted as grams;
unknown yield remains unresolved; small quantities remain visible; source amounts and
historical references survive migration. Add API tests for recipe ingredients/edits.

**Risk / rollback:** additive migration and preserved source data. No guessed backfill
of quantities or nutrition; old readers must remain compatible during deployment.

### R03 — Fixed portion shares, end to end

**Goal:** new weeks use a standard-portion target and fixed member shares.

**Modules:** household/planner contracts in `shared/src`, DB schema and generated
migration, household repositories/services/routes, `plan-inputs.ts`, household form,
`MemberTargetRow.tsx` (rename if useful), household query hooks and tests/stories.

**Changes:** add household target and member share fields with API and DB validation;
retain old target fields and saved `memberServings`; show the new controls and total
portions. Store the calculation policy/settings used by new plans, bump the planner
version, and distinguish legacy plans without interpreting old values under new rules.
Changing settings must invalidate dependent candidate/evaluation queries, not silently
rewrite accepted plans. Add member creation/editing required by the household screen.

**Dependencies:** R02 reliable calories/scaling; R01 defaults and legacy edit policy.

**Verification / done:** 520 target admits 468 and 572, rejects values outside the band;
shares 0.75/1.5 remain fixed for different eligible recipes; APIs reject invalid shares;
setting changes do not alter a saved week's portions. Migration fixture retains all
old recipe IDs, yields, legacy calorie targets, preferences and saved assignments.

**Risk / rollback:** deploy schema additively; no deletion of legacy fields. Gate new
planning until API/UI support it together. Reverting readers must not reinterpret v2 data.

### R04 — One planning rule set and a trustworthy result

**Goal:** automatic choices, expiry suggestions, locks and replacements agree on validity.

**Modules:** `planner.ts`, `plan-inputs.ts`, `plans.ts`, planner contracts, DB evaluation
fields or reliable evaluation storage, plan/planner tests.

**Changes:** implement standard-portion eligibility and weeknight time policy; remove
requirements for nonempty offers or exclusions; distinguish unknown costs from zero.
Evaluate retained locks and final assignments independently. Expiry is a preference:
never bypass exclusions or calorie rules; check existing coverage before suggesting
another meal. Until lot allocation exists, describe ingredient presence honestly.
Repair search comparisons so decreasing an overspend can improve an infeasible result.
Persist evaluation warnings/status and the input versions used; mark stale evaluations
when inputs change. Stabilize ordering, date semantics and algorithm versioning.

**Search procedure:**

1. Build candidate sets using the shared eligibility rules and form an initial week.
   Preserve explicit locks; report conflicting locks rather than silently replacing them.
2. For each unlocked dinner, evaluate every eligible alternative against the whole
   week. Skip the currently assigned recipe. Include filling an empty unlocked slot.
   Meals suggested for expiry remain changeable; expiry is a preference, not a lock.
3. Apply the single best strict improvement under the agreed quality ordering, with
   a stable tie-break. Recompute comparisons against the changed week for the next pass.
   Soft preferences cannot compensate for breaking a hard rule in a valid plan.
4. Stop when a complete pass finds no improvement, or when the configured evaluation
   budget is exhausted. Choose that budget from measurements; count actual candidate
   evaluations. Distinguish these stop reasons and record passes/evaluations/time.
   A runtime safety cutoff, if needed, is reported separately from normal completion.
5. Independently validate the final week. Return the preview and unresolved problems;
   finding no single-dinner improvement does not prove this is the best possible week.

**Comparison before rollout:** measure the initial week, legacy random-search strategy
and systematic strategy using the same eligible inputs, initial assignment and corrected
rule evaluator. Keep characterization of the untouched legacy algorithm separate, so
rule repairs are not mistaken for gains from a different search method. Compare valid
weeks found, violation severity, estimated cost, expiry coverage, variety, evaluations
and elapsed time; use multiple seeds for the random baseline. Amount-level waste metrics
wait for R08 allocation. Use small exhaustively checkable cases as an additional reference.
If important fixtures require coordinated changes, record the limitation and evaluate
multi-dinner moves, multiple starts or a constraint solver as a separate bounded proposal.
Do not add an LLM call or a solver dependency as part of this initial search replacement.

**Dependencies:** R03; budget, expiry, lock and override policies in R01/decision table.

**Verification / done:** exclusion-through-expiry, already-covered expiry, duplicate
lots, conflicting locks, unknown nutrition/costs, empty offers/exclusions, budget-repair
and deterministic replay fixtures pass. Search failure is not reported as proof that
no solution exists. Warning details survive GET/reload. Tests also cover selecting the
best available single-dinner improvement, stable ties, unchanged locks, filling empty
slots, changing expiry-suggested meals, stopping on no improvement and stopping at the
work limit. Comparison results justify the chosen work limit and identify remaining
quality limitations; 500 attempts and a faster runtime alone are not success criteria.

**Risk / rollback:** keep the prior saved plan while trying the new algorithm; do not
advertise amount-level stock coverage before R08. Keep recipe-cost and checkout-cost
rules separate. Replay needs the ordered inputs/version, not only a seed.

#### R04 implementation slices

Written 2026-09-21 as R01's last deliverable ("break the R04 work into small rule, search
and measurement slices"). Each slice below targets one bounded diff, independently
verifiable, per `CLAUDE.md`'s one-small-step rule. Slices citing
[r01-fixtures.md](r01-fixtures.md) or [r04-search-quality.md](r04-search-quality.md) already
have a concrete design to implement against; slices marked **needs a decision first** still
have an open row in this document's "Decisions to finish" table that R01 did not resolve
(only four rows were in R01's scope) — resolve that row at the start of the slice, the same
way R01 resolved its own four, not by guessing during implementation.

**Rule slices**

1. **R04.1 — Empty price catalog / empty exclusions are valid states, not errors.**
   `EmptyPriceCatalogError`/`EmptyPreferencesError` currently throw whenever either list is
   empty (`planner.ts`'s `plan()` guard clauses), conflating "genuinely no promos this week"
   / "household has no exclusions" with "settings were never configured." Distinguish the
   two; only the latter should still block generation.
2. **R04.2 — Fix pantry-exclusion bypass.** Implements [r01-fixtures.md §4](r01-fixtures.md)'s
   proposed fix exactly: filter `resolveExpiryConstraints`'s candidate recipes through
   `ctx.eligibleRecipesBySlot` instead of the raw recipe list.
3. **R04.3 — Fix locked-slot-already-covers-expiry false violation.** Implements
   [r01-fixtures.md §5](r01-fixtures.md)'s proposed fix: precompute `lockedIngredientIds`
   from `locked` only, skip already-covered constraints before searching for a placement.
4. **R04.4 — Generalize "existing coverage" beyond locked slots.** R04.3 deliberately
   excluded must-use placements made earlier in the same run and the still-open
   "two same-ingredient pantry lots" case (no quantity/lot tracking exists before R08) — this
   slice decides and implements how far "check existing coverage before suggesting another
   meal" extends without pretending to solve lot allocation early. **Needs a decision
   first**, since the plan text only says "check existing coverage," not how to define it
   without quantities.
5. **R04.5 — Distinguish unknown recipe cost from zero cost.** **Needs a decision first**
   — the "Budget before offers" row in this document's decision table (still open, tagged
   R04) covers exactly this: whether a recipe with unknown cost is excluded from planning
   (today's behavior, via `plan-inputs.ts` omitting it) or included with an explicit
   "unknown" cost status that budget validation must handle without silently reading it as
   zero.
6. **R04.6 — Real weekday/timezone-aware date semantics.** **Needs a decision first** — the
   "Dates and expiry" row (still open, tagged R04/R08): derive actual weekdays from the
   requested week-start date for weeknight scoring, and use `household_settings.timezone`
   (already stored since step 30, not yet read by planning) for "today" when computing
   pantry expiry deadlines.
7. **R04.7 — Report conflicting locks instead of silently keeping them uncontested.**
   **Needs a decision first** — the "Locks and changed rules" row (still open, tagged
   R04/R05): when a locked slot's recipe now fails current eligibility (a new exclusion, a
   changed target), what "report a conflict" means operationally (a violation entry? a
   distinct plan status?) before implementing it.
8. **R04.8 — Persist evaluation status, input versions and staleness.** Schema work
   (additive migration) plus service logic: store `violations`/evaluation status and the
   input versions used at generation time on `plan_weeks` (today, `plans.ts:92` returns
   violations in the response only — nothing persists them, so a reload loses them); mark an
   evaluation stale when recipes/targets/exclusions change since. Likely splits further into
   a migration slice and a service-logic slice once started, given its size.

**Search slices**

9. **R04.9 — Add `severity` to `PlanViolation`.** Populate it in
   `validateMemberDinnerCalories`/`validateWeeklyBudget` using
   [r04-search-quality.md](r04-search-quality.md)'s formulas. Purely additive — violation
   *counts* and existing test expectations for counts/messages are unaffected.
10. **R04.10 — Replace `isBetter`'s two-tier comparison with the three-tier comparator**
    (violation count → severity sum → score), keeping the existing input-order tie-break
    unchanged. Depends on R04.9. New tests from the "incremental budget repair" fixture in
    r04-search-quality.md.
11. **R04.11 — Replace the 500-random-attempt loop with the systematic per-dinner pass**
    (examine every eligible replacement for every changeable dinner each pass; apply the
    single best strict improvement; repeat until a pass finds none, or the measured work
    budget from R04.14 is hit). Depends on R04.10.
12. **R04.12 — Let the systematic pass reconsider empty slots**, not only the one-time
    `fillRemainingSlots` fill before search starts, per the "empty slots" fixture in
    r04-search-quality.md. Depends on R04.11.

**Measurement slices**

13. **R04.13 — Build and run the comparison harness** (initial week vs. legacy random
    search vs. new systematic search) over the four required fixtures in
    r04-search-quality.md plus recipe-library sizes anchored to this household's real scale.
    Record evaluations-per-pass, passes-to-convergence and wall-clock-per-evaluation in
    `progress.md`. Depends on R04.10-R04.12 existing to compare against.
14. **R04.14 — Choose and document the actual work-limit number from R04.13's measured
    data**, wiring it in as the systematic search's stopping condition, kept distinct from a
    separate wall-clock safety cutoff. Cannot start before R04.13 produces real numbers —
    this is the one place a concrete constant enters the code, and only after measurement.
15. **R04.15 — Independent final validation and honest convergence reporting.** Run a full
    validation pass after search stops; report "no improvement found" distinctly from "hit
    the work budget," and neither as proof of a global optimum. Includes the store-count
    coordinated-change fixture (r04-search-quality.md §4) asserting the search honestly
    reports convergence rather than silently claiming an unreachable optimum.

### R05 — Preview, accept, swaps and concurrent edits

**Goal:** experimentation changes the saved plan only after deliberate confirmation.

**Modules:** plan routes/services/repositories/contracts; `features/week` query hooks,
week page, detail rail and new swap picker; integration and browser journey tests.

**Changes:** separate preview from acceptance for generation and regeneration. Validate
plan revision and relevant input versions at acceptance; stale previews need review.
Support selected days and copy-last-week under the agreed semantics. Candidates return
fit, violated rules and consequences, with paging for full browsing and three ranked
rail suggestions. Define stable tie-breaking (fit, then calorie closeness for suggestions).
The picker lives at `/plan/:week/swap/:slotId`; back/cancel does not mutate the week.
Explicitly handle empty slots. On confirmation, revalidate the full result and update
neighboring reasons/summaries. Add optimistic lock/unlock with cancellation, rollback,
conflict recovery and protection from delayed responses overwriting newer revisions.

**Dependencies:** R04; historical editing/snapshots from R02/R03.

**Verification / done:** preview/cancel has no writes; acceptance is atomic; warnings
persist; legacy portions stay intact; swap consequences match committed values; lock
and regeneration races return conflicts without lost updates. Add focused browser
journeys for preview → accept, cancel swap, stale preview and empty-slot replacement.

**Risk / rollback:** retain existing revision checks/tests. Feature flags may separate
new preview APIs/UI during rollout. Never silently convert legacy plans or remove
existing editing functionality without the agreed compatibility path.

### R06 — Use It Up design refresh

**Goal:** build subsequent screens in the chosen design while retaining working flows.

**Modules:** design section of `CLAUDE.md` at implementation time, `web/src/index.css`,
shared primitives/stories, shell/router, existing recipe/fridge/plan/household views.

**Changes:** first update tokens/primitives/reference route only: Young Serif display,
Figtree text, sage/terracotta, semantic expiry tones, 14/18/24/pill radii and 44px targets.
Then update layouts: top navigation (Today, Plan, Shopping, Fridge, Recipes, Import),
Household access and future spend slot; redirect `/week` → `/plan`, `/pantry` → `/fridge`
while preserving deep-link parameters. Keep shortcuts, move hints to a `?` sheet.
Add DishArt with a stable fallback palette and optional image. Give every built screen
loading/error/empty states; generation empty state uses R05's actual behavior.

**Dependencies:** R03–R05 contracts for the screens being restyled. Token work can be
an isolated slice once those contracts are agreed; do not mix logic changes into it.

**Verification / done:** Storybook/a11y checks and desktop/narrow browser journeys;
no broken old links, invisible focus, clipped rails or inaccessible touch actions.
Use NowPlan, NowGenerate, NowFridge, NowRecipes and NowHousehold as references.

**Risk / rollback:** separate token and layout changes. Plan mobile overflow/navigation
now, rather than undoing fixed desktop assumptions in R14. No blanket feature rewrite.

### R07 — Recipe detail

**Goal:** ingredients, cooking instructions and kcal agree at every portion setting.

**Modules:** recipe contracts/schema/services, recipe detail page, shared scaling helpers.

**Changes:** show original and normalized amounts, yield, target comparison, per-person
and whole-pan kcal, ingredient contributions and a portion stepper. Store method
quantity references rather than multiplying arbitrary numbers in free text. Attach
stock/cupboard/to-buy labels only when R08/R09 supply real allocation information.
Keep macro bars out of scope. Fix existing grid/detail cost and small-quantity mismatch.

**Dependencies:** R02/R03/R06; R08/R09 for stock attribution.

**Verification / done:** scaling updates ingredient amounts and supported method
references; time/temperature/step numbers do not change. Partial nutrition is labelled,
not shown as complete. No stock-source claims based solely on ingredient existence.

**Risk / rollback:** keep original text and source quantities; unstructured legacy
methods remain readable and explicitly unscaled where references are unresolved.

### R08 — Stock movements and cooking

**Goal:** the fridge reflects what was actually used or discarded.

**Modules:** pantry schema/repositories/services/routes/UI; cooking state on plans;
shared demand/allocation calculations; generated migrations and transaction tests.

**Changes:** track stock lots and quantity movements with reason, time and cooking
reference. Add partial used/binned actions, Undo, clear-expired and monthly tallies.
Mark cooked atomically and idempotently; allocate actual usage across lots, handle
shortfalls without negative stock, and preserve the consumption record. Define Undo
after later stock edits and reversal of cooking. Do not introduce a general event bus.

**Dependencies:** R02/R03 quantities and snapshots; date/tally/rounding decisions.

**Verification / done:** partial/multiple-lot consumption, repeated requests, concurrent
cooking, shortfalls, bulk removal and Undo restore the correct balances. Merely
planning/generating/swapping never changes physical stock.

**Risk / rollback:** backfill opening balances, not invented use/waste history. Keep
an audit trail and transaction rollback; test migration on a populated database copy.

### R09 — Aisle shopping and Today

**Goal:** answer what remains to cook and buy without requiring offers.

**Modules:** new shopping service/routes/contracts/UI, ingredient aisle field,
Today feature, shared query keys and demand/allocation helpers.

**Changes:** aggregate uncooked meal demand, allocate usable stock once, retain
subtracted quantities for the side panel, and group the shortfall by aisle. Keep
exact demand separate from whole-pack purchasing. Stable row identity supports
shared checkmarks and meaningful changes after a swap. Today shows tonight, reasons,
expiry warnings and whether a dinner includes an item, cooked/upcoming meals,
standard-portion average and shopping progress. Compose existing queries first.

**Dependencies:** R05/R08; shopping-check/cupboard decisions; R07 stock labels finish here.

**Verification / done:** shared ingredients are not double-subtracted; cooked dinners
stop contributing demand; partial stock creates only the shortfall; Undo restores
demand correctly; Shopping and Today agree after edits/reload under the chosen policy.
Unknown units/prices remain explicit. Basic shopping works with no price catalog.

**Risk / rollback:** derived lists must not destroy purchase/consumption history.
Offline sync remains deferred; client IDs/timestamps alone do not implement it.

### R10 — Pasted-text recipe import

**Goal:** paste → review → save is a useful, measured flow.

**Modules:** extraction adapter/config, draft storage, recipe writing APIs, import UI,
model-call records and top-bar spend display.

**Changes:** schema-validated extraction with original text retained; editable quantities,
units, yield and ingredient matches; plain-language uncertainty flags. Save incomplete
drafts without claiming planning eligibility. Saved screen offers a day picker through
R05 validation, plus archive/delete preserving existing meals. Record model, prompt
version, input hash, tokens, cost, latency and status from the first call. Measure a
baseline on real recipes; no promised accuracy/latency from mock screens.

**Dependencies:** R02/R05/R07; access controls before any public paid endpoint.

**Verification / done:** malformed output, timeout, missing yields, duplicate submission,
ambiguous units, correction and archive flows pass. Arithmetic remains deterministic.
Provider/API credentials stay server-side; hashes are not treated as anonymization.

**Risk / rollback:** incomplete extraction remains a draft; retries do not duplicate
recipes or unboundedly repeat paid calls. Manual recipe entry remains available.

### R11 — Manual leaflet imports and evaluation foundation

**Goal:** useful reviewed offers before unattended ingestion.

**Modules:** import/offer/source schema and repositories, parser/extraction services,
bulk review UI, labelled fixtures and evaluation scripts.

**Changes:** obtain a labelled set before measuring regex/heuristic baseline; then
measure model extraction per field. Version development versus held-out data.
Start with explicit manual source input, distinguishing pasted lines from PDF text
extraction and failed/scanned files. Bulk selection and garbage-row deletion are
different actions. Rows with unresolved critical price/unit/date facts can remain
saved drafts but must not silently become active offers. Stage source replacements,
validate, then atomically activate; never delete the working import first.

**Dependencies:** R10 extraction/logging infrastructure; offer contract decisions.

**Verification / done:** malformed price/unit/date, active selection across filters,
failed replacement, duplicate files and retry cases pass. Known working offers survive
failed imports. Accuracy claims come from recorded runs, not assumed percentages.

**Risk / rollback:** preserve prior active version; independent labelled records survive
import deletion. Define permitted source access before adding an acquisition connector.

### R12 — Ingredient matching and shopping by shop

**Goal:** compare real purchase options with explainable limits on travel.

**Modules:** confirmed aliases/matching service, offer eligibility, household shop
settings, basket calculation and Shopping UI; query invalidation and tests.

**Changes:** category/unit checks and confirmed matches first; add text similarity and
manual confirmation. Measure precision/recall; add embeddings/pgvector only if useful
or separately chosen as a learning goal. Add shop distance/on-off, max stops and savings
threshold. Account for purchase-date validity, pack rounding, missing prices and offer
conditions. Explain skipped shops and totals; snapshots preserve completed purchases.
The shopping service owns basket calculation; planner budget evaluation calls that
same calculation only when checkout-budget mode is explicitly introduced.

**Dependencies:** R09/R11; budget and shop-choice decisions.

**Verification / done:** hand cream cannot auto-match food cream; partial/no offers,
expiring prices, pack leftovers, stock subtraction, stop caps and savings thresholds
have hand-checkable fixtures. Unknown prices cannot create a false complete total.

**Risk / rollback:** retain aisle/unpriced shopping if offers fail. Preserve existing
price rows without inventing source provenance or discount baselines.

### R13 — Scheduled leaflets, retention and Quality

**Goal:** automate a proven manual flow and expose measured reliability.

**Modules:** source acquisition adapters, persisted job/import status, scheduler,
import operations, retained labelled data, evaluation history and Quality UI.

**Changes:** define how enabled shops' sources are located/downloaded; timezone-aware
schedule, idempotency, retry limits, timeouts, duplicate handling and manual retry.
Deleting imports invalidates current shopping; Undo restores the correct version;
completed shopping/labelled facts survive. Implement an explicit retention policy
(the supplied plan proposes offers 14 days after expiry and PDFs three months),
including what deletion means for Undo and evaluation provenance. Show per-field
metrics, baseline comparison, runs, costs and p95. Separate deterministic CI checks
from variable live model evaluations with documented regression tolerances.

**Dependencies:** R11/R12; source access, retention and evaluation policy.

**Verification / done:** interrupted/repeated jobs, failed downloads, deletion/Undo,
retention boundaries and current-list rebuilds pass. Live provider variance does not
randomly block ordinary code builds; measured regressions remain visible.

**Risk / rollback:** disable schedules per shop and fall back to manual imports.
No new infrastructure platform is required for a small number of scheduled sources.

### R14 — Mobile completion, access control and release

**Goal:** a usable private/authorized release with recovery paths.

**Modules:** responsive shell and feature screens; authentication/session API/UI;
production configuration, migrations, deployment artifacts, monitoring and README.

**Changes:** below 640px use bottom navigation and page scrolling; prioritize Shopping,
then Today, Plan, Fridge and Recipes. Include narrow-screen access to Household/import
flows. Choose session design from actual clients and exposure; add sign-in, signed-out
route states and sign-out-all-devices. Keep single-household authorization explicit;
do not infer a multi-tenant product. Prepare deployment, private database/secrets,
readiness, backups/restoration, redacted monitoring, measured README and demo.

**Dependencies:** completed core loop; auth moves earlier if anything is exposed.
An actual deployment still requires an explicit deployment instruction.

**Verification / done:** keyboard/touch and narrow browser journeys; authentication,
revocation and protected routes; production build/smoke checks; tested backup restore
and migration rollback/compatibility. Demo the real plan → shop → cook loop.

**Risk / rollback:** separate application rollback from data migrations; preserve
compatible readers and backups. Do not publish a local unauthenticated build.

## Verification and delivery rules

- Explain each slice before coding. Work in small steps and let the user review them.
- User instructions override document prompts. No automatic commit, push or deployment.
- `context/progress.md` records actual implementation and test evidence; this plan
  records desired behavior. Never mark a feature complete because its document exists.
- Generate migrations through Drizzle; inspect SQL before applying. Prefer additive
  changes. Destructive data changes need their concrete consequences reviewed first.
- Preserve existing recipe IDs, source amounts/yields, member/preference data, saved
  portions, plan revisions and concurrency behavior. Do not invent missing history.
- Reuse the current layer boundaries, shared schemas and query architecture. Local
  React state is appropriate for selection, forms and previews; no new global store.
- Use existing meaningful tests; add regression coverage for changed business rules,
  migration compatibility and concurrent writes. Update obsolete expectations explicitly.
- Per implementation slice, run appropriate checks from [code-standards.md](code-standards.md):
  `npm run typecheck`, `npm run lint`, API/Postgres tests and web/Storybook tests as affected.
  Report blocked checks honestly; do not rerun unrelated suites for documentation-only work.
- Review against actual design boards during UI work. Verify loading, empty, error,
  keyboard, focus, narrow layout and stale/conflict states as applicable.
- At the end of an implemented learning step, explain the result, how to verify it and
  ask three short understanding questions when following the supplied learning workflow.

## Estimates, not commitments

The supplied four-to-five-week budget is not a reliable commitment for the full scope.
Current rough estimates for one experienced developer: 20–35 developer-days for the
reliable core through shopping/Today, 40–70 total including imports/offers/scheduling,
mobile and release. These assume bounded source integrations and prompt decisions;
learning/review time increases calendar duration. Re-estimate after R01 and each
risky milestone rather than treating these numbers as acceptance criteria.
