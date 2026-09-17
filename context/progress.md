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
step 32/33 until this is resolved.

## Step 29 — Audit current implementation and adopt agentic development — `in progress`

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

**Next step: 30** (Week grid and planning settings) — blocked from completing
its optimistic-locking-dependent later siblings (32, 33) until the step-28
follow-up above is done; step 30 itself does not require it.
