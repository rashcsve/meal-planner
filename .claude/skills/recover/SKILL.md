---
name: recover
description: Diagnose and repair one concrete failed implementation or verification attempt using the smallest evidence-backed change. Invoke explicitly after a normal corrective attempt fails.
argument-hint: "[failure, command, or error]"
disable-model-invocation: true
---

# Recover from one failed attempt

Recover from this failure: `$ARGUMENTS`.

Use this workflow after an ordinary implementation or correction has failed. It is not a
general refactoring or cleanup command.

## 1. Preserve the evidence

1. Read `CLAUDE.md`, `context/progress.md`, and the relevant plan/architecture context.
2. Inspect `git status` and the current diff. Preserve unrelated work.
3. Capture the raw error, failing command, stack trace, logs, request id, or visible symptom.
4. If the supplied failure is too vague to reproduce safely, ask for the missing raw output
   instead of guessing.

Never delete local changes, reset the repository, clear data, regenerate everything, or
restart the project as a diagnostic shortcut.

## 2. Reproduce before changing code

- Run the smallest command or interaction that reproduces the failure.
- Record expected versus actual behaviour.
- Determine the failing layer: environment/tooling, types/build, UI state, API contract,
  service/domain logic, repository/database, test isolation, or stale/incorrect context.
- Separate the primary failure from secondary noise.

If the failure cannot be reproduced, inspect differences in environment and state. Do not
apply a speculative fix merely because it sounds plausible.

## 3. Diagnose one hypothesis at a time

State the leading hypothesis and the evidence that would confirm or reject it. Inspect the
relevant call path and recent diff. Prefer direct evidence from code, logs, network traffic,
tests, and SQL over intuition.

Classify the root cause as one of:

- a defect introduced by the current change;
- a previously existing defect exposed by it;
- an invalid test or stale fixture;
- an environment/tooling problem;
- polluted or contradictory agent context;
- an incorrect assumption in the plan or previous implementation.

Do not stack several speculative fixes in one edit.

## 4. Apply the smallest durable fix

- Change only what the evidence supports.
- Preserve public contracts and working behaviour unless the defect is in the contract itself.
- Add or strengthen a regression test when code caused the failure.
- Correct context documentation when stale instructions caused the failure.
- Do not perform unrelated refactors, broad dependency upgrades, schema redesigns, or test
  weakening.
- Stop for approval before destructive data changes, security-sensitive redesign, or a
  material expansion beyond the failed task.

## 5. Prove recovery

1. Re-run the exact reproduction; it must now pass.
2. Run the nearest regression tests.
3. Run broader typecheck/lint/build checks when the fix can affect them.
4. Confirm that the fix did not merely hide the symptom through catch-all error handling,
   disabled validation, skipped tests, or erased state.

After two evidence-based hypotheses fail, stop. Summarize what was tried, preserve the raw
evidence, and ask for direction rather than continuing an unbounded repair loop.

## 6. Hand off

Report:

- root cause and supporting evidence;
- minimal fix and files changed;
- regression protection added;
- exact verification commands and results;
- remaining uncertainty or risk.

Update `context/progress.md` only when the recovery changes a durable project decision,
known limitation, or step status. Do not mark the build step complete; completion remains
the responsibility of `/build-step` followed by `/review`.

Do not commit, push, deploy, or continue with unrelated work unless explicitly asked.
