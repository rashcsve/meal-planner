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

8. **When I ask "why", explain — do not rewrite the code.**

9. **If I can't explain a piece of the stack out loud, we stop and go back to it
   before continuing.**

10. **Keep messages short.** Answer first, plain words, about 10 lines before you
    stop. More detail only when I ask for it.

## Commands

- Dev: `npm run dev` (api) · `npm run dev:all` (Postgres + api + web)
- Start dev Postgres: `docker compose -f api/docker-compose.yml up -d`
- Test all: `npm test` (needs Docker)
- API one file: `npm run test -w api -- tests/recipes.test.ts`
- API by name: `npm run test -w api -- -t "<test name>"`
- Web tests (Storybook stories in Chromium): `npm run test -w web`
- Hook guard tests: `npm run test:hooks`
- Typecheck: `npm run typecheck` · Lint: `npm run lint`
- Fast local check (typecheck + lint): `bash scripts/verify.sh`
- Format a touched file: `npx prettier --write <path>`
- Migrations: `npm run migrate` (read the generated SQL first)
- Full command table: `context/code-standards.md`

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
- Auth (arrives at R14)
- Tracing and metrics (arrive when the app is deployed)

## Conventions

Backend conventions (layers, database, errors, logging) live in
`.claude/rules/api.md`; the Frontend and Design system sections live in
`.claude/rules/web.md`. Claude loads each automatically when it reads or edits a
file under `api/` or `web/`. Other agents: read the matching file before editing
anything under `api/` or `web/`.

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

After any change to files, end the reply with one suggested commit message instead of
follow-up questions. Never run `git commit` yourself unless I explicitly ask.

## Gotchas

- API tests start Postgres via Testcontainers: Docker must be running. They run
  serially (`fileParallelism: false`). If Docker is down, report it as a blocker.
- Web tests are Storybook stories run by vitest in Playwright Chromium.
- Never reformat the whole repo: formatting is mixed from before Prettier.
- Service-layer transactions are allowed only for plan mutations (see
  `context/code-standards.md`); everywhere else they live in routes.
- Never `drizzle-kit push`; never hand-edit a generated migration.

## Zones

- 🟢 Green (work freely, tests required): `web/src/features`, `web/src/stories`,
  `api/src/routes`, `api/src/repositories`
- 🟡 Yellow (characterization tests BEFORE changing): `api/src/services`
  (planner search, plan revisions), `shared/` (api ↔ web contract)
- 🔴 Red (ask before every change): `api/drizzle/`, `api/src/db/schema.ts`,
  `.claude/hooks/`, `.github/`, `scripts/`, `api/docker-compose.yml`

## AI-assisted development

`context/build-plan.md` is the numbered master plan; `context/progress.md`
tracks step status; `context/product.md`, `context/architecture.md`,
`context/code-standards.md` describe product intent, actual module boundaries,
and executable verification commands. Requirements live in the plan, not
duplicated into skills or here.

Three skills drive the workflow: `/step <R-id>` runs one plan step as a learning
session, `/step-review <id>` is a read-only review of a step or diff, `/recover
<error>` fixes one failed attempt after a normal correction didn't work.

## Workflow

- Explore read-only first; for bigger changes propose a plan and wait.
- Tests first for new behaviour. Never delete, skip or weaken a test — ask.
- After changes run typecheck + relevant tests + lint; fix root causes (no suppressions).
- Show evidence: command + output.
- Never commit with failing tests. No new dependencies without asking.
- Never read or print `.env*` or secrets.

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
  AGENTS.md
  CLAUDE.md
```
