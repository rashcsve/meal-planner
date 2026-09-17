# Meal Planner

Weekly meal planning app: my recipes + store discounts + calorie targets +
household preferences. Personal project, built to production standards.

## How to work with me

1. **Explain first, then show code.** Two or three sentences on what we are doing
   and why. Code after.

2. **One small step at a time.** No more than ~40 lines of new code per step.
   Stop and wait for me. Do not run ahead.

3. **Every new tool or library must come with: what problem it solves, and what
   would break without it.** No exceptions. This is the most important rule here.

4. **After every change, tell me how to verify it works.** A specific command,
   URL, or query.

5. **Do not write code I did not ask for.** No "I also added rate limiting while
   I was there".

6. **If I ask for something unwise, say so.** Directly, with the reason.

7. **If the request is unclear, ask.** Do not guess.

8. **I know TypeScript.** Do not explain the language. Explain backend concepts:
   SQL, transactions, indexes, connection pools, migrations, HTTP semantics.

9. **When I ask "why", explain — do not rewrite the code.**

10. **If I can't explain a piece of the stack out loud, we stop and go back to it
    before continuing.**

## Stack

| Concern    | Choice                              |
| ---------- | ----------------------------------- |
| Runtime    | Node 22+, TypeScript (ESM)          |
| Framework  | Hono + @hono/node-server            |
| Database   | PostgreSQL 17 in Docker             |
| DB access  | Drizzle ORM                         |
| Migrations | drizzle-kit                         |
| Validation | Zod                                 |
| Config     | Zod-validated environment variables |
| Logging    | pino (structured JSON)              |
| Tests      | vitest + testcontainers             |
| CI         | GitHub Actions                      |

## Deliberately excluded

Do not suggest these until I ask:

- Kubernetes, microservices, message queues, gRPC
- Redis or any cache
- GraphQL
- Auth (arrives at step 8)
- Tracing and metrics (arrive when the app is deployed)

## Conventions

**Layers.** Dependencies point one direction only:

```
routes/         HTTP only: parse, validate, call service, format response
services/       business logic. No HTTP, no SQL
repositories/   all database access
db/             schema, migrations, connection
config/         validated environment
lib/            shared utilities
```

A service must not know whether it was called by an endpoint, a cron job, or a
test.

**Database**

- Every schema change goes through a generated migration. Never edit a table by hand.
- Money and nutrition values: `numeric`, never `float`
- Every table gets `created_at` and `updated_at`
- Transaction boundaries live in the route layer, not the repository

**Errors**

- Throw `HTTPException` from Hono for expected failures
- One error-handling middleware formats all responses
- Never swallow an error silently

**Logging**

- `logger.info({ recipeId }, "message")` — structured fields, not string concatenation
- Never log secrets, tokens, or request bodies containing personal data

**Validation**

- Zod schema per endpoint. Types come from `z.infer`, never written twice.

**Commits**

Conventional Commits: `type(scope): short description`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`
Scopes: `recipes`, `pantry`, `db`, `api`, `planner`, `config`, `deps`, `ci`

Imperative mood, lowercase, no trailing period, under 72 characters.

```
feat(recipes): add POST endpoint with zod validation
fix(db): use bound parameters in ingredient lookup
chore(deps): add pino for structured logging
```

Suggest commit messages when I ask. Never run `git commit` yourself unless I
explicitly ask.

## AI-assisted development

`context/build-plan.md` is the numbered master plan; `context/progress.md`
tracks step status; `context/product.md`, `context/architecture.md`,
`context/code-standards.md` describe product intent, actual module boundaries,
and executable verification commands. Requirements live in the plan, not
duplicated into skills or here.

Three skills drive the workflow: `/build-step <id>` implements and verifies one
plan step, `/review <id>` is a read-only review of a step or diff, `/recover
<error>` fixes one failed attempt after a normal correction didn't work.

## Structure

npm workspaces: `api`, `web`, `shared`. `shared` holds Zod schemas used by
both `api` and `web`, so request/response shapes are defined once.

```
meal-planner/
  api/
    src/
      index.ts
      config/
      db/
      routes/
      services/
      repositories/
      lib/
    drizzle/          generated migrations
    tests/
    docker-compose.yml
    drizzle.config.ts
  web/                frontend (React + Vite)
  shared/             Zod schemas shared between api and web
  package.json        workspace root, delegates scripts to api
  CLAUDE.md
