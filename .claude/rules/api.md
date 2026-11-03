---
paths:
  - "api/**"
---

# Backend conventions

**Layers.** Dependencies point one direction only:

```
routes/         HTTP only: parse, validate, call service, format response
services/       business logic. No HTTP, no SQL
repositories/   all database access
db/             schema, connection (migrations live in api/drizzle/)
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

- Services throw domain errors from `lib/errors.ts`; routes map them to `HTTPException`
- One error-handling middleware formats all responses
- Never swallow an error silently

**Logging**

- `logger.info({ recipeId }, "message")` — structured fields, not string concatenation
- Never log secrets, tokens, or request bodies containing personal data
