# Progress

Short status only. Full entries (decisions, tests, verification) live in
[progress-archive.md](progress-archive.md) — read one only when the current step depends on it.

**Next step:** R06.7+ (next screen).

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
| R05.10a | Optimistic lock/unlock: instant flip, rollback on error, older responses ignored, refetch on settle | complete 11-03 |
| R05.10b | Rail "Lock" button on filled, unlocked slots; lock failure shows its own error | complete 11-03 |
| R05.11a | E2E harness (Playwright + Testcontainers, real api + web) + empty-week smoke journey | complete 11-03 |
| R05.11a2 | Harness hardening: free-port check, teardown on failed setup, kill timeout, e2e in typecheck + lint | complete 11-09 |
| R05.11b | Preview → accept journey; shared fixture truncates tables and seeds via API (member via SQL) | complete 11-09 |
| R05.11c | Cancel-swap journey: picker opened from the rail, Cancel writes nothing (revision + slots via GET) | complete 11-09 |
| R05.11d | Stale-preview journey: budget changed via API before Accept → "Preview again" → second Accept saves | complete 11-09 |
| R05.11e | Empty-slot journey: week saved with an empty dinner, filled from the picker; revision +1, snapshot matches choice | complete 11-09 |
| R05.11f | E2E runs against `vite build` + `vite preview` (temp outDir, removed on teardown); smoke test asserts built bundle | complete 11-09 |
| R05.11g | CI `e2e` job: installs Chromium, runs `npm run test:e2e`, uploads `e2e/test-results` on failure | complete 11-09 |

## R06 — Use It Up design refresh

| Step | What | Status |
| --- | --- | --- |
| R06.1a | v1 colour + radius tokens; old colour names alias v1 values | complete 11-09 |
| R06.1a2 | Story tests load Tailwind (a11y contrast now real); `faint` aliases `muted` — v1 `subtle` #A8A29E fails AA as text | complete 11-09 |
| R06.1b1 | Inter, 14px base, six v1 type-role utilities; `type-label/num/name` rewritten (no uppercase, tracking, stretch); old `text-9…34` kept | complete 11-09 |
| R06.1b2 | Raw `uppercase` / `tracking-*` classes and `--tracking-flag` removed; stories assert no caps or letter-spacing | complete 11-09 |
| R06.1c1 | Button: 44px, 6px radius, 14/500; primary/secondary/destructive (renamed at all call sites); 2px lock focus | complete 11-09 |
| R06.1c2 | Input + Select (and SearchInput via Input): 44px, 6px radius, v1 border, 14/400, Button's focus ring | complete 11-09 |
| R06.1c3 | FlagTag + ReasonTag: 12/600 on tint, 4px radius; `save` tag danger → ok | complete 11-09 |
| R06.2 | 56px top menu replaces sidebar (Plan → `/week`, Fridge → `/pantry` until R06.3); Household link; keys 1–7 by menu order; `/today` coming soon | complete 11-09 |
| R06.3 | `/week` → `/plan`, `/pantry` → `/fridge`; rename only, no redirects (no old links in use) | complete 11-09 |
| R06.4 | `?` toggles a native `<dialog>` listing keys 1–7 + `?` (labels from `navItems`); Kbd restyled to v1 (12/500, 4px) | complete 11-09 |
| R06.5 | DishPhoto primitive: `<img>` (cover, 8px) or fill tile with the name; no photo data yet, every recipe gets the tile | complete 11-09 |
| R06.6 | Fridge restyled: v1 card, "N items" + h1, 3px expiry bar (Table-wide), toned expiry date, fridge copy; loading `role=status`; first stories | complete 11-09 |
| R06.6b | Fridge "Add to the fridge" form: typed item, own suggestion list (ignores case + diacritics), base-unit amount, optional expiry; loaded + empty states; `useIngredients` → `shared/api` | complete 11-09 |
| R06.6c | Fridge item suggestions: keyboard — ↑/↓ highlight (no wrap, `aria-activedescendant`), Enter picks without submitting, Esc closes keeping text | complete 11-09 |
| R06.7a | Recipes: "N recipes" + h1 on page background in every state; loading `role=status`; table kept; first stories | complete 11-09 |
| R06.7b | Recipes card grid (DishPhoto, title, "kcal a portion · min", sentence-case tags) replaces the table; "Sort by" select: name, quickest, fewest kcal, cheapest | complete 11-09 |
| R06.7c | "Add a recipe" tile: first grid item in every loaded state (incl. empty / no match), opens the inline form; toolbar "Add recipe" button removed | complete 11-09 |
| R06.7d | Filter chips restyled (44px, 6px, 14/500, white + border / ink when pressed, lock focus, wrap); own row, group "Filter recipes"; same 9 chips | complete 11-09 |
| R06.7+ | Remaining screens | not started |

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
