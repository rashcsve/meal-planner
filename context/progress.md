# Progress

Short status only. Full entries (decisions, tests, verification) live in
[progress-archive.md](progress-archive.md) — read one only when the current step depends on it.

**Next step:** R05 — preview, accept, swaps and concurrent edits (slices not yet split).

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

## Earlier milestones

- Steps 1–27, 27.1, 29, 29.1, 30 — complete
- Step 28 (plan persistence) — blocked
- Step 31 (meal detail rail) — awaiting review
- R01 (contracts, regression cases) — awaiting review
- R02 (quantities, nutrition, recipe writing) — in progress
- R03.1–R03.4 (household targets and UI) — awaiting review

## Open follow-ups

- R04 — Decide if budget enforcement can be optional before checkout pricing exists.
- R04.8 — Staleness ignores pantry changes and the date, so expiry violations go stale unnoticed.
- R04 — Expiry slots are still protected from search; unprotect once expiry coverage is in the comparator.
- R04 — One systematic run beats 7–8 of 10 legacy seeds at 20/50 recipes, mid-pack at 5; only
  best-of-10 beats it (see R04.13). Multiple starts only if that gap is worth the extra work.
- R05 — `search` summary is generate-only by decision (not saved, not on GET). Revisit if the
  UI needs the stop reason after reload.
- R05 — If the search runs over a saved week with gaps, decide whether it may fill empty
  slots (and whether an over-budget fill beats leaving it empty). See R04.12.
- R05 — `setSlotLocked`/`replaceSlot` don't re-evaluate, so stored violations go stale
  (GET still says `current`). Fix: extract an evaluate-existing-slots function.
- R07 — Ingredient edits (`ingredients.updated_at`) don't mark plans stale. Deliberate for now.
- R07 — Partial deletes and `now()`-is-transaction-start both miss staleness.
  Fix: per-category version counter.
