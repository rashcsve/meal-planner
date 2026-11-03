# Architecture

This records what the repository actually does, and decisions that resolve a
question the build plan leaves open. `AGENTS.md` and `.claude/rules/` have the
conventions everyone must follow; this file has the current concrete shape of the system.

[build-plan.md](build-plan.md) describes the Use It Up milestones (R01–R14);
[progress.md](progress.md) shows which are delivered. Household share proposal and
confirmation exist (`services/householdShares.ts`, `/api/household/share-proposal`,
`/confirm-shares`), but planning does not use shares yet. Descriptions below are about the current code; numeric step
references (e.g. "step 29.1") point to [build-plan-v1.md](archive/build-plan-v1.md).

## Layout

```
api/src/
  index.ts        entrypoint: builds the Hono app, mounts routes, exports AppType, listens
  config/         Zod-validated env (DATABASE_URL, PORT, NODE_ENV, LOG_LEVEL, CORS_ORIGIN)
  db/             drizzle schema (schema.ts) + pooled connection (index.ts)
  routes/         recipes.ts, ingredients.ts, pantry.ts, plans.ts, household.ts —
                  HTTP parsing/validation only
  services/       recipes, recipeIngredients, ingredients, pantry, nutrition, planner,
                  plans, plan-inputs, plan-staleness, householdMembers,
                  householdSettings, householdShares, ingredientPrices,
                  ingredientPreferences — business logic, no HTTP, no raw SQL
  repositories/   one file per aggregate; all Drizzle queries live here
  lib/            errors.ts, errorHandler.ts, logger.ts, requestLogger.ts,
                  params.ts (route param schemas), db.ts (pg error codes), units.ts, rng.ts
api/drizzle/      generated, reviewed SQL migrations (source of truth for schema history)
api/tests/        vitest + testcontainers, real Postgres per run
shared/src/       zod schemas + inferred types, imported by both api and web
web/src/
  App.tsx         router (<Routes>)
  app/            shell (AppShell, Sidebar), TanStack Query client, typed API client
  features/       recipes, pantry, week, household (shopping/import are step 34+, not built yet)
  shared/api/     read-only query hooks shared across features (recipeCatalog.ts,
                  household.ts) plus response helpers (unwrapResponse.ts,
                  parseErrorResponse.ts) — features never import each other's files directly
  shared/layout/  DetailRail
  shared/lib/     pure helpers (week, expiry, planReasons, formatting, cx, …)
  shared/ui/      design-system primitives
  stories/        Storybook stories, run as real Vitest tests
```

Dependency direction is one-way: `routes → services → repositories → db`.
Confirmed in the current code — no repository imports a route, no service
imports Hono types.

## Contracts boundary — `shared/`, not `packages/contracts`

The historical `context/archive/build-plan-v1.md` stack table names `packages/contracts` as the shared
boundary. The repository already has an equivalent, safe boundary: the `shared`
npm workspace (`shared/package.json` depends only on `zod`; nothing in
`shared/src` imports `pg`, `drizzle-orm`, or any server-only module). Both `api`
and `web` depend on it. This satisfies the plan's intent without adding a
package — step 29 explicitly allows reusing an existing equivalent boundary
instead of creating `packages/contracts`. Do not create a second contracts
package; extend `shared/` instead.

The one server-type import into the browser is `web/src/app/apiClient.ts`:

```ts
import type { AppType } from 'api/index'
```

This is `import type` only — verified no server runtime is pulled into the web
bundle. Keep this type-only; a value import here would leak `pg`/`drizzle-orm`
into the browser build.

## Database

- PostgreSQL 17 via `api/docker-compose.yml` (host port 5433 to avoid clashing
  with a default local Postgres on 5432).
- Drizzle schema in `api/src/db/schema.ts`; migrations generated with
  `npm run migrate -w api` (wraps `drizzle-kit migrate`) and reviewed before
  applying — never hand-edited.
- Every table has `created_at`/`updated_at`; money and nutrition fields are
  `numeric`, never `float`.
