# Meal Planner — master build plan

## Project

A household meal-planning app for recipes, pantry stock, weekly menus, shopping lists,
and reviewed recipe/retailer-offer imports. The core flow is: maintain recipes and pantry,
generate a week, inspect or replace meals, lock choices, and shop from the resulting list.
Plans must explain their choices and distinguish known facts from missing information.

The first release is a web app for one household. A native mobile client is a planned
later phase: preserve an independent HTTP API, reusable contracts and domain logic;
do not assume web components or cookie authentication will be reused unchanged on mobile.
Native screens, offline synchronization and mobile token flows are outside these 48 steps.

### Stack and boundaries

| Area | Stack / responsibility |
| --- | --- |
| API | TypeScript, Node, Hono; routes validate HTTP, services own business rules, repositories access data |
| Database | PostgreSQL 17, Drizzle, `pg` connection pool; reviewed SQL migrations in git |
| Web | React, Vite, React Router, Tailwind v4, React Hook Form |
| Server state | TanStack Query; local interaction state stays in React |
| Contracts | Zod and Hono RPC; shared browser-safe schemas in `packages/contracts`, type-only server imports |
| Tests | Vitest, Testcontainers/Postgres, focused Playwright journeys |
| AI features | Anthropic SDK behind a small extraction adapter; schema validation and human review |
| Operations | Docker, CI, managed Postgres, structured Pino logs, Sentry |

Keep the existing API root and `web/` structure. Add workspace boundaries where needed,
without a framework rewrite. Deterministic code owns units, nutrition, money, inventory,
constraints and planning; models assist with unstructured input and matching suggestions.

### AI-assisted development

Store this file as `context/build-plan.md`. Use `/build-step <id>` to implement and verify
one step and update `context/progress.md`; use `/review <id>` for read-only review and
`/recover <error>` for targeted fixes after an unsuccessful normal correction. Step 29
audits the current repository and installs/adapts this workflow. Skills describe procedures,
context files describe this project, and hooks provide narrowly scoped automation.

### Current checkpoint and numbering

- Step 28 is the current reported checkpoint; its completion must be verified in the repo.
- Steps 1–28 retain their numbers. Expanded requirements are a specification, not a claim
  that existing code already meets them; record gaps in step 29 without silently rebuilding.
- Step 29 replaces the earlier 28A retrofit. Former steps 29–47 are now steps 30–48.
- Existing commits and history must not be renumbered. Update active references in progress
  and context, retaining old identifiers where necessary to understand history.

### Completion rules for all steps

Each step includes requirements, acceptance criteria, edge cases, verification and a proposed
commit name. Run the repository's actual scripts; do not invent passing results. Preserve
unrelated changes. Report blocked checks. Review migration SQL before applying it; obtain
approval for destructive changes. No automatic commit, push, deployment or next-step work.
From step 29 onward, progress distinguishes `in progress`, `blocked`, `implemented—awaiting
review`, and `complete`. Completion requires acceptance evidence and resolved blocking review
findings. Documentation-only steps need document/link checks rather than meaningless app tests.

## Stage 1 — Backend foundation

## 1. Project skeleton

**Requirements**

- Initialize the existing repository with Node ESM, strict TypeScript, Hono and its Node adapter.
- Provide dev, typecheck, build and production-start scripts; separate app construction from
  listening so tests can import the app without starting a server.
- Add `/health` returning JSON `{ status: "ok" }`; ignore dependencies, build output and secrets.

**Acceptance criteria**

- The app starts, `/health` returns 200 with JSON, and compiled code runs outside the dev runner.
- Importing the app in a test does not bind a port. The lockfile is committed.

**Edge cases**: occupied port, unsupported Node version, missing compiled output, unknown route.

**Verification**: run dev and production builds; request `/health` and a nonexistent route;
run typecheck and inspect git status for generated or secret files.

**Commit**: `chore: initialize typed hono application`

## 2. PostgreSQL in Docker

**Requirements**

- Add development Compose with pinned PostgreSQL 17, a named volume, healthcheck and documented
  local-only credentials. Allow a configurable host port to avoid an existing database.
- Explain container-to-container versus host connection addresses in setup documentation.

**Acceptance criteria**

- Postgres becomes healthy and accepts SQL; a test row survives a container restart.
- Database access is local-development scoped; volume deletion is never a normal setup command.

**Edge cases**: port collision, Docker unavailable, unhealthy startup, old volume credentials
not changing when environment variables change.

**Verification**: inspect Compose status, query the version, insert/read a row across restart.

**Commit**: `chore(db): add persistent postgres development service`

## 3. Validated configuration

**Requirements**

- Validate `DATABASE_URL`, `PORT`, `NODE_ENV`, and `LOG_LEVEL` with Zod at startup.
- Export one server-only typed configuration object; provide a secret-free `.env.example`.
- Distinguish configuration syntax validation from database connectivity checks.

**Acceptance criteria**

- Missing/malformed configuration stops startup with field names but no secret values.
- Valid configuration boots; no browser module imports the config module.

**Edge cases**: empty strings, invalid port range, unsupported environment, malformed URL,
syntactically valid URL with bad credentials.

**Verification**: config unit tests and startup checks with valid and invalid fixtures.

**Commit**: `feat(config): validate server environment at startup`

## 4. Drizzle schema and first migration

**Requirements**

- Add recipe ID, title, cooking minutes, creation/update timestamps and appropriate constraints.
- Preserve an existing ID strategy; document UUID versus generated integer choice if new.
- Configure schema, migration directory and a bounded shared connection pool with shutdown cleanup.
- Generate and review SQL; use tracked migrations, not schema push, for persisted environments.

**Acceptance criteria**

- A clean database can be migrated; re-running the migration runner applies nothing twice.
- Invalid constrained values are rejected and connections close on shutdown.

**Edge cases**: interrupted migration, unavailable database, nullable legacy values, pool exhaustion.

**Verification**: inspect SQL and resulting schema; test clean migration and constraint rejection.

**Commit**: `feat(db): add recipes schema and tracked migrations`

## 5. Read recipes through the API

**Requirements**

