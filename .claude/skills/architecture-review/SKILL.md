---
name: architecture-review
description: Audit the Meal Planner codebase against CLAUDE.md, report drift and layer violations, propose CLAUDE.md updates and repo cleanup. Use when the user asks to review, audit, or unify the architecture, check for drift, clean up the repo, or before starting a major new stage of the build.
---

# Architecture review

A read-first audit. Produces a report and a set of proposals. **Changes nothing
without explicit approval.**

Run this at stage boundaries, not mid-feature — a review of half-finished work
produces noise.

---

## Rules for this skill

1. **Read everything before judging anything.** No verdicts from filenames.
2. **Change no files during phases 1–3.** Report first.
3. **Every finding needs a concrete fix**, one line, naming the file.
4. Explain _why_ a violation matters in terms of what will go wrong later, not by citing a principle.
5. **Never propose restarting, rewriting wholesale, or changing the stack.**
   Fix in place.

---

## Phase 1 — Inventory

Read, in this order:

1. `CLAUDE.md` — the contract everything is judged against
2. `package.json`, `tsconfig.json`, `docker-compose.yml`, `drizzle.config.ts`
3. Every file in `src/`
4. Every file in `web/src/`
5. `drizzle/` migrations, in order
6. Test files
7. `.github/workflows/`

Then state, in three or four lines: what the project currently does end to end,
how many endpoints exist, how many frontend routes, and what the test coverage
situation actually is.

---

## Phase 2 — Audit

Check each of these explicitly. Report the ones that pass as well as the ones
that fail.

### Backend layers

- Does any route file import from `db/` or run a query directly?
- Does any service import from `hono`, touch `c.req`, or return a status code?
- Does any repository contain business rules (calculations, conditionals about
  domain meaning) rather than data access?
- Do repositories commit transactions? They should not — routes own the boundary.
- Could each service be called from a cron job or a test without modification?

### Backend conventions

- Money and nutrition columns: `numeric`, not `float` or `real`
- Every table has `created_at` and `updated_at`
- Prices append-only — no `UPDATE` against a price row anywhere
- Raw source strings stored alongside anything extracted
- Any schema change not represented by a migration file
- Any migration edited after being applied
- Errors: expected failures throw `HTTPException`, one middleware formats all
  responses, no stack traces or SQL in a client-facing body
- Logging: structured fields, no secrets, no personal data
- Config: validated at startup, `.env` gitignored, `.env.example` committed

### Frontend structure

- Does any file in `features/X` import from `features/Y`?
- Does anything in `shared/ui` know about recipes, meals, pantry, or plans?
  (Test: could it exist unchanged in a different product?)
- Any hand-written interface mirroring a backend type instead of inferring it
- Any state library installed or any global store
- Any hex colour outside `web/src/index.css`
- Any top-level `components/`, `hooks/`, or `utils/`
- Any barrel `index.ts`
- Any spinner instead of a skeleton
- Any page wrapped in its own scrolling container instead of the shell handling it

### Design system

- Font sizes outside the scale (9 · 10 · 11 · 12 · 13 · 15 · 18 · 25 · 34)
- Radius values other than 2px (pills and kbd excepted)
- Any shadow or elevation
- Row state as a background wash rather than a 2px inset bar
- More than one primary button in a view
- `focus-visible` removed or overridden
- Semantic colours used against their meaning — `promo` for a warning, `check`
  for anything that isn't model uncertainty

### AI code (if any exists yet)

- A model asked to do arithmetic anywhere
- Free-text parsing instead of structured outputs
- One call doing more than one task
- Model output used as a database key without a closed vocabulary
- Missing call logging: feature, model, prompt version, input hash, tokens, cost,
  latency, status
- Prompts not versioned in git
- External text concatenated into a prompt without separation from instructions

### Cross-cutting

- The same logic implemented in two places
- Dead code: unused exports, files nothing imports, commented-out blocks
- Anything in the repo that `.gitignore` should have caught
- Secrets anywhere in git history
- `README.md` describing something the code no longer does

---

## Phase 3 — Report

Output exactly this structure.

### Holding up well

Two to four things that are genuinely right. Be specific — "the repository layer
has no business logic in it" beats "good separation of concerns".

### Findings

| #   | File | Issue | Why it matters | Severity | Fix |
| --- | ---- | ----- | -------------- | -------- | --- |

Severity:

- **high** — will cause data loss, a security problem, or a painful migration later
- **medium** — will make the next stage harder
- **low** — inconsistency, tidy up when nearby

### The one thing

Name the single fix that would most improve the codebase, and say why that one
over the others. Force a judgement; do not hedge with a list.

---

## Phase 4 — Propose CLAUDE.md updates

`CLAUDE.md` drifts in two directions and both matter:

- **Code moved on** — a convention now in use that the file doesn't describe
- **File is stale** — a rule the code has outgrown or that turned out wrong

Propose additions and deletions as a diff. For each, one line on why.

Be strict about additions. A rules file that grows without limit stops being
read. Ask of each proposed line: _would Claude Code have done something different
if this had been there?_ If not, don't add it.

Also update the **Current state** section to the actual step number.

---

## Phase 5 — Propose repo cleanup

List, without doing any of it:

- Files to delete, with reasons
- Files to move, with destinations
- Anything that should be gitignored but isn't
- Documentation that contradicts other documentation
- Dependencies in `package.json` nothing imports

Group into `safe` (delete now) and `check first` (might be intentional).

---

## Phase 6 — Wait

Stop. Present the report and the proposals. Ask which the user wants applied.

Apply only what is approved, in small commits, one concern per commit, using the
Conventional Commits format from `CLAUDE.md`. Do not batch unrelated fixes.

After applying, ask the user three questions about the changes to check they
followed what happened and why.