- `plan_weeks.revision` (added in step 29.1, migration
  `0015_add_plan_weeks_revision.sql`) is an integer starting at 1, covering
  the whole plan (week + its slots) rather than a per-slot counter. Every
  mutation of an existing plan (lock, unlock, replace-slot, regenerate) does
  a single `UPDATE plan_weeks SET revision = revision + 1 ... WHERE id = $1
  AND revision = $2` (compare-and-swap) inside the same `db.transaction` as
  the slot write — see the "Layering" section of `context/code-standards.md`
  for why the `plans` service, not the route layer, owns that transaction.
  A stale or missing `expectedRevision` fails the CAS or an earlier explicit
  check and is reported as a typed error, never a silent overwrite. Accept
  takes `baseRevision` instead (null means insert a new week, which the
  unique `week_start_date` turns into 409 `WEEK_EXISTS` on a race), and in
  the same transaction compares the preview's `inputVersions` with current
  ones, rejecting a mismatch with 409 `STALE_PREVIEW`. Full
  history in `context/progress-archive.md`'s "Step 29.1" entry.
- `plan_slots.recipe_snapshot` (R05.4, migration `0024_bitter_the_anarchist.sql`) is a
  nullable jsonb copy of the recipe as saved: title, time, cost, meal, cuisine,
  proteinSource, diet, servings, kcalPerServing and ingredient lines (id, ingredientId,
  name, displayAmount, displayUnit, amountBase, baseUnit, isOptional). Shape is `recipeSnapshotSchema` in `shared/src/plans.ts`;
  built by `buildRecipeSnapshot` (`services/recipes.ts`). Accept and replace
  write it, building each distinct recipe once per write; a locked slot keeps its saved
  snapshot while it points at the same recipe, even after that recipe is edited.
  It is display/history only — rule checks still read live recipes. NULL means a
  pre-R05.4 or empty slot. The web week rows and meal rail read it (R05.4b) and
  fall back to the live recipe when NULL.
- `household_members.dinner_calorie_target` (added in step 27.1, migration
  `0016_add_household_member_dinner_calorie_target.sql`) is a nullable
  `numeric` with a `> 0` check constraint. Nullable is deliberate: an
  unconfigured member must block planning (`HouseholdMemberMissingDinnerTargetError`,
  mapped to 422), not silently default to 0. The planner currently generates
  dinner only (`PLANNED_MEAL_SLOTS` in `services/planner.ts`) — one recipe
  per dinner slot, with each member's serving count derived from that
  recipe's kcal-per-serving and their own `dinner_calorie_target`. The
  older combined-household `dailyCalorieTarget` sum/check was removed from
  the planner; that column still exists for a later whole-day phase but is
  no longer read by planning. Full history in `context/progress-archive.md`'s "Step
  27.1" entry.
- `household_settings.timezone` (added in step 30, migration
  `0018_add_household_settings_timezone.sql`) is `text not null default
  'Europe/Prague'`. It is editable on `/household` and read by planning:
  `getPlanInputs` (`services/plan-inputs.ts`) uses it to decide today's date,
  which sets pantry `daysUntilExpiry` and `PlannerTargets.todayIndex` (null
  for weeks not containing today). Validation accepts any zone
  `Intl.DateTimeFormat` accepts, including `UTC`. Weekdays come from
  `weekStartDate`; `startDayOfWeek` is not part of `PlannerTargets` and only
  drives the web week picker. Calorie tolerance
  (fixed ±10%, `planner.ts`) and currency (fixed CZK, column/type names)
  stayed hardcoded by deliberate scope decision — see `context/progress-archive.md`'s
  "Step 30" entry.

## Plan flow (R05)

`/api/plans` endpoints, all in `routes/plans.ts`:

- `POST /generate/preview` and `POST /copy-last-week/preview` write nothing. They
  return the full week plus `baseRevision`, `inputVersions` and violations.
  Generate takes optional `days`: unselected days keep their recipe (`locked: false`)
  with portions recomputed from current targets, as accept will save them; only
  locked slots keep saved portions. For a new week unselected days stay empty.
  Copy-last-week keeps target locks and leaves
  ineligible recipes empty.
- `POST /accept` saves a preview: it re-validates the slots and checks revision and
  input versions in one transaction (see Database).
- There is no direct-write `POST /generate`: weeks are saved only through `/accept` (retired in R05.8c).
- `GET /:weekStartDate` returns the saved week with stored violations and staleness.
- Lock (`PUT .../lock`), unlock (`DELETE .../lock`) and replace (`PUT .../:mealSlot`) re-evaluate stored violations and advance watermarks.
  Replace refreshes reasons on every filled slot.