- Add repository, service and route modules for `GET /api/recipes`.
- Return explicit API fields and stable ordering; keep request objects out of services.
- Seed a small repeatable development fixture without touching production data.

**Acceptance criteria**

- Seeded rows return as JSON; no rows returns an empty collection rather than an error.
- Internal database fields and credentials never appear in responses.

**Edge cases**: empty dataset, equal titles, Unicode titles, database unavailable.

**Verification**: request against empty and seeded databases; compare response with direct SQL.

**Commit**: `feat(recipes): add layered recipe listing endpoint`

## 6. Reproducible project setup

**Requirements**

- Document prerequisites, configuration, database startup, migrations, seeds, dev/build commands
  and common failures in README. Distinguish liveness from database readiness.
- Keep the project private; creation of an external repository or push requires user instruction.

**Acceptance criteria**

- A fresh checkout can reach a working recipes endpoint using only documented commands.
- No real secrets appear in README, examples, tracked files or the current diff.

**Edge cases**: existing remote, missing Docker, alternate database port, dirty checkout.

**Verification**: perform the setup walkthrough in an isolated local checkout; validate links/scripts.

**Commit**: `docs: document reproducible local setup`

## Stage 2 — Backend hardening

## 7. Create recipes with validation

**Requirements**

- Add `POST /api/recipes` with a reusable Zod request schema and explicit response contract.
- Trim titles, reject blank titles and invalid minutes, and document unknown-field handling.
- Return 201 with persisted data; use a consistent 400 validation response, preserving an
  already-established equivalent status convention if documented.

**Acceptance criteria**

- A valid recipe persists and appears in GET; invalid input creates no row.
- The server validates independently of the browser. Duplicate titles remain allowed unless
  the product explicitly chooses uniqueness.

**Edge cases**: malformed JSON, wrong content type, whitespace title, negative/fractional minutes,
oversized body, repeated submissions.

**Verification**: API tests for valid creation and each invalid input category.

**Commit**: `feat(recipes): add validated recipe creation`

## 8. Structured request logging

**Requirements**

- Add Pino JSON production logs and readable development logs.
- Record request ID, method, sanitized path, status and duration; propagate the ID to responses
  and downstream logs. Redact credentials, cookies, authorization and sensitive bodies.

**Acceptance criteria**

- One request can be traced through all relevant log records using the same ID.
- Success and failure requests are logged without exposing secrets.

**Edge cases**: unsafe incoming request IDs, sensitive query strings, aborted requests, log injection.

**Verification**: capture logs from concurrent and failing requests; assert correlation and redaction.

**Commit**: `feat(api): add correlated structured request logs`

## 9. Central error handling

**Requirements**

- Use a consistent envelope with code, safe message, request ID and optional validation details.
- Map known errors to documented HTTP statuses; unexpected failures become safe 500 responses.
- Log internal details on the server; integrate unmatched routes with the same envelope.

**Acceptance criteria**

- Validation, not-found and unexpected errors have consistent shapes and matching log IDs.
- Responses never leak stack traces, SQL, credentials or provider internals.

**Edge cases**: non-Error throw, database failure, malformed body before the route, missing request ID.

**Verification**: API tests with deliberately induced failures and response redaction assertions.

**Commit**: `feat(api): standardize error responses and logging`

## 10. Tests and continuous integration

**Requirements**

- Configure Vitest and isolated real Postgres tests using Testcontainers; apply real migrations.
- Test create-then-list, invalid input and database constraints; clean up pools and containers.
- Add CI for locked dependency install, typecheck, lint and tests; add builds as packages appear.

**Acceptance criteria**

- Tests pass on consecutive runs and do not depend on order or developer data.
- CI fails on an intentional test/type error and contains no production credentials.

**Edge cases**: Docker unavailable, parallel test collision, leaked handles, migration failure.

**Verification**: run twice locally; inspect CI after an authorized push, otherwise record CI unverified.

**Commit**: `test: add isolated postgres integration tests and ci`

## Stage 3 — Frontend foundation

## 11. Web scaffold

**Requirements**

- Create or retain `web/` with React, Vite and TypeScript; add router, query library and Tailwind tooling.
- Use feature folders and shared presentational primitives; document API dev proxy/base URL.
- Keep secrets out of browser-exposed variables and maintain a reproducible lockfile setup.

**Acceptance criteria**

- Web dev, typecheck and production build work without changing backend behaviour.
- A same-origin API proxy works locally; the browser contains no server credentials.

**Edge cases**: dev port collision, unavailable API, wrong base URL, conflicting package versions.

**Verification**: boot both apps, inspect a proxied request and build the web bundle.

**Commit**: `chore(web): scaffold react application and feature structure`

## 12. Design tokens and typography

**Requirements**

- Configure Tailwind v4 tokens in the main stylesheet and Archivo variable font with fallbacks.
- Retain the intended dense design: 12px base and 2px radius, subject to readable zoom and controls.
- Define numeric, label and name voices: width/weight 78/800, 88/600, 94/600; numeric tabular figures,
  label uppercase/tracking and named semantic color tokens.

**Acceptance criteria**

- Components consume tokens rather than scattered color literals; font failure leaves readable content.
- Zoom does not clip essential controls; focus and text contrast are checked.

**Edge cases**: blocked font network request, unsupported variable axes, reduced motion, long text.

**Verification**: inspect rendered token samples with font disabled and browser zoom enabled.

**Commit**: `feat(web): add design tokens and type utilities`

## 13. Small UI primitives

**Requirements**

- Add Button (primary/ghost/danger), neutral Pill, ReasonTag (save/pantry/fast), FlagTag and Kbd.
- Keep them presentational, with typed variants, accessible names and token-based styling.
- Buttons default to non-submit outside explicit form use; disabled controls cannot activate.

**Acceptance criteria**

- Every variant renders; buttons work by keyboard and communicate disabled/focus states.
- Reason and flag meaning is available in text, not only color.

**Edge cases**: long labels, icon-only buttons, nested form, disabled click, high zoom.

**Verification**: component tests for activation/disabled behaviour and visual variant inspection.

**Commit**: `feat(web): add accessible ui primitives`

