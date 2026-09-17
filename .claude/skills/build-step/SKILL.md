---
name: build-step
description: Implement exactly one numbered step from the project's context/build-plan.md, verify it, and update context/progress.md. Use only when the user explicitly invokes /build-step with a step identifier.
argument-hint: "[step-id]"
disable-model-invocation: true
---

# Build one plan step

Implement step `$ARGUMENTS` and no later step.

## 1. Orient before editing

1. Read `CLAUDE.md` and any instructions it imports.
2. Read these files when present:
   - `context/product.md`
   - `context/architecture.md`
   - `context/code-standards.md`
   - `context/build-plan.md`
   - `context/progress.md`
   - specialized context explicitly referenced by the selected step
3. Inspect the relevant implementation, package scripts, tests, and `git status`.
4. Preserve unrelated or pre-existing changes. Never discard them.
5. Find the exact requested step in `context/build-plan.md`. If the identifier is
   missing, ambiguous, already superseded, or absent from the plan, stop and explain.

The repository is authoritative about current implementation. The plan is authoritative
about intended outcome. Treat a mismatch as something to resolve explicitly, not a reason
to overwrite working code.

## 2. Frame the work

Before making changes, state briefly:

- the user-visible or engineering outcome;
- acceptance criteria from the plan;
- explicit non-goals;
- likely files and layers affected;
- verification commands and any manual check.

Ask a question only when a missing decision would materially change product behaviour,
architecture, data, security, or destructive scope. Otherwise proceed.

## 3. Implement the smallest complete slice

- Follow existing project patterns unless the selected step intentionally changes them.
- Implement only what is required for the step's acceptance criteria.
- Do not start the next step, perform opportunistic refactors, or add speculative abstractions.
- Do not add a dependency without explaining why existing dependencies are insufficient.
- Keep network boundaries runtime-validated even when TypeScript types are shared.
- Keep arithmetic, constraints, prices, inventory, and planner rules deterministic.
- Add or update tests at the lowest useful level:
  - unit tests for pure domain logic;
  - integration tests for database and API behaviour;
  - end-to-end coverage only for a critical user journey.

### Database changes

When the step changes the schema:

1. Change the Drizzle schema and generate a migration through the project's normal command.
2. Read the generated SQL before applying it.
3. Identify destructive operations, locks, rewrites, backfill requirements, and data-loss risk.
4. Stop for approval before applying a destructive or materially risky migration.
5. Never edit generated SQL merely to silence the tool; explain why a manual migration is
   necessary when one is required.

## 4. Verify with evidence

Run the narrowest checks first, then the broader checks declared by the repository or step:

1. targeted tests;
2. relevant integration tests;
3. typecheck;
4. lint/format checks;
5. production build when module boundaries or bundling changed;
6. the manual user journey described by the step.

Do not claim a check passed unless it ran successfully. If a check cannot run, report the
exact blocker and what remains unverified. Do not weaken, delete, or skip a failing test to
make the step appear complete.

For frontend work, inspect loading, empty, error, success, keyboard, and narrow-screen
states when they are relevant. For shared packages, prove that browser code does not pull
server-only modules into its runtime bundle.

## 5. Update progress

Update `context/progress.md` only after verification. Preserve useful history without
turning it into a transcript. Record:

- step identifier and status;
- outcome and important files changed;
- commands run and results;
- decisions and their reasons;
- known limitations or follow-ups;
- exact next step.

If the step is incomplete, mark it `blocked` or `in progress`; never mark it complete based
only on code generation.

## 6. Hand off

End with:

1. outcome;
2. concise diff summary;
3. verification evidence;
4. risks, limitations, and manual checks still needed;
5. `context/progress.md` update;
6. one proposed commit message;
7. three questions for the user: data/control flow, the main trade-off, and one debugging
   scenario. Do not reveal answers before the user attempts them.

Do not commit, push, deploy, or begin another step unless the user explicitly asks.