- `GET .../candidates` ranks swaps by violation count → severity → score →
  calorie gap → recipe id, carries whole-week `violations` and `consequences`
  (week cost, per-member kcal, deltas), is paged (`limit`/`offset`, `total`) and
  returns top-three `suggestions`.

Web: `WeekPage` runs Generate → preview → `PreviewBar` (Accept / Try again /
Discard). A 409 `STALE_PREVIEW` shows "Preview again". Copy-last-week and
`days` have no web UI yet.

## Error handling

`lib/errors.ts` defines domain error classes (e.g. `PlanWeekNotFoundError`,
`RecipeNotFoundError`); routes translate them to `HTTPException` with the right
status — `plans.ts` through one `mapPlanError` function, the other routes inline in
`try/catch` with `instanceof`. `lib/errorHandler.ts` is the single
`onError` handler mounted once, so every response — expected or not — goes
through one envelope. Never swallow an error inside a service; throw a typed
domain error and let the route layer map it.

## Testing

- `api`: Vitest + `@testcontainers/postgresql` — a real Postgres per test run,
  migrations applied via `tests/global-setup.ts`. Test files run sequentially
  (`fileParallelism: false` in `api/vitest.config.ts`), not in parallel —
  several files' `afterEach` hooks do blanket deletes on tables (`recipes`,
  `ingredients`) that more than one file uses, which corrupts a concurrently
  running file's fixtures otherwise.
  - 12 files in `api/tests/` (shared seeds in `tests/fixtures/`). The largest are
    `plans.test.ts` (persistence, revision compare-and-swap, races, preview,
    accept, copy-last-week, `days`, snapshots, candidates, staleness) and
    `planner.test.ts` (search, constraints, violations).
  - No route-level tests for pantry, ingredient preferences or ingredient prices;
    they are exercised only indirectly through `plans.test.ts` seeds.
- `web`: Vitest + Storybook's `@storybook/addon-vitest`, every story runs as a
  real headless-Chromium test; accessibility violations fail the run
  (`preview.tsx`'s `a11y.test: 'error'`).
- Root `npm test` / `npm run typecheck` / `npm run lint` run both workspaces;
  CI (`.github/workflows/ci.yml`) runs the same three as separate jobs, plus a
  `secret-scan` job (`scripts/scan-secrets.sh`).

## Frontend state

TanStack Query is the entire server-state architecture — no Redux/Zustand.
Local interaction state (selection, form drafts) is `useState`/`useReducer`
inside the owning feature. Features (`recipes`, `pantry`, `week`,
`household`, and future `shopping`, `import`) never import from each other;
shared pieces move to `web/src/shared/`. In practice this means read-only
queries that more than one feature needs (the recipe catalog, a single
recipe's full detail with ingredients, household settings/members) live in
`web/src/shared/api/` with their own query keys; the owning feature's hook
file re-exports them (and adds its own mutations) rather than duplicating
the fetch/key so the TanStack Query cache stays genuinely shared, not just
similarly-shaped. `week` reads recipe/household data this way, including
the single-recipe-detail query (`useRecipeDetail`, added in step 31 when
the meal detail rail needed it alongside `recipes`' own `RecipeDetail`);
`household`'s own read hooks are the canonical example other features
should follow for new cross-feature data.

`web/src/shared/layout/DetailRail.tsx` takes an optional `className`
override (default preserves the original fixed `w-73` side-rail sizing for
`RecipeDetail`, its first caller) so a consumer can render one content tree
that's a side rail at the `md:` breakpoint and a full-width inline panel
below it on narrow screens — added in step 31 for `MealDetailRail`, the
first rail usage that needed a non-desktop-only layout.

## Development workflow

`/step <R-id>`, `/step-review <id>`, `/recover <error>` are the three project
skills (`.claude/skills/`). They read this `context/` directory plus
`context/build-plan.md` and `context/progress.md`. Two now-redundant review
skills (`architecture-review`, `frontend-review`) were folded into `/step-review`
and removed. No other build/finish/debug skills should be added — see step 29 §C
in [build-plan-v1.md](archive/build-plan-v1.md).