## 14. Typed table primitive

**Requirements**

- Add a generic table with typed columns, stable row IDs, sticky headers and callback-based sorting.
- Support numeric alignment, group subtotals, optional checkboxes, checked text styling and
  none/check/promo row markers. Keep fetching and domain calculations outside the component.
- Preserve dense row spacing while ensuring readable labels and keyboard-accessible controls.

**Acceptance criteria**

- Two different row types compile without unsafe casts; sort controls expose current direction.
- Selection remains tied to row IDs after sorting; table semantics and group spans are correct.

**Edge cases**: no rows, equal sort values, null amounts, long names, horizontal overflow, duplicate IDs.

**Verification**: type tests, sorting/selection component tests and narrow-width visual inspection.

**Commit**: `feat(web): add generic sortable table`

## 15. State components and design reference

**Requirements**

- Add layout-matched Skeleton, actionable EmptyState and safe ErrorState with optional request ID.
- Provide retry where meaningful; distinguish network failure from a server response.
- Add a development-only `/design` route covering primitive variants and states.

**Acceptance criteria**

- All variants can be inspected locally; production does not expose the design route/module.
- Errors without request IDs still render; skeleton animation respects reduced-motion preference.

**Edge cases**: offline browser, malformed error payload, long message, empty state with no permitted action.

**Verification**: state component tests; build production and verify route exclusion.

**Commit**: `feat(web): add loading empty error and design states`

## 16. Application shell and routes

**Requirements**

- Build desktop sidebar (194px), topbar (42px) and independently scrolling content pane.
- Add `/week`, `/shopping`, `/recipes`, `/pantry`, `/household`, `/import`; unfinished views show
  explicit placeholders rather than nonfunctional controls.
- Highlight the active route and provide a narrow-screen navigation fallback; use dynamic viewport
  sizing/fallbacks so essential content remains reachable on small screens.

**Acceptance criteria**

- Navigation, back/forward and direct route loads work; only the intended pane scrolls on desktop.
- Keyboard focus and zoom do not trap users in clipped content.

**Edge cases**: unknown route, deep-link reload, short viewport, long content, virtual keyboard.

**Verification**: navigate/reload every route; resize, zoom and tab through the shell.

**Commit**: `feat(web): add responsive application shell and routing`

## 17. Query client and typed API boundary

**Requirements**

- Set up TanStack Query with documented stale/cache/retry defaults and development-only devtools.
- Use `hc<AppType>` with a type-only server import and browser-safe shared validation schemas.
- Keep one query-key convention; parse non-success responses into the common error representation.
- Do not claim offline/local-first behaviour: Postgres is the source of truth in this release.

**Acceptance criteria**

- Changing a consumed API response field creates a frontend type failure.
- Browser builds contain no database driver/config runtime; failed mutations do not retry blindly.

**Edge cases**: network failure, non-JSON server response, API type inference lost during route composition.

**Verification**: temporary compile-negative contract test, query error tests and bundle inspection.

**Commit**: `feat(web): add query client and typed api boundary`

## Stage 4 — Recipe vertical slice

## 18. Recipes list

**Requirements**

- Add recipes query hook and feature page using real API data, shared table and stable query keys.
- Support sorting and loading/empty/error/retry states; derive types from contracts.

**Acceptance criteria**

- Stored recipes render and sort without changing server data; empty state links to creation.
- API failure renders safely and retry recovers; cached data is not mislabeled as newly fetched.

**Edge cases**: equal titles, missing optional values, long names, background refresh failure.

**Verification**: component tests with success/empty/failure fixtures and live Postgres smoke check.

**Commit**: `feat(recipes): render recipes list with query states`

## 19. Recipe creation form

**Requirements**

- Use React Hook Form and the API's browser-safe Zod schema; do not duplicate validation rules.
- Display field/server errors, preserve failed submissions, prevent duplicate submission and
  invalidate the recipes collection on success.

**Acceptance criteria**

- Valid data appears in the list; invalid input has accessible errors and cannot bypass server validation.
- Failure preserves entered values; success resets or closes the form predictably.

**Edge cases**: double-click, whitespace title, server validation disagreement, timeout after server commit.

**Verification**: validation/mutation tests and create-then-list browser journey.

**Commit**: `feat(recipes): add validated creation form`

## 20. Keyboard navigation

**Requirements**

- Add shortcuts 1–6 for the six routes with visible Kbd hints and one cleaned-up listener.
- Ignore editable elements, contenteditable regions, composition and modifier combinations.
- Provide a way to disable single-character shortcuts; retain normal links and focus behaviour.

**Acceptance criteria**

- Each enabled shortcut navigates once; typing in fields never changes the route.
- Disabled shortcuts do nothing and normal keyboard navigation remains available.

**Edge cases**: held key repeats, IME input, select controls, nested editable widgets, remounting listeners.

**Verification**: event tests for each suppression condition and manual keyboard-only navigation.

**Commit**: `feat(web): add configurable keyboard navigation`

## Stage 5 — Ingredients and nutrition

## 21. Ingredient data model

**Requirements**

- Propose and document ingredients plus recipe-ingredient relationships before implementing SQL.
- Include recipe yield/servings, line quantities/units, ingredient base dimension, nutrition basis,
  optional density or piece weight, source provenance and explicit unknown values.
- Define foreign keys, deletion behaviour, quantity constraints and lookup indexes; nutrition is
  an estimate from source data, not a medical recommendation.

**Acceptance criteria**

- The approved model represents multiple ingredients per recipe and reuse across recipes without
  duplicating ingredient facts. It distinguishes absent nutrition from zero calories.
- Worked examples cover gram, millilitre and piece quantities and per-serving calculation.

**Edge cases**: ingredient deletion in use, duplicate ingredient names, raw/cooked variants, unknown yield.

**Verification**: review a relationship diagram and example records/calculations; no migration yet.

**Commit**: `docs(db): specify ingredient and nutrition model`

## 22. Migrate existing recipe data

**Requirements**

- Implement the approved model with tracked migrations and explicit legacy-data backfill rules.
- Inspect destructive statements and locks; back up non-disposable data and document recovery.
- Do not invent quantities/nutrition to satisfy new non-null constraints.

