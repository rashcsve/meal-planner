# Product

## Core flow

Maintain recipes and pantry stock, generate a week of meals against
calorie/budget/exclusion constraints, inspect or replace individual meals, lock
choices that should survive regeneration, and shop from the resulting list. Plans
must explain their choices (which constraint or preference drove a pick) and
distinguish known facts (measured prices, known nutrition) from missing
information (unknown price, incomplete nutrition) — never silently treat unknown
as zero or complete.

Current phase plans dinner only (one household, two members, each with their own
per-meal calorie target); breakfast/lunch/snack remain defined in the meal-slot
type for a later phase but are not generated. Each household member has their own
calorie target for the meal; the planner picks one recipe per slot and scales
each member's portion (servings, and the ingredient quantities/cost that follow
from them) to hit their individual target, rather than picking different recipes
per person or targeting one combined household total.

## Scope

First release: a web app for **one household**, single user, no authentication
(arrives at step 46). Deterministic code owns units, nutrition, money, inventory,
constraints and planning. AI (Anthropic SDK) only assists unstructured input —
recipe text extraction (stage 10) and leaflet/offer extraction (stage 11) — and
every AI output is a reviewable draft, never auto-committed to planning data.

## Planned mobile phase (not now)

A native mobile client is a later phase. Because of this:

- The HTTP API must stay independent of any web-specific assumption.
- Contracts live in `shared/` as plain Zod schemas — not React, not cookie-shaped.
- Do not assume the web session/auth model will be reused unchanged on mobile;
  step 46 keeps identity/authorization transport-independent for this reason.
- Native screens, offline sync and mobile token flows are out of scope for the
  48 steps in `context/build-plan.md`.

## Non-goals (see CLAUDE.md "Deliberately excluded")

Kubernetes, microservices, message queues, gRPC, Redis/caching, GraphQL,
tracing/metrics before deployment. Auth arrives at step 46, not earlier.

## Source of truth

`context/build-plan.md` is the numbered plan and owns requirements/acceptance
criteria per step — they are not duplicated here. This file only records product
intent that isn't obvious from the plan or the code.
