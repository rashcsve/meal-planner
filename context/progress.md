# Progress

Status values: `in progress`, `blocked`, `implemented—awaiting review`, `complete`.

## Steps 1–27 — `complete`

Verified 2026-09-17: `npm run typecheck` (api+web) clean; `npm run lint` clean
(2 pre-existing `react/only-export-components` warnings, not step-blocking);
`npm run test -w api` → 5 files / 50 tests pass; `npm run test -w web` → 17
files / 34 tests pass. Recipes, ingredients/nutrition, unit conversion, pantry,
household members/settings/preferences/prices, and the deterministic planner
are implemented and exercised by at least the planner/nutrition/recipes/unit
test files. Frontend scaffold, design tokens, primitives, table, state
components, shell/routing, query client + typed API boundary, and keyboard
shortcuts are all present in `web/src`.

Known pre-existing gap, not part of step 29: pantry, household members,
household settings, ingredient prices and ingredient preferences have
route/service/repository code but **no test files** (`api/tests/` only has
`recipes.test.ts`, `nutrition.test.ts`, `planner.test.ts`,
`unitConversions.test.ts`, `units.test.ts`). Tracked as a follow-up; not
backfilled here to avoid silently expanding step 29's scope.

## Step 28 — Plan persistence and endpoints — `blocked`

Implemented: `POST /api/plans/generate`, `GET /api/plans/:weekStartDate`,
explicit `PUT`/`DELETE` lock endpoints (correctly using explicit desired state,
not a toggle), `PUT` replace-slot. Generation is wrapped in one
`db.transaction`; `plan_weeks.week_start_date` and
`(plan_week_id, day, meal_slot)` are unique-constrained.

**Blocking gap:** there is no `revision` (or equivalent) column on `plan_weeks`
or `plan_slots`, and no optimistic-concurrency check anywhere in
`api/src/services/plans.ts`. The code says so directly
(`api/src/services/plans.ts:32-33`):

> A lock/unlock that happens right after this line, before the write below
> finishes, gets overwritten and lost. Fine for a single-user app.

This does not meet the build plan's acceptance criteria for step 28 ("Stale
mutations produce a documented conflict (409)"; "optimistic revision checks for
competing edits"). There is also no `api/tests/plans.test.ts` — none of the
plan endpoints have persistence, concurrency, rollback or lock-invariant tests,
which the plan requires as step 28's own verification.

**Decision (2026-09-17):** recorded as an approved follow-up rather than fixed
inside step 29 — this is real feature work (schema migration + service
rewrite + integration tests), not a bounded reconciliation task. It must be
completed as its own step before step 32 ("Optimistic locking") and step 33
("Regeneration and dependent cache consistency") are attempted, since both
assume a working revision contract already exists on the backend. Do not start
step 32/33 until this is resolved. Tracked as step 29.1 below, scheduled
between step 29 and step 30.

## Step 29 — Audit current implementation and adopt agentic development — `complete`

Part A audit (2026-09-17) found:

- `context/` had only `build-plan.md`; `product.md`, `architecture.md`,
  `code-standards.md`, `progress.md` (this file) were missing — now added.
- `.claude/skills/{build-step,review,recover}/SKILL.md` were already adapted to
  the step-29 workflow before this session — no rework needed.
- `.claude/skills/architecture-review/` and `.claude/skills/frontend-review/`
  were already deleted in the working tree (uncommitted) when this audit
  started, superseded by `/review`. Confirmed with the user to finalize this
  removal rather than restore them.
- No hooks were configured in `.claude/settings.json`. No formatter existed in
  the repo (no Prettier/`.editorconfig`), so the plan's "format changed files"
  hook had nothing to call.
- No secret scanning existed locally or in CI.
- `shared/` already serves as the plan's `packages/contracts` concept safely
  (zod-only dependency, no server imports) — documented in
  `context/architecture.md` instead of creating a second package.

Changes made in this step: added `context/{product,architecture,code-
standards,progress}.md`; added a short pointer section to `CLAUDE.md` naming
the three skills and `context/`; added Prettier (devDependency, config only —
not run repo-wide); added one `PostToolUse` hook to `.claude/settings.json`
(format-on-write for the touched file); added `scripts/verify.sh` (a
standalone bounded typecheck+lint script, not wired to any hook — run
manually or by `/build-step`, does not replace `npm test`) and
`scripts/scan-secrets.sh`; added a `secret-scan` CI job.

