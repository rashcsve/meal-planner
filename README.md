# Meal Planner

Weekly meal planning app: recipes + store discounts + calorie targets +
household preferences.

## Stack

Node 22+, TypeScript (ESM), Hono, PostgreSQL 17, Drizzle ORM, Zod.

## Setup

1. Start Postgres:

   ```bash
   docker compose up -d
   ```

2. Copy the environment file and adjust if needed:

   ```bash
   cp .env.example .env
   ```

3. Apply migrations:

   ```bash
   npm run migrate
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Endpoints

| Method | Path           | Description         |
| ------ | -------------- | -------------------- |
| GET    | `/health`      | Liveness check        |
| GET    | `/api/recipes` | List all recipes      |

## Structure

```
src/
  index.ts        entrypoint, mounts routes
  config/         validated environment variables
  db/             schema, connection
  routes/         HTTP only: parse, validate, call service, format response
  services/       business logic, no HTTP or SQL
  repositories/   all database access
drizzle/          generated migrations
```

## Tests

```bash
npm test
```
