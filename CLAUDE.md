# Meal Planner

Weekly meal planning app: my recipes + store discounts + calorie targets +
household preferences. Personal project, built to production standards.

## Who I am

Frontend developer, 7 years of React and TypeScript. This is my first backend
project. I know the language and the tooling; I do not know backend. I need to
understand every piece of the stack, not receive a working template.

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
Scopes: `recipes`, `db`, `api`, `planner`, `config`, `deps`, `ci`

Imperative mood, lowercase, no trailing period, under 72 characters.

```
feat(recipes): add POST endpoint with zod validation
fix(db): use bound parameters in ingredient lookup
chore(deps): add pino for structured logging
```

Suggest commit messages when I ask. Never run `git commit` yourself unless I
explicitly ask.

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
