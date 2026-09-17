# Code standards

Conventions live primarily in `CLAUDE.md`. This file adds the executable
verification commands the skills (`/build-step`, `/review`, `/recover`) should
actually run, plus the couple of standards CLAUDE.md doesn't spell out.

## Verification commands

| Purpose | Command | Needs Docker? |
| --- | --- | --- |
| Typecheck both workspaces | `npm run typecheck` | no |
| Lint both workspaces (oxlint) | `npm run lint` | no |
| Format changed files | `npx prettier --write <path>` | no |
| Full test suite (api + web) | `npm test` | yes — api tests spin up Postgres via Testcontainers |
| API tests only | `npm run test -w api` | yes |
| Web tests only (incl. Storybook stories) | `npm run test -w web` | no |
| Apply migrations | `npm run migrate` | yes — needs the dev Postgres container running |
| Start dev Postgres | `docker compose -f api/docker-compose.yml up -d` | yes |
| Run api + web together | `npm run dev:all` | yes |
| Secret scan | `bash scripts/scan-secrets.sh` | no |
| Bounded local verification (typecheck+lint) | `bash scripts/verify.sh` | no |

A check that "cannot run" (e.g. Docker unavailable) must be reported as an
explicit blocker, not silently skipped or assumed to pass.

## Layering (from `CLAUDE.md`, restated for `/review`)

`routes/` → `services/` → `repositories/` → `db/`. A service must not import
Hono types or know it was called by HTTP versus a test. Transaction boundaries
belong in the route layer per `CLAUDE.md`, though the current `plans` service
opens its own `db.transaction` around `generatePlan`'s multi-table write — this
is an accepted, narrow exception because the write must be atomic and the route
layer has no reason to see two repository calls it doesn't otherwise coordinate.
Don't generalize from it; new multi-table writes should still be discussed if
route-layer transactions turn out to be awkward.

## Migrations

Generate through `drizzle-kit` (`npm run migrate -w api` applies; generation is
via the project's normal `drizzle-kit generate` command). Read the generated
SQL before applying. Flag anything destructive — `DROP`, `TRUNCATE`,
`ALTER ... DROP`, a column rename executed as drop+add — and stop for approval
before applying it. Never hand-edit a generated migration to make it pass; if a
manual migration is genuinely required, say why in the PR/commit description.

## Formatting

Prettier formats files this task actually touches, via the PostToolUse hook in
`.claude/settings.json`. It is not run repo-wide automatically — the existing
codebase has mixed formatting from before Prettier was added, and a blanket
reformat would produce a large, unrelated diff. Format the whole repo only as
an explicit, separately-approved step.

`npm run format -- <path>` runs the same Prettier config by hand for a file or
directory you touched outside the hook (e.g. after a manual edit); the hook
itself calls `npx prettier --write` directly and doesn't depend on this script.

## Commits

Conventional Commits as specified in `CLAUDE.md`. Never run `git commit`
without being asked, even inside `/build-step`.
