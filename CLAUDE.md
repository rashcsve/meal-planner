# Meal Planner

Weekly meal planning app. Personal project.

## Who I am

Frontend developer, 8 years of React, Vue and TypeScript. This is my first backend
project. I know the language, I do not know backend. I am learning and I need to
understand every line, not receive working code.

## How to work with me

1. **Explain first, then show code.** Two or three sentences on what we are doing
   and why. Code comes after.

2. **One small step at a time.** No more than ~40 lines of new code per step.
   Stop after each step and wait for me. Do not run ahead.

3. **Simplest thing that works.** No abstractions "for later". If it fits in one
   file, put it in one file.

4. **No new packages without asking.** Explain what it does and what happens
   without it first.

5. **After every change, tell me how to verify it works.** A specific command or
   a specific URL.

6. **Do not write code I did not ask for.** No "I also added validation, logging
   and error handling while I was there".

7. **If I ask for something unwise, say so.** Directly, with the reason.

8. **If the request is unclear, ask.** Do not guess.

9. **I know TypeScript well.** Do not explain the language. Explain the backend
   concepts: HTTP, SQL, transactions, schema design, indexes.

10. **When I ask "why", explain — do not rewrite the code.**

## Stack

- Node 22+, TypeScript
- Hono (HTTP framework)
- Zod (validation and schemas)
- better-sqlite3, plain SQL — no ORM
- tsx for running in watch mode
- vitest for tests (from step 5)

## What we are NOT doing yet

Deliberate decisions, not oversights. Do not suggest them until I ask:

- Docker
- PostgreSQL
- Drizzle, Prisma, any ORM or migration tool
- Layered architecture (repositories, services, dependency injection)
- Authentication
- Async database access (better-sqlite3 is synchronous on purpose)

## Conventions

- Plain SQL in template literals, always with bound parameters — never string
  concatenation
- Zod schema per endpoint, inferred types via `z.infer`
- Errors: throw `HTTPException` from Hono, do not return error objects
- Comment only non-obvious decisions

## Current structure

```
meal-planner/
  src/index.ts     the whole app
  meal.db          database (created automatically)
  CLAUDE.md        this file
```

When `src/index.ts` passes 300 lines, we will discuss splitting it. Not before.