`/review 29` (2026-09-17) found two blocking-before-complete issues, both
fixed: this paragraph previously miscounted the hooks as three and mislabeled
`verify.sh` as one of them; and a migration-SQL destructive-keyword warning
hook's Bash-tool branch (added to cover the realistic `drizzle-kit generate`
case) had not been fixture-tested since being rewritten — fixture-testing it
required creating throwaway files under the real `api/drizzle/`, which the
user declined twice. Also fixed from that review before the decision below:
`prettier-format.sh`'s exclusion check used unanchored substring matching
(could false-exclude an unrelated path) — now uses slash-bounded glob
matching.

Re-verified 2026-09-17 (no code changes since `36a632c`, working tree clean):
`npm run typecheck` (api+web) clean; `npm run lint` clean (same 2 pre-existing
`react/only-export-components` warnings); `npm run test -w api` → 5 files / 50
tests pass; `npm run test -w web` → 17 files / 34 tests pass. All three skills
load `context/`; hooks have demonstrated fixtures except the noted
`drizzle-kit generate` fixture the user declined to exercise against real
migration files (accepted, not blocking). Marking `complete` per this step's
own rule: "update progress to `complete` only when evidence supports it."

**Next step: 29.1** (approved blocking follow-up, below) — must land before
step 30 begins its optimistic-locking-dependent later siblings (32, 33); step
30 itself may start in parallel since it does not depend on 29.1.

## Step 29.1 — Prevent lost updates in plan mutations — `complete`

Approved 2026-09-17 as a blocking follow-up to the step-28 gap above (not
folded into step 29 — real feature work, not reconciliation). Scope, agreed
before implementation:

- Add one `revision` column on `plan_weeks` covering the whole plan (week +
  slots), not a separate counter per slot.
- Every mutation of an existing plan (lock, unlock, replace-slot, regenerate)
  must supply the revision it read and pay for it atomically: a single
  `UPDATE plan_weeks SET revision = revision + 1 ... WHERE id = $1 AND
  revision = $2` (compare-and-swap in SQL, not a read-then-check in
  application code) inside the same `db.transaction` as the slot write. Zero
  rows affected means a stale mutation.
- Regeneration's locked-slot snapshot is read before the transaction; the same
  CAS at write time means a lock made after that snapshot bumps the revision
  first and the regeneration's write is rejected rather than silently
  overwriting it.
- Stale mutations return 409 with a stable `error.details.code` (matching the
  existing `HTTPException` → `details` convention in `errorHandler.ts`), not a
  bare message; clients are expected to refetch (`GET
  /plans/:weekStartDate`) rather than retry blindly.
- Concurrent initial creation is already handled by the existing
  `plan_weeks.week_start_date` unique constraint (`WeekAlreadyGeneratedError`
  → 409) — no new constraint needed there, only for the revision column.
- Migration adds `revision integer not null default 1` (Postgres 11+ fast
  path for a constant default, no table rewrite) — safe for existing rows.
- New `api/tests/plans.test.ts` against real Postgres (testcontainers,
  already wired in `api/tests/global-setup.ts`) covers persistence,
  concurrency and rollback — this also backfills step 28's own missing
  verification, not just 29.1's acceptance tests.
- Remove the lost-update comment at `api/src/services/plans.ts:32-33` once the
  CAS lands.

Transaction approach presented to the user for review before implementation
(2026-09-17); approved, then implemented the same day.

**Implemented:** `plan_weeks.revision` (migration `0015_add_plan_weeks_
revision.sql`, additive column, default `1`); `casIncrementRevision` in
`repositories/planWeeks.ts` replaces `updatePlanWeek` — one `UPDATE ... WHERE
id = $1 AND revision = $2` per mutation, run inside the same `db.transaction`
as the slot write; `StaleRevisionError` → 409 with `cause.code:
"STALE_PLAN_REVISION"`; `expectedRevision` required on lock/unlock/replace
schemas; `updateSlotLocked`/`updateSlotRecipe` now accept the caller's
transaction client.