**Acceptance criteria**

- Existing recipe IDs/content survive; new relationships and constraints work on migrated and clean DBs.
- Legacy incomplete recipes remain identifiable and do not appear nutrition-complete.

**Edge cases**: null legacy fields, failed backfill, duplicate keys, interrupted deployment.

**Verification**: integration migration tests from a populated prior schema and a clean database.

**Commit**: `feat(db): migrate ingredient relationships without data loss`

## 23. Deterministic unit conversion

**Requirements**

- Normalize supported Czech/English unit aliases to g/ml/pcs with documented spoon/cup conventions.
- Cross volume/mass only with ingredient-specific density; pieces require a documented piece weight
  when converting to mass. Preserve original quantity/unit and conversion provenance.
- Reject invalid amounts; return an explicit domain error for unsupported or ambiguous conversion.

**Acceptance criteria**

- Metric conversions are reproducible; equal spoon volumes of oil/flour yield different masses
  when supplied with different known densities.
- Missing density or piece weight never silently becomes a guessed quantity.

**Edge cases**: decimal comma, fractions, zero/negative/non-finite values, heaped spoon, incompatible dimensions.

**Verification**: table-driven unit tests including precision tolerances and missing-metadata failures.

**Commit**: `feat(ingredients): add explicit base-unit conversion`

## 24. Nutrition calculation and recipe display

**Requirements**

- Calculate recipe totals and per-serving kcal in code using normalized amounts and nutrition basis.
- Return completeness and missing-data reasons; expose results via API and recipes-table column.
- Round for display only and recompute when quantities, nutrition facts or yield change.

**Acceptance criteria**

- Known fixtures match manual arithmetic; missing information displays unknown/partial, never false zero.
- Serving changes scale results correctly; complete and incomplete states are visibly distinct.

**Edge cases**: zero yield, missing density, mixed nutrition bases, extremely small quantities.

**Verification**: calculation unit tests, endpoint integration test and UI completeness states.

**Commit**: `feat(nutrition): calculate and display recipe calories`

## Stage 6 — Pantry

## 25. Pantry API and stock model

**Requirements**

- Add pantry lots with ingredient reference, normalized amount, optional expiry date and timestamps.
- Provide list/add/remove operations; keep separate lots when expiry or provenance differs.
- Validate positive stock, ingredient existence and date-only expiry; planning does not consume stock.

**Acceptance criteria**

- Lots persist, can be removed independently and cannot contain incompatible units or negative stock.
- Expired/unknown-expiry stock remains visible but is clearly classified for downstream use.

**Edge cases**: duplicate ingredient lots, missing expiry, already-expired entry, deleted ingredient,
repeated delete request.

**Verification**: API/integration tests for CRUD, constraints, duplicates and date handling.

**Commit**: `feat(pantry): add validated pantry lot management`

## 26. Pantry interface

**Requirements**

- Add pantry list/add/remove UI with quantities, expiry, loading/empty/error states and safe mutations.
- Show expiring-soon indicators and nav count using household calendar dates, default Europe/Prague.
- Preserve the existing check/promo visual variants if used, but label expiry urgency explicitly;
  do not describe urgent stock as a discount. Separate expired from expiring-soon items.

**Acceptance criteria**

- CRUD updates table and badge consistently; same ingredient with different expiry shows separate lots.
- Within-three-days and within-one-day boundaries are consistent across UI and backend.

**Edge cases**: expiry today, missing expiry, midnight/timezone change, failed removal, zero matching rows.

**Verification**: fixed-clock boundary tests and pantry browser smoke test.

**Commit**: `feat(pantry): add stock interface and expiry indicators`

## Stage 7 — Planner and development workflow

## 27. Deterministic planning algorithm

**Requirements**

- Describe and approve the algorithm before coding: candidate filtering, scoring, bounded search,
  stable tie-breaks, seed/version recording and independent final constraint validation.
- Generate seven days with lunch and dinner. Define servings, planned-meal calorie target (not an
  implied whole-day target), tolerance, budget basis, excluded ingredients and weekday preferences.
- Store validated household planning settings with a minimal API; the form is added in step 30.
- Hard rules: ingredient exclusions, declared calorie tolerance and budget when cost data is complete.
  Pantry-soon use is a scored preference; a user may explicitly require specified lots/amounts,
  in which case inability to use them is reported rather than silently relaxed.
- Add minimal store/offer data and manual fixtures now: product/ingredient mapping, pack quantity,
  price in integer currency minor units, currency, validity and promotion conditions. Leaflet imports
  later populate this same model. No price is treated as zero because it is unknown.
- Rank diversity, pantry urgency, valid offers, store count and weekday cooking effort with recorded
  weights. Explain choices from actual calculations; do not use an LLM.

**Acceptance criteria**

- Same input snapshot and seed give the same result; every returned valid plan passes independent
  constraint checks. Fourteen slots are produced only when feasible within the search performed.
- Budget is computed on the declared basis (recommended: packs required after pantry subtraction).
- Return structured unmet constraints or `no solution found within search limit`; a heuristic
  failure must not claim mathematical impossibility. Incomplete prices block budget certification.

**Edge cases**: no recipes, incompatible constraints, insufficient calorie data, missing prices,
expired offers, insufficient stock, limited protein variety, one recipe dominating all candidates.

**Verification**: hand-checkable fixtures, deterministic-repeat tests, impossible-input tests,
pack-rounding and constraint-invariant tests.

**Commit**: `feat(planner): add deterministic constrained meal planning`

## 28. Plan persistence and endpoints

**Requirements**

- Provide generate, fetch-by-week, explicit lock/unlock, replace-slot and regeneration contracts.
- Store plan ID/revision, week-start date, settings/input snapshot, algorithm version, slots, servings,
  locks and computed reasons. Define recipe-edit behaviour using snapshots or explicit version references.
- Use atomic writes, unique week/slot keys, and optimistic revision checks for competing edits.
- Regeneration preserves locked slots; reject conflicting replacements and invalid recipes. Use explicit
  desired lock state, not a non-idempotent toggle. Failed generation preserves the existing plan.

