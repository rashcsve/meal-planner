# Architecture

This records what the repository actually does, and decisions that resolve a
question the build plan leaves open. `CLAUDE.md` has the conventions everyone
must follow; this file has the current concrete shape of the system.

**2026-09-21 planning update:** [build-plan.md](build-plan.md) now describes
the future Use It Up implementation (R01–R14). The fixed-portion model and
other proposed changes are not implemented. Architectural descriptions below
remain about the current code; historical numeric step references point to
[build-plan-v1.md](build-plan-v1.md).

## Layout

```
api/src/
  index.ts        entrypoint, mounts routes, does not import from routes/services directly for app construction vs listen
  config/         Zod-validated env (DATABASE_URL, PORT, NODE_ENV, LOG_LEVEL, CORS_ORIGIN)
  db/             drizzle schema (schema.ts) + pooled connection (index.ts)
  routes/         recipes.ts, pantry.ts, plans.ts, household.ts — HTTP parsing/validation only
  services/       recipes, pantry, nutrition, planner, plans, plan-inputs,
                  householdMembers, householdSettings, ingredientPrices,
                  ingredientPreferences — business logic, no HTTP, no raw SQL
  repositories/   one file per aggregate; all Drizzle queries live here
  lib/            errors.ts, errorHandler.ts, logger.ts, requestLogger.ts,
                  params.ts (route param schemas), db.ts (pg error codes), units.ts, rng.ts
api/drizzle/      generated, reviewed SQL migrations (source of truth for schema history)
api/tests/        vitest + testcontainers, real Postgres per run
shared/src/       zod schemas + inferred types, imported by both api and web
web/src/
  app/            shell, router, TanStack Query client, typed API client
  features/       recipes, pantry, week, household (shopping/import are step 34+, not built yet)
  shared/api/     read-only query hooks shared across features (recipeCatalog.ts,
                  household.ts) — features never import each other's files directly
  shared/ui/      design-system primitives
  stories/        Storybook stories, run as real Vitest tests
```

Dependency direction is one-way: `routes → services → repositories → db`.
Confirmed in the current code — no repository imports a route, no service
imports Hono types.

## Contracts boundary — `shared/`, not `packages/contracts`

The historical `context/build-plan-v1.md` stack table names `packages/contracts` as the shared
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
  check and is reported as a typed error, never a silent overwrite. Full
  history in `context/progress.md`'s "Step 29.1" entry.
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
  no longer read by planning. Full history in `context/progress.md`'s "Step
  27.1" entry.
- `household_settings.timezone` (added in step 30, migration
  `0018_add_household_settings_timezone.sql`) is `text not null default
  'Europe/Prague'`. It is editable on `/household` but not yet read by any
  planning or date logic — added because the setting is real and the plan
  calls for it, not because something consumes it yet. Calorie tolerance
  (fixed ±10%, `planner.ts`) and currency (fixed CZK, column/type names)
  stayed hardcoded by deliberate scope decision — see `context/progress.md`'s
  "Step 30" entry.

## Error handling

`lib/errors.ts` defines domain error classes (e.g. `PlanWeekNotFoundError`,
`RecipeNotFoundError`); each route's `mapXError` function translates them to
`HTTPException` with the right status. `lib/errorHandler.ts` is the single
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
  - Files that exist and were last verified passing 2026-09-18
    (`npm run test -w api` → 7 files / 81 tests): `recipes.test.ts`,
    `nutrition.test.ts`, `planner.test.ts`, `unitConversions.test.ts`,
    `units.test.ts`, `plans.test.ts` (persistence, the revision
    compare-and-swap, concurrent-mutation races, rollback on a
    mid-transaction failure, lock preservation across regeneration, and —
    added in step 31 — locked-slot/ineligible-recipe replace rejection and
    the `/candidates` endpoint's eligibility filtering/ranking), and
    `household.test.ts` (added in step 30 — settings get/put/validation,
    members list, member dinner-target update and its 404/400/422 cases).
  - **No test file exists yet** for pantry, ingredient preferences, or
    ingredient prices — predates step 29, tracked as a follow-up, not fixed
    here. (Household settings/members are now covered — step 30 added the
    routes and their tests together, since those routes did not exist
    before this step.)
- `web`: Vitest + Storybook's `@storybook/addon-vitest`, every story runs as a
  real headless-Chromium test; accessibility violations fail the run
  (`preview.tsx`'s `a11y.test: 'error'`).
- Root `npm test` / `npm run typecheck` / `npm run lint` run both workspaces;
  CI (`\.github/workflows/ci.yml`) runs the same three as separate jobs.

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

`/build-step <id>`, `/review <id>`, `/recover <error>` are the three project
skills (`.claude/skills/`). They read this `context/` directory plus
`context/build-plan.md` and `context/progress.md`. Two now-redundant review
skills (`architecture-review`, `frontend-review`) were folded into `/review`
and removed. No other build/finish/debug skills should be added — see the
build plan's step 29 §C.
