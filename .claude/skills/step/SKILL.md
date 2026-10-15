---
name: step
description: Run one plan step from context/build-plan.md as a learning session — explain and plan, build in small slices, verify, explain, end with a commit message. Use only when the user invokes /step with an R-id.
argument-hint: "[R-id or slice, e.g. R05 or R04.9]"
disable-model-invocation: true
---

# One plan step, learning first

Work on `$ARGUMENTS` and nothing later. The user is learning the backend while building:
a phase that skips their understanding is a failure even if the code works. Stop at
every **STOP** and wait for the user.

## 1. Orient (read-only)

Read only what this step needs:

- the `### <milestone>` section of `context/build-plan.md` for this id, up to the next
  `### R` heading, including its **Learning** block;
- the top of `context/progress.md`: Open follow-ups, and the entries for this milestone;
- the parts of `context/architecture.md` and `context/code-standards.md` that cover the
  modules involved;
- the relevant code, tests and `git status`.

Do not read `context/progress-archive.md` unless an index row or reference shows the step
depends on an archived entry. If the id is missing, ambiguous or already complete, say so
and stop. If a milestone id is given (`R05`), pick the next unfinished slice from its
implementation slices or the progress "Next step", and say which.

The repository is authoritative about current behaviour; the plan about intended outcome.
Raise mismatches; never overwrite working code to match the plan.

## 2. Explain and plan — STOP

Present the plan in exactly this short format, plain words, one line per item:

```
What: <one sentence>
Why: <one sentence>
You'll learn: <1–2 of the milestone's Learning questions>
Steps:
  1. <one line — at most ~40 lines of new code each>
  2. ...
New library: <name — problem it solves; what breaks without it>   (only if any)
Schema change: <what changes; destructive or not>                  (only if any)
Decide: <a choice that changes behaviour, data or architecture>    (only if any)
```

Keep acceptance criteria, files, non-goals and verification commands to yourself unless
the user asks for "details". Then STOP for approval. In plan mode, present this as the plan.

## 3. Build one sub-step at a time — STOP after each

Implement one sub-step, then report in two lines — `Changed: <one line>` and
`Check: <one command, URL or query>` — and STOP. Follow CLAUDE.md and the path-scoped rules; no code the step didn't ask
for, no opportunistic refactors, no next step. Hook messages explain a project rule —
follow them, don't work around them.

**Schema changes:** change the Drizzle schema, generate the migration, then show the user
the generated SQL and name anything destructive (DROP, a rename executed as drop+add,
table rewrites, locks) before anyone applies it. Never hand-edit generated SQL to silence
the tool.

## 4. Verify — report, don't fix

Typecheck and lint run automatically when you stop (Stop hook). You also run:

- `npm run test -w api` when api code changed (needs Docker; Testcontainers);
- `npm run test -w web` when web code changed;
- for UI: the Storybook MCP `run-story-tests` / `preview-stories` tools when connected,
  otherwise `npm run test -w web`; check loading, empty, error and keyboard states.

Report each command with its result (pass/fail counts, failing output). A check that
cannot run is a stated blocker, never a pass. If something fails, show it, propose a fix
and wait. Never weaken, skip or delete a test to get green.

## 5. Explain

1. Answer the Learning questions this slice touched, as concepts (what the database,
   HTTP layer or query cache actually does), not as a code tour.
2. How the user can verify it themselves end to end.

Do not quiz the user or end with questions.

## 6. Progress and commit

Update `context/progress.md`. It is an evidence log, not a
transcript: about 15 lines per entry — id and status, outcome and files, commands and
results, decisions one line each with the reason, exact next step. Durable facts about
modules go in `architecture.md`; product decisions in `build-plan.md`. Anything left open
goes in the **Open follow-ups** list with the milestone that should resolve it; remove
lines when resolved. When a milestone is complete and reviewed, move its entries verbatim
to `context/progress-archive.md` with one index row each. Never mark a step complete
based only on code generation.

End the message with one commit message in the CLAUDE.md format, as the last line, and
remind the user to run `/step-review <id>` before committing. Do not commit, push, or
start another step.