**Acceptance criteria**

- Fetch survives restart; locks survive regeneration; failed writes leave no partial plan.
- Stale mutations produce a documented conflict (409); repeated lock-setting has no additional effect.
- Hard constraints are revalidated after replacement, including conflicts caused by locked slots.

**Edge cases**: all slots locked, wrong week format, year boundary, deleted/edited recipe,
duplicate generation requests, simultaneous lock/regenerate, missing plan.

**Verification**: real-Postgres integration tests for persistence, concurrency, rollback and lock invariants.

**Commit**: `feat(plans): persist versioned plans and safe slot mutations`

## 29. Audit current implementation and adopt agentic development

**Requirements**

### A. Audit and reconcile before editing

- Inspect current code, git status, package scripts, tests, configuration, schema and step-28 endpoints.
- Record verified working behaviour, existing failures and gaps against steps 1–28. Do not mark a step
  complete just because this document lists it. Preserve user changes and completed work.
- Review both flows: current manual/prompt-based development and the proposed skill-based workflow;
  current product flow and the intended recipes → pantry → settings → plan → edits → shopping flow.
- Identify blockers such as missing price/household models, lock concurrency or browser/server imports.
  Present a prioritized reconciliation list before changing architecture. Fix approved bounded blockers;
  record larger gaps as explicit approved follow-ups, not hidden work in this step.

### B. Establish one context source

| File | Responsibility |
| --- | --- |
| `CLAUDE.md` | Concise command map, context routing, invariants and safety boundaries |
| `context/product.md` | Core flow, scope, household assumptions and planned mobile phase |
| `context/architecture.md` | Actual module/data boundaries and approved technical decisions |
| `context/code-standards.md` | Project conventions and executable verification commands |
| `context/build-plan.md` | This numbered plan; requirements are not duplicated into skills |
| `context/progress.md` | Current step/status, evidence, blockers, decisions and next action |
| `.claude/rules/` | Only useful path-scoped exceptions, not copies of context documents |

- Reuse existing files and paths where possible; remove contradictory active guidance only after
  confirming its consumers. `context/` is canonical; do not maintain competing root progress files.
- Update active old step references: old 29–47 become 30–48; the former 28A is superseded by 29.
- Keep secrets and private machine configuration out of tracked context.

### C. Adapt the existing three skills

- `/build-step <id>`: reads plan/progress and relevant context, inspects reality, states scope,
  implements only the selected step, verifies, records evidence and proposes the named commit.
- `/review <id>`: inspects requirements, diff, callers and tests without editing; reports evidence-backed
  critical/important/minor findings. Include both technical correctness and product-flow checks.
- `/recover <error>`: reproduces one failure after a normal correction failed, tests one hypothesis
  at a time, makes the smallest supported fix and stops after bounded unsuccessful attempts.
- Use the provided skill files as starting points, adapting paths and completion rules to this plan.
  Support identifiers 29–48 without numeric assumptions that skip subheadings or partial work.
- No extra overlapping build/finish/debug skills. Separate reviewer subagents are optional later;
  they are not required for this workflow. No automatic commits, pushes or deployments.
- Remove mandatory quiz/teach-back gates from project-specific skill adaptations; concise explanations
  are welcome, but successful verification is not conditional on a learning exercise.

### D. Add small, testable hooks and verification scripts

- Inspect installed Claude Code version and official hook schemas before choosing event/config syntax.
- Format only files changed by the task, using the existing formatter; handle paths with spaces safely.
- Run a bounded verification script at completion or require explicit check evidence. Guard against
  recursive completion hooks and stale success from an earlier diff. Preserve a clearly reported
  blocked state when Docker or another dependency is unavailable.
- Surface migration SQL warnings; never auto-apply migrations. Block obvious unsafe commands/secret
  access using available permissions and checks, without claiming regex filters are a security sandbox.
- Add secret scanning to local/CI checks. A Claude hook alone cannot police manual git commits.
- Hooks must not commit, push, install dependencies, send source externally or mutate databases.
- Test guards with inert fixtures, not real secrets or destructive commands.

### E. Correct contract and test boundaries where needed

- Inspect imports before moving files. If no equivalent safe shared boundary exists, establish
  `packages/contracts` using the current workspace tool; use npm workspaces only when none exists.
- Share browser-safe Zod contracts and inferred DTOs; keep database schema, configuration, providers
  and server services private. Keep Hono AppType imports type-only and avoid duplicate DTO schemas.
- Retain existing Vitest/Postgres tests. Add Playwright setup if absent and executable create/list
  and API-error journeys. Complete the lock/regenerate browser journey in step 33 when UI exists.

### F. Run the new workflow

1. Invoke `/build-step 29` from repository root; review the audit and approve material changes.
2. Implement approved changes and run actual verification commands.
3. Invoke `/review 29`; fix blocking findings, using `/recover` only when normal correction fails.
4. Re-run affected checks/review after changes. Update progress to `complete` only when evidence supports it.
5. Ask the user to inspect the diff and authorize the commit. The next build step is 30.

**Acceptance criteria**

- Audit maps actual implementation to the plan; discrepancies are resolved or explicitly tracked.
- All three slash commands load the intended project skills and use `context/` consistently.
- Existing endpoints/data remain intact; API and web compile with no server runtime in the browser.
- Each hook has a demonstrated positive and negative fixture; no hook triggers autonomous external actions.
- Relevant tests/build pass, or a genuine blocker is recorded without false completion.
- A read-only review does not edit files; recovery is bounded; progress identifies step 30 next.

**Edge cases**: dirty worktree, missing context file, duplicate/global skill names, renamed commands,
existing workspace setup, partially complete step 28, absent Docker, hook recursion, stale progress,
conflicting new requirements, absent browser UI for a planned test.

**Verification**: run each command against a bounded scenario; inspect diff/status before and after;
test hook fixtures; run contract/build checks and the existing regression suite. Document installed
tool compatibility. Do not treat a generic skill-schema validator as proof of Claude hook behaviour.

**Commit**: `chore(agent): reconcile project context and adopt step workflow`

## Stage 8 — Weekly planning interface