```

## Frontend

Lives in `web/`. Vite + React + TypeScript.

| Concern      | Choice                                                  |
| ------------ | ------------------------------------------------------- |
| Routing      | React Router                                            |
| Server state | TanStack Query — this IS the state architecture         |
| Client state | useState / useReducer only                              |
| API client   | Hono `hc` typed RPC, importing AppType from the backend |
| Forms        | react-hook-form + Zod (schemas imported from backend)   |
| Styling      | Tailwind v4                                             |
| Component tests | Storybook + `@storybook/addon-vitest` — every story runs as a real Vitest test in headless Chromium |

Storybook: `npm run storybook -w web` to browse. Every story auto-generates a
Docs tab (`@storybook/addon-docs` + `tags: ['autodocs']` in `preview.tsx`).
`npm run test -w web` runs every story as a real Vitest test in headless
Chromium — render crashes and accessibility violations (`@storybook/addon-a11y`,
axe-core) both fail the run, not just flag for review (`preview.tsx`'s
`a11y.test: 'error'`). Root `npm test` / `typecheck` / `lint` cover both `api`
and `web`, so CI enforces all of this. `@storybook/addon-mcp` exposes the story
catalog to AI agents over MCP at `/mcp` — call `get-storybook-story-instructions`
before writing stories, `preview-stories` / `run-story-tests` after.

Rules:

- No global store. No Redux, no Zustand. If it comes from the server, it's a query.
- Folders by feature: `features/week`, `features/recipes`, …
  Features never import from each other. Shared things move to `shared/`.
- No component library. No barrel files. No atomic design.
- Types are never hand-written to mirror the backend — they're inferred.
- Desktop app: viewport-height layout, panes scroll independently, never the page.
  12px base, mouse-sized targets, keyboard shortcuts.

## Design system

Primitives in `web/src/shared/ui/`. Tokens in `web/src/index.css`.

### Principles

- Numbers are the display type. Archivo variable, the width axis does the work:
  numerals condensed+heavy, labels narrow+uppercase, body normal.
- Borders, not shadows. No elevation anywhere. 1px lines, 2px radius only.
- One saturated colour at a time. The UI is greyscale on paper.
- Density is a feature: 12px base, 16px hit targets, viewport-height layout.

### Tokens

surfaces paper #EFEEE9 · card #FFF · sink #E7E5DF · rail #F4F3EF
text ink #17191C · muted #6B6E73 · faint #9A9C9F
borders line #DAD8D1 · hair #E6E4DE
semantic promo #D93A20 · check #B8860B · ok #2E7D52 · lock #1F3F8F
tints promo #FBE7E2 · check #FDF3D6 · ok #E3F0E9 · lock #E7E9EE

### Semantic colour — each means exactly one thing

- promo money saved, over budget, expired
- check the model is unsure, needs the user's eyes
- ok confirmed match, uses pantry stock
- lock user intent (locked meal), focus ring

promo and check are opposites: promo is good news needing no action, check is
"look at this". Never use promo for warnings or check for savings.

Destructive actions (delete, remove) currently borrow promo's red for visual
weight without claiming its meaning — this is a deliberate exception, not a
fifth semantic colour.

### Type scale

9 · 10 · 11 · 12 · 13 · 15 · 18 · 25 · 34. Nothing between.
Tabular numerals wherever numbers stack in a column.

### Rules

- Row state = 2px inset bar on the first cell, never a background wash.
- One primary button per view; ghost for everything else.
- Never remove focus-visible — keyboard nav is a feature of this app.
- No hex values outside index.css. Ever.
- No dark mode, no animation beyond skeleton shimmer.
- Add a primitive when a screen needs it, never speculatively.