New `api/tests/plans.test.ts` (10 tests, real Postgres via testcontainers):
revision required on mutations, stale-revision rejection with the stable
error code, no partial writes on a mid-transaction failure, regeneration
cannot overwrite a lock made after its snapshot, two same-revision mutations
race to exactly one winner, a lock raced against a regeneration is never
silently dropped, concurrent initial creation still 409s via the unique
constraint, and existing lock-preservation across regeneration still holds.
Also found and fixed a pre-existing test-harness gap while adding this file:
`vitest.config.ts` let test files run in parallel against the one shared
Postgres database from `global-setup.ts`, so `plans.test.ts` sharing
`recipes`/`ingredients` with `recipes.test.ts` caused blanket-delete
`afterEach` hooks in different files to corrupt each other's fixtures under
parallel execution — fixed with `fileParallelism: false`, not by narrowing
cleanup (the other files' own blanket deletes would still collide).

Verified 2026-09-17: `npm run typecheck` (api+web) clean; `npm run lint`
clean (same 2 pre-existing warnings); `npm run test -w api` → 6 files / 60
tests pass (was 5/50); `npm run test -w web` → 17 files / 34 tests pass
(unchanged). This also backfills step 28's own missing verification
("real-Postgres integration tests for persistence, concurrency, rollback and
lock invariants"), not just 29.1's acceptance tests.

**Missing vs. stale revision (corrected after `/review`):** `generatePlan`'s
`expectedRevision ?? -1` fallback let a client that forgot to send a revision
get the same 409 message as a genuine conflict, with the internal `-1`
sentinel leaking into the response text. Replaced with three distinct,
tested outcomes for an existing plan: no `expectedRevision` → 400
`EXPECTED_REVISION_REQUIRED` (checked before any planning work runs, so it's
cheap); a non-integer or sub-1 `expectedRevision` → 400 with the standard
Zod validation shape (`shared/src/plans.ts`'s `expectedRevisionSchema` now
requires `.positive()`, not `.nonnegative()` — the column never holds 0); a
correctly-shaped but outdated `expectedRevision` → 409
`STALE_PLAN_REVISION` (renamed from `PLAN_REVISION_CONFLICT` for clarity, and
applied uniformly since lock/unlock/replace share the same error class).
Initial creation of a week with no `expectedRevision` is unaffected — that
branch never reaches the revision check — and concurrent initial creation is
still caught by the `plan_weeks.week_start_date` unique constraint.

**Transaction ownership (corrected after `/review`):** `services/plans.ts`
opening its own `db.transaction` around `generatePlan` predates this step, but
this task expanded that pattern's scope: `setSlotLocked` and `replaceSlot`
previously did a single bare `UPDATE` with no transaction at all, and now also
open their own `db.transaction` for the same reason — the revision CAS and
the slot write must be atomic. This is an approved, scoped exception, not a
carried-over deviation; the rationale and its boundary (plan mutations
needing an atomic revision check, nothing else) are recorded in
`context/code-standards.md`'s "Layering" section. An earlier version of this
entry understated the change as unchanged pre-existing behaviour — corrected
2026-09-17.

**Context accuracy (corrected after `/review`):** `context/architecture.md`
still described `plan_weeks`/`plan_slots` as having no revision column and
`plans` as having no test file — both stale as soon as the implementation
above landed. Updated its "Database" and "Testing" sections to describe the
revision column and its CAS mechanism (cross-referencing
`code-standards.md`'s transaction-ownership rationale), and to name which
test files exist versus which were last verified passing, rather than
conflating the two.

Re-verified 2026-09-17 after all three `/review` fixes above:
`npm run typecheck` (api+web) clean; `npm run lint` clean (same 2
pre-existing warnings); `npm run test -w api` → 6 files / 61 tests pass (was
60 — added a test for the malformed-revision 400 case, and strengthened two
existing tests with error-code assertions); `npm run test -w web` → 17 files
/ 34 tests pass, unchanged (no web files touched this round, re-run to
confirm rather than assumed). Ran the api suite three times in a row with no
flake in the concurrency tests.

**Next step: 30** (Week grid and planning settings) — no longer blocked on
anything; 29.1 cleared the dependency for its later siblings (32, 33) too.