## 30. Week grid and planning settings

**Requirements**

- Add a seven-day, lunch/dinner grid using the persisted plan API; selection is local UI state.
- Show per-slot cost basis, kcal, servings, cooking time, lock and actual selection reasons. Use
  an outer selection ring, inner lock marker and non-colliding reason tag; expose text labels.
- Add `/household` settings for the inputs established in step 27: servings, planned-meal calorie
  target/tolerance, budget/currency, exclusions, preferences and timezone.
- Provide initial generate action and week navigation. On small screens use a reachable day/list
  layout, not seven unreadable compressed columns; native mobile implementation remains deferred.

**Acceptance criteria**

- Fourteen slots map to correct dates/meals; initial generation and settings persistence work.
- Infeasible generation shows reasons without inventing meals; unknown cost/kcal is labeled.
- Selection, reason and lock states remain distinguishable and keyboard-accessible.

**Edge cases**: no plan, no eligible recipes, year boundary, settings changed after generation,
partial data, long names, narrow screen.

**Verification**: grid/settings component tests and initial-generation browser journey.

**Commit**: `feat(week): add plan grid and household settings`

## 31. Meal detail rail and replacement

**Requirements**

- Add a persistent desktop detail rail (292px) with selected meal, ingredient amounts, reasons,
  cost/nutrition completeness and eligible replacements.
- Invoke the real replacement endpoint with current revision; refresh affected plan/summary data.
- Require explicit unlock before replacing a locked slot; use an inline/narrow-screen panel fallback.

**Acceptance criteria**

- Selection updates details; replacement persists and does not alter other slots accidentally.
- Reasons correspond to server calculations; invalid replacements explain the violated constraint.

**Edge cases**: no selection, no alternatives, stale selection after regeneration, failed replacement,
unknown prices, deleted recipe, stale revision.

**Verification**: selection/replacement tests, conflict fixture and browser replacement flow.

**Commit**: `feat(week): add meal details and validated replacements`

## 32. Optimistic locking

**Requirements**

- Implement explicit lock-state mutation with query cancellation, prior-state snapshot, optimistic
  update, rollback on failure and authoritative reconciliation after settlement.
- Serialize or disable simultaneous mutations on the same slot; preserve unrelated newer state.

**Acceptance criteria**

- Lock UI updates immediately, persists after reload and rolls back accurately on failure.
- Conflicts reconcile to server truth without clobbering another slot's successful update.

**Edge cases**: rapid repeated click, concurrent regeneration, delayed response, navigating to another week.

**Verification**: controlled-order mutation tests and failure/reload browser checks.

**Commit**: `feat(week): add conflict-safe optimistic slot locking`

## 33. Regeneration and dependent cache consistency

**Requirements**

- Regenerate using the current plan revision/settings; preserve locks and the existing plan on failure.
- Invalidate/refetch plan, shopping and cost keys only for the affected scope; define stable key factories.
- Show pending and conflict states; suppress duplicate actions and reconcile stale selection.

**Acceptance criteria**

- Locked slots survive regeneration, dependent totals are current, and failure leaves previous data usable.
- All-locked input returns a documented no-op or clear result; inconsistent constraints are explained.

**Edge cases**: all slots locked, request timeout after commit, rapid repeated regeneration,
two tabs editing, changed recipe/price inputs.

**Verification**: integration/cache tests and Playwright generate → lock → regenerate → reload journey.

**Commit**: `feat(week): regenerate plans with consistent dependent data`

## Stage 9 — Shopping list

## 34. Shopping derivation API

**Requirements**

- Aggregate scaled ingredients, allocate available pantry lots once across the plan and subtract stock
  without modifying it. Exclude expired lots under the agreed date policy; use earliest expiry first.
- Reuse step-27 offer model and budget-cost function; normalize pack units, round purchases to whole
  packs and compare eligible current offers. Expose consumed cost versus purchase outlay distinctly.
- Group by store, retain unknown-price/unmatched items, and return price provenance and completeness.
- Choose cheapest eligible offer per item for this release; do not claim global basket optimality
  when store count, multi-buy conditions or delivery charges would change the result.

**Acceptance criteria**

- Known fixture produces correct quantities, pack counts and subtotals; shared pantry is not double-counted.
- Missing prices do not become free items; generating a shopping list never consumes pantry stock.

**Edge cases**: stock exceeds need, mixed units, fractional packs, expired offers, loyalty eligibility,
multiple stores tied, missing mapping, currency mismatch.

**Verification**: hand-calculated unit fixtures plus integration tests using plans, lots and offers.

**Commit**: `feat(shopping): derive pantry-adjusted purchase requirements`

## 35. Shopping interface

**Requirements**

- Render store groups, required quantities, pack purchases, subtotals, incompleteness warnings and
  checkable items. Keep check state local to plan/revision with stable item IDs and clear reset behaviour.
- Provide loading/empty/error states and narrow-screen shopping usability.
- Checking means marked on this list, not automatic purchase or pantry replenishment. Offline sync,
  receipts and inventory consumption are explicit future work.

**Acceptance criteria**

- Checkmarks survive sorting within the active list, totals match API, and new plan revisions do not
  silently inherit obsolete checkmarks. Unknown-cost items remain visible.

**Edge cases**: all checked, pantry covers everything, regeneration, missing store, list refresh failure.

**Verification**: grouping/check-state tests and plan-to-shopping browser journey.

**Commit**: `feat(shopping): add grouped shopping list interface`

## Stage 10 — Recipe extraction

## 36. Recipe extraction service

**Requirements**

- Accept bounded pasted text and call the Anthropic SDK through a small server-only extractor adapter.
- Define a structured draft schema with title, servings, ingredient text, quantity/unit and explicit
  uncertainty. Validate output; treat source text as data, never instructions to access tools/secrets.
- Handle refusal, truncation, malformed output, timeout and rate limits; bound retries and token use.
- Return a draft only: no automatic ingredient creation, pantry mutation or final recipe persistence.
- Protect cost-bearing endpoints with request limits; no public exposure before authentication.

**Acceptance criteria**

