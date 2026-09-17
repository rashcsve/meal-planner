# Architecture

This records what the repository actually does, and decisions that resolve a
question the build plan leaves open. `CLAUDE.md` has the conventions everyone
must follow; this file has the current concrete shape of the system.

## Layout

```
api/src/
  index.ts        entrypoint, mounts routes, does not import from routes/services directly for app construction vs listen
  config/         Zod-validated env (DATABASE_URL, PORT, NODE_ENV, LOG_LEVEL, CORS_ORIGIN)
  db/             drizzle schema (schema.ts) + pooled connection (index.ts)
  routes/         recipes.ts, pantry.ts, plans.ts — HTTP parsing/validation only
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
  features/       recipes, pantry (week/shopping/household/import are step 30+, not built yet)
  shared/ui/      design-system primitives
  stories/        Storybook stories, run as real Vitest tests
```

Dependency direction is one-way: `routes → services → repositories → db`.
Confirmed in the current code — no repository imports a route, no service
imports Hono types.

## Contracts boundary — `shared/`, not `packages/contracts`

`context/build-plan.md`'s stack table names `packages/contracts` as the shared
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
- `plan_weeks` / `plan_slots` (step 28) currently have **no revision/version
  column** — see `context/progress.md` for why this is a recorded gap, not an
  oversight to silently fix here.

## Error handling

`lib/errors.ts` defines domain error classes (e.g. `PlanWeekNotFoundError`,
`RecipeNotFoundError`); each route's `mapXError` function translates them to
`HTTPException` with the right status. `lib/errorHandler.ts` is the single
`onError` handler mounted once, so every response — expected or not — goes
through one envelope. Never swallow an error inside a service; throw a typed
domain error and let the route layer map it.

## Testing

- `api`: Vitest + `@testcontainers/postgresql` — a real Postgres per test run,
  migrations applied via `tests/global-setup.ts`. Current coverage: recipes,
  nutrition, unit conversions, planner. **Pantry, household settings/members/
  preferences/prices, and plans have no test files yet** — pantry/household
  gaps predate step 29 and are tracked as follow-ups, not fixed here; the plans
  gap is step 28's own required verification and is recorded as blocking.
- `web`: Vitest + Storybook's `@storybook/addon-vitest`, every story runs as a
  real headless-Chromium test; accessibility violations fail the run
  (`preview.tsx`'s `a11y.test: 'error'`).
- Root `npm test` / `npm run typecheck` / `npm run lint` run both workspaces;
  CI (`\.github/workflows/ci.yml`) runs the same three as separate jobs.

## Frontend state

TanStack Query is the entire server-state architecture — no Redux/Zustand.
Local interaction state (selection, form drafts) is `useState`/`useReducer`
inside the owning feature. Features (`recipes`, `pantry`, and future `week`,
`shopping`, `household`, `import`) never import from each other; shared pieces
move to `web/src/shared/`.

## Development workflow

`/build-step <id>`, `/review <id>`, `/recover <error>` are the three project
skills (`.claude/skills/`). They read this `context/` directory plus
`context/build-plan.md` and `context/progress.md`. Two now-redundant review
skills (`architecture-review`, `frontend-review`) were folded into `/review`
and removed. No other build/finish/debug skills should be added — see the
build plan's step 29 §C.
