---
name: step-review
description: Perform a read-only review of the current step or diff against project context, architecture, tests, and production risks. Use only when the user explicitly invokes /step-review.
argument-hint: "[step-id-or-scope]"
disable-model-invocation: true
context: fork
model: opus
effort: high
---

# Review without editing

You run in a fresh context with no memory of how this work was built. Judge only what is
in the repository.

Review `$ARGUMENTS`. If no scope is supplied, review the current uncommitted diff and the
step marked current in `context/progress.md`.

This is a read-only workflow. Do not edit files, install dependencies, generate migrations,
format code, update progress, commit, push, or deploy.

## Establish the intended behaviour

Read:

- `CLAUDE.md` and its imported instructions;
- `.claude/rules/api.md` and/or `.claude/rules/web.md` for whichever side the diff touches;
- `context/product.md`, `context/architecture.md`, and `context/code-standards.md` when present;
- the relevant section of `context/build-plan.md`;
- `context/progress.md`;
- the changed files, surrounding implementation, and relevant tests.

Inspect `git status`, the complete relevant diff, and available verification scripts. Do
not review the diff in isolation when correctness depends on callers, schemas, migrations,
or tests outside it.

## Review priorities

Review in this order:

1. **Correctness:** Does behaviour satisfy the selected step and preserve existing behaviour?
2. **Data and boundaries:** Are validation, API contracts, domain logic, persistence, and UI
   responsibilities in the right layers? Can browser code import server-only runtime code?
3. **Failure behaviour:** Are expected errors, unexpected errors, loading, empty states,
   retries, concurrency, and partial failure handled appropriately?
4. **Data safety:** Are migrations safe for existing rows? Are transactions, constraints,
   indexes, deletion behaviour, and idempotency appropriate?
5. **Security and privacy:** Look for secret exposure, unsafe auth/token handling, missing
   authorization, injection, excessive logging, and untrusted model output.
6. **Tests:** Do tests prove the important behaviour rather than implementation details?
   Identify meaningful missing cases and flaky or misleading coverage.
7. **Maintainability:** Flag unnecessary complexity, duplicated contracts, speculative
   abstractions, hidden coupling, or divergence from established project conventions.
8. **Product fit:** Identify scope creep, missing acceptance states, or behaviour that weakens
   the core planning loop.

Also check these project rules, which no hook enforces. Each violation is at least
**Important**:

- suggests restarting the project or changing the stack — fix in place instead
- hand-writes a type that mirrors the backend — types are inferred (`z.infer`, `hc<AppType>`)
- builds a Card, Modal or Dropdown primitive the step did not ask for — primitives on demand only
- asks a model to do arithmetic — deterministic code owns numbers
- stores scaled amounts — amounts are per portion and scaled at read time (immutable
  records of what was actually cooked are the exception)
- filters swap candidates in the client — the planner's constraint checker decides what fits
- changes a layout during a token-only design slice — tokens first, layouts after
- deletes an import without rebuilding the current shopping list — deletion cascades

Run read-only checks when useful, but do not mutate the workspace to make them pass. Report
the exact command and result. Distinguish a verified defect from a concern that needs more
evidence.

## Output

Review thoroughly; report briefly. Plain words, exactly this shape:

```
Verdict: ready | ready with minor issues | not ready

1. [Critical|Important|Minor] file:line — what goes wrong, for whom. Fix: <one line>.
2. ...

Checked: <commands run and results, one line>
Not checked: <one line, only if something important was not covered>
```

Severity: **Critical** = data loss, security, broken core behaviour; **Important** = must
be fixed before the step closes; **Minor** = worth doing, not blocking. Order most severe
first. At most two lines per finding; add one line of evidence only when the problem is
not obvious from the location. Do not invent findings to fill categories; if there are
none, the list is empty. No replacement implementations — the user can ask for details
on any finding.

Your report goes back to the main conversation, which shows it to the user. The user
decides what gets fixed.