- Valid text yields a validated editable draft; missing facts stay unknown and errors are safe.
- Provider keys never reach browser/logs; quantities/nutrition are not fabricated to pass validation.

**Edge cases**: empty/oversized input, mixed languages, prompt injection, ambiguous servings,
provider unavailable, schema-valid but semantically wrong output.

**Verification**: mocked provider contract/failure tests and a deliberately bounded live smoke run.

**Commit**: `feat(import): add validated recipe extraction drafts`

## 37. Recipe extraction baseline

**Requirements**

- Label ten representative recipes with expected outputs and field-normalization rules.
- Record dataset/prompt/model versions, whole-recipe and per-field results, invalid outputs and
  failure categories. Use source data you may retain; keep personal content out of fixtures.

**Acceptance criteria**

- A repeatable runner produces actual scores and mismatch examples; no accuracy claims are invented.
- Ambiguous ground truth is explicitly labeled; the small sample is described as preliminary evidence.

**Edge cases**: acceptable alternative units, unknown yield, duplicated samples, provider failure.

**Verification**: manually cross-check labels and scoring on one correct and one incorrect fixture.

**Commit**: `test(ai): establish recipe extraction baseline`

## 38. Recipe review and confirmation

**Requirements**

- Show source and editable draft side by side, with accessible narrow-screen layout and uncertainty reasons.
- Support ingredient mapping, quantity/unit corrections and deterministic conversion/nutrition preview.
- Allow unresolved uncertainty to be saved as a draft; only validated confirmed records enter planner
  calculations. Do not silently save guessed quantities as verified facts.
- Save confirmed recipe and ingredient relationships transactionally; prevent duplicate submit.

**Acceptance criteria**

- Corrected data survives reload; canceled review creates no final recipe.
- Unresolved draft remains editable but cannot misleadingly satisfy nutrition/budget constraints.

**Edge cases**: unknown ingredient, unsupported unit, missing serving count, invalid edit, failed save,
duplicate recipe title, provider text containing markup.

**Verification**: extract/edit/save browser journey, transaction tests and draft-exclusion tests.

**Commit**: `feat(import): add recipe review and confirmed saving`

## 39. AI usage and cost observability

**Requirements**

- Record feature, provider/model, prompt version, protected input fingerprint, token usage, latency,
  status and estimated cost per attempt with request correlation.
- Keep raw source/private payloads out of default logs; fingerprints are not a guarantee of anonymity.
- Store rate/currency assumptions for estimates and display scoped total spend with unknown-cost warnings.

**Acceptance criteria**

- Success, retry, timeout and invalid-output attempts are observable without double-counting totals.
- Missing provider usage remains unknown; monetary estimates are distinguishable from billed amounts.

**Edge cases**: interrupted call, incomplete usage, pricing change, retries, exchange-rate conversion.

**Verification**: mocked usage/status fixtures, aggregation tests and sidebar display check.

**Commit**: `feat(ai): add redacted usage and cost telemetry`

## Stage 11 — Offer extraction and matching

## 40. Deterministic leaflet parser baseline

**Requirements**

- Start with pasted leaflet lines, not automated scraping or PDF/OCR ingestion.
- Parse product, pack quantity/unit, price, currency, store, validity and conditional promotion fields
  into the offer schema from step 27; leave ambiguous fields unresolved.
- Create a small hand-labeled fixture set now; reuse the scoring harness with the larger set in step 41.

**Acceptance criteria**

- Parser produces repeatable outputs and measured field-level errors; unknown values are not invented.
- An ordinary pack price is distinguished from a displayed per-unit comparison price.

**Edge cases**: decimal commas, crossed-out prices, multi-buy, loyalty-only prices, missing year,
multiple products on a line, validity crossing a year.

**Verification**: parser unit tests and baseline report on the initial fixtures.

**Commit**: `feat(offers): add deterministic leaflet parsing baseline`

## 41. Labeled offer evaluation dataset

**Requirements**

- Curate 150–200 permitted real examples covering units, stores, dates and offer conditions.
- Record source provenance, annotation rules, expected schema and unresolved ambiguity.
- Split tuning and held-out sets by source/leaflet to reduce leakage; version data and scoring rules.

**Acceptance criteria**

- Labels validate against the schema; duplicate/leaking examples are detected and ambiguous labels flagged.
- Both parser and future model extractor use the same evaluation contract and held-out set.

**Edge cases**: contradictory source prices, missing dates, near-duplicate offers, illegible input.

**Verification**: dataset validation, duplicate check and manual spot review; rerun parser baseline.

**Commit**: `test(offers): add versioned labeled evaluation dataset`

## 42. Model extraction and field metrics

**Requirements**

- Extract structured offer drafts through the provider adapter with explicit source/context dates.
- Validate monetary/unit/date semantics after schema validation; record prompt/model/config versions.
- Score product, price, pack unit/amount, validity and promotion conditions separately; count abstentions
  and invalid responses. Use supported deterministic settings without claiming perfect reproducibility.

**Acceptance criteria**

- Comparison with the deterministic baseline uses identical held-out examples and scoring rules.
- Results include denominators, error examples and unknown/invalid rates; no expected accuracy is prefilled.

**Edge cases**: schema-valid wrong price, inferred year, provider refusal, conditional discount ambiguity,
truncated output, repeated runs differing.

**Verification**: offline scorer tests, bounded live evaluation and inspected mismatch report.

**Commit**: `feat(ai): extract offers with field-level evaluation`

## 43. Evaluation gates in CI

**Requirements**

- Run deterministic parser/scorer/schema tests and recorded-output regression tests on normal PRs.
- Run live model evaluation separately through an explicitly triggered or configured scheduled job
  with spend limits, protected secrets and versioned reports; do not call paid APIs on untrusted PRs.
- Agree field-specific release thresholds from measured baseline and risk; separate provider outages
  from quality regressions and define repeated-run handling before accepting a new prompt/model.

**Acceptance criteria**

- A known bad fixture fails the offline gate; passing cached tests do not imply the live model passed.
- Live results identify model/prompt/dataset versions and cost; threshold changes require visible review.

**Edge cases**: missing secret, rate limit, model retirement, noisy small sample, stale recorded outputs.

