# Progress

Short status only. Full entries (decisions, tests, verification) live in
[progress-archive.md](progress-archive.md) — read one only when the current step depends on it.

**Next step:** R05.10 — optimistic lock/unlock.

## R04 — planner correctness and search quality

| Step | What | Status |
| --- | --- | --- |
| R04.1 | Empty price catalog / exclusions are valid, not errors | complete 09-22 |
| R04.2 | Pantry-exclusion bypass fixed | complete 09-22 |
| R04.3 | Locked slot covering expiry no longer a false violation | complete 09-22 |
| R04.4 | "Existing coverage" generalized beyond locked slots (+ deadline-day follow-up) | complete 09-22 |
| R04.5 | Unknown recipe cost distinct from zero cost | complete 09-22 |
| R04.6a | Weekday derived from `weekStartDate` | complete 09-22 |
| R04.6b | Expiry constraints skipped for weeks not containing today | complete 09-23 |
| R04.7 | Conflicting locks reported, not silently kept | complete 09-23 |
| R04.8a | Schema for persisted violations + input-version watermarks | complete 09-23 |
| R04.8b | Violations and watermarks persisted at generation | complete 09-23 |
| R04.8c | Staleness computed on read | complete 10-13 |
| R04.9 | `severity` on `PlanViolation` | complete 10-13 |
| R04.10 | `isBetter`: violation count → severity sum → score | complete 10-14 |
| R04.11 | Systematic per-dinner pass replaces 500 random attempts | complete 10-14 |
| R04.12 | Empty slots: not a search case; contract test only, no search change | complete 10-14 |
| R04.13 | Comparison harness; systematic ties legacy on rules, trails best seed on score | complete 10-14 |
| R04.14 | Work limit: 10,000 evaluations per search, no wall-clock cutoff | complete 10-14 |
| R04.15 | Final validation of every filled slot; stop reason reported (converged vs work limit) | complete 10-15 |

## R05 — preview, accept, swaps and concurrent edits

| Step | What | Status |
| --- | --- | --- |
| R05.1 | Lock/unlock and replace re-evaluate stored violations (saved portions, `empty_slot`) + advance watermarks; incomplete household → `not_evaluated` | complete 10-15 |
| R05.2 | `POST /api/plans/generate/preview`: full plan + `baseRevision` + `inputVersions`, no writes; `/generate` kept until accept lands | complete 10-15 |
| R05.3 | `POST /api/plans/accept`: re-validates previewed slots; versions + revision checked in one transaction; locked slots keep saved portions | complete 11-03 |
| R05.4 | `plan_slots.recipe_snapshot` (jsonb) written on accept/generate/replace; locked slots keep their saved snapshot; GET returns it | complete 11-03 |
| R05.4b | Week rows and rail read `recipeSnapshot`, live recipe when NULL | complete 11-03 |
| R05.5a | Candidates carry whole-week `violations`; order: violation count → severity → score → calorie gap → recipe id | complete 11-03 |
| R05.5b | Candidates carry `consequences`: week cost + per-member dinner kcal, with deltas vs current (null if slot empty), integers | complete 11-03 |
| R05.5c | Candidates paged (`limit` 1–50, default 20; `offset`) + `total`; top-three `suggestions` skip the current recipe | complete 11-03 |
| R05.6 | Replace refreshes reasons on every filled slot (locked too; only reasons change); filling an empty slot pinned by test | complete 11-03 |
| R05.7a | `POST /copy-last-week/preview`: last week's recipes as a no-write preview; target locks kept; ineligible → empty; accept via `/accept` | complete 11-03 |
| R05.7b | Optional `days` on `/generate/preview`; unselected days keep their recipe (`locked: false`), portions recomputed as accept saves them; new week → empty | complete 11-03 |
| R05.8a | `PreviewBar` component + stories | complete 11-03 |
| R05.8b | Week page: Generate → preview → Accept / Try again / Discard; stale preview → "Preview again" | complete 11-03 |
| R05.8c | Direct-write `/generate` retired; weeks saved only via `/accept` | complete 11-03 |
| R05.9a | Swap picker at `/week/:week/swap/:day/:mealSlot`: paged candidates + consequences; Cancel writes nothing | complete 11-03 |
| R05.9b | Rail shows top-three `suggestions` + "See all options" link to the picker; empty slots too, locked none | complete 11-03 |

## Earlier milestones

- Steps 1–27, 27.1, 28, 29, 29.1, 30 — complete (28's blocker closed by 29.1)
- Step 31 (meal detail rail) — complete 11-03
- R01 (contracts, regression cases) — complete 11-03
- R02 (quantities, nutrition, recipe writing) — complete 11-03
- R03.1–R03.4 (household targets and UI) — complete 11-03

## Open follow-ups

- R05.7b — For a new week, the planner fills every day and unselected days are cleared after;
  selected days were chosen against those discarded neighbours (variety, budget, expiry).
- Unscheduled — Accept's version check runs at READ COMMITTED: an input edit committed after the
  check but before accept commits isn't caught. Same gap as lock/replace.
- Unscheduled (was R04) — Decide if budget enforcement can be optional before checkout pricing exists.
- Unscheduled — Staleness gaps: pantry changes and the date are ignored (expiry violations go
  stale unnoticed); ingredient edits (`ingredients.updated_at`) are ignored on purpose; partial
  deletes and `now()`-is-transaction-start are missed. Fix: per-category version counter.
- R04 — Expiry slots are still protected from search; unprotect once expiry coverage is in the comparator.
- R04 — One systematic run beats 7–8 of 10 legacy seeds at 20/50 recipes, mid-pack at 5; only
  best-of-10 beats it (see R04.13). Multiple starts only if that gap is worth the extra work.
- R05 — `search` summary is returned by `/generate/preview` only (not saved, not
  on GET, unused by web). Revisit if the UI needs the stop reason after reload.
- R05 — If the search runs over a saved week with gaps, decide whether it may fill empty
  slots (and whether an over-budget fill beats leaving it empty). See R04.12.
- R05 (no step yet; not done in R05.8b) — Web shows only preview violations; stored ones (after lock/swap,
  incl. `empty_slot`) appear only once the week page reads them.