**Verification**: deliberately failing offline fixture and a bounded authorized live-job trial.

**Commit**: `ci(ai): add offline regression gates and bounded live evals`

## 44. Bulk offer review

**Requirements**

- Show editable extracted rows with source, store, pack, price, validity and conditional flags.
- Preselect valid unambiguous rows; unresolved critical price/unit/date rows require correction or
  explicit review and cannot silently become active offers. Keep uncertain drafts savable.
- Provide needs-review filter, select/deselect controls, duplicate handling and a confirmation summary.
- Save accepted records to the established offer model; report atomic or per-row outcomes consistently.

**Acceptance criteria**

- Excluded rows are not imported; validation errors point to rows; repeat submission does not duplicate offers.
- Imported offers immediately follow the same eligibility/expiry rules as manual offers.

**Edge cases**: no selected rows, duplicate batch, expired offer, changed filter hiding selected rows,
partial save failure, identical product names with different packs.

**Verification**: selection/editing tests and import-to-shopping integration fixture.

**Commit**: `feat(offers): add bulk review and safe offer import`

## 45. Ingredient matching and confirmation

**Requirements**

- Begin with exact aliases, normalization and `pg_trgm` candidate similarity for Czech names;
  normalization and trigram matching alone are not full morphological understanding.
- Evaluate embeddings/pgvector only if measured matching gaps justify them; document managed-DB
  extension support, embedding version and operating cost before adopting.
- Reject incompatible categories/units, prioritize precision, and queue uncertain matches for human review.
- Store confirmed mappings and provenance; invalidate affected planning/shopping data after changes.

**Acceptance criteria**

- Report precision/recall separately on held-out labeled mappings, including difficult negative pairs.
- Non-food cream cannot auto-match food cream; abstention is valid, and human confirmation survives reload.
- Only confirmed or threshold-approved validated mappings affect planner prices.

**Edge cases**: ambiguous names, brands, pack-size variants, missing candidates, embedding outage,
ingredient deletion, old mappings after catalog edits.

**Verification**: positive/negative matching fixtures, threshold evaluation and manual-confirmation integration test.

**Commit**: `feat(matching): add precision-first ingredient mapping`

## Stage 12 — Secure release

## 46. Authentication and authorization

**Requirements**

- Select a maintained authentication implementation compatible with the deployment; document session,
  CSRF, origin and abuse controls. Web uses Secure/HttpOnly cookies with deliberate SameSite policy.
- Add household ownership and server-side authorization to recipes, pantry, plans, imports and usage;
  derive scope from the authenticated user, never trust a submitted household ID.
- Migrate existing local records to an explicitly selected owner; deny unowned or cross-household access.
- Preserve transport-independent identity/authorization for later mobile access/refresh-token support;
  do not implement a native token lifecycle before the mobile phase.
- Rate-limit login and cost-bearing endpoints; redact identity/session secrets from logs.

**Acceptance criteria**

- Login/logout and session expiry work; unauthenticated requests are denied appropriately.
- Two test users cannot read or mutate one another's records through guessed IDs or nested references.
- Logout invalidates server sessions; write requests pass explicit CSRF/origin protections.

**Edge cases**: expired/revoked session, multiple tabs, CSRF attempt, proxy/cookie configuration,
cross-household ingredient references, ambiguous legacy ownership.

**Verification**: authentication browser journey, ownership matrix integration tests and session/CSRF tests.

**Commit**: `feat(auth): secure sessions and household data access`

## 47. Production build and deployment

**Requirements**

- Build reproducible production images; validate configuration, limit resource use and handle shutdown.
- Keep development Compose separate from optional production-like Compose. A managed-Postgres hosted
  deployment does not require running a second database container from production Compose.
- Configure chosen host (Fly.io if retained), TLS, private database connectivity, least-privilege runtime
  access, production secrets, API routing, liveness/readiness and migration release procedure.
- Back up the database, test restoration and document application rollback plus migration compatibility.
- Prepare deployment artifacts; execute an actual deployment only with explicit user authorization.

**Acceptance criteria**

- Production build passes; no database port or secrets are publicly exposed; auth works over HTTPS.
- Readiness fails on DB unavailability without confusing it with process liveness.
- After authorized deployment, recipe → plan → shopping → import flows pass production smoke checks.
  If not authorized, record deployment pending rather than claiming a live release.

**Edge cases**: migration failure, cold start, pool limits, unavailable DB/provider, wrong proxy origin,
rollback to code incompatible with new schema.

**Verification**: container smoke test, configuration/security checks, restore rehearsal and authorized live smoke test.

**Commit**: `chore(deploy): add production release and recovery workflow`

## 48. Observability and release documentation

**Requirements**

- Add redacted Sentry reporting with release/version and request correlation, plus actionable error
  monitoring; avoid sending recipes, credentials or household data by default.
- Update README with app walkthrough, architecture, setup, tests, deployment/recovery, mobile roadmap,
  AI boundaries, measured evaluation results and known limitations.
- Report measured endpoint latency, extraction cost and cost assumptions accurately; deterministic
  plan generation has no model-call cost. Document sources/permissions and remove unsupported legal claims.
- Add a screenshot or short demo and a release checklist showing unresolved nonblocking work.

**Acceptance criteria**

- A controlled error appears with correct release/correlation and no sensitive payload.
- Documentation matches current commands and measured results; completed/pending items are explicit.
- The demo covers the real core loop rather than disconnected mock screens.

**Edge cases**: missing monitoring configuration, duplicate error reporting, source-map exposure,
stale benchmark, unavailable external provider during demo.

**Verification**: controlled monitoring event, redaction inspection, fresh setup walkthrough and final core-loop smoke test.

**Commit**: `docs(release): add observability and product handoff`

## Implementation references

Consult the official documentation against installed versions when implementing step 29 or changing
tool configuration. These references support implementation; they are not additional build steps.

- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Claude Code project context](https://code.claude.com/docs/en/memory)
- [Claude Code hooks](https://code.claude.com/docs/en/hooks-guide)
- [Hono RPC](https://hono.dev/docs/guides/rpc)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
