# Product

## Direction: Use It Up

Help one household decide what to cook, use food already available, buy the shortfall,
and record what was actually cooked or discarded. Planning, shopping and cooking
should agree about quantities and distinguish known facts from missing information.

The approved direction is dinner-only, one calorie target per standard portion
(±10%), and fixed portion shares for each person. The planner selects suitable
recipes; it does not change a person's share to reach an individual calorie target.
For example, 0.75 + 1.5 shares means cooking 2.25 standard portions. Actual target
and share values are household settings, not values to infer silently from old data.

## Current application versus target behavior

The current code still uses individual dinner calorie targets and recipe-dependent
servings. It already generates seven dinners and stores each plan's member servings.
The new model is **planned, not implemented**. Existing saved portions must survive
migration; applying a new model to an existing week requires an explicit operation.

Other agreed target behavior:

- Save incomplete recipe drafts without certifying calorie compliance.
- Apply consistent rules to automatic planning, expiry suggestions, locks and swaps.
- Prioritize expiring food without breaking exclusions or other rules.
- Preview a plan or swap before accepting it; retain warnings after reload.
- Planning does not deduct stock. Cooking records and deducts actual usage.
- Shopping covers remaining uncooked meals and subtracts usable stock once.
- Show estimated meal cost separately from expected checkout spending.
- Keep historical cooking and meal facts stable when their source data changes.

These statements describe the destination, not features already delivered.

## Scope

First release: one household, responsive web, dinners and kcal. Preserve the stack
and data. Deterministic code owns scaling, units, nutrition, inventory, money and
constraints. Models assist reviewed extraction; pasted recipe text comes first.
Basic shopping by aisle must work before offers or scheduled leaflet ingestion exist.

Use the design canvas's **Now** boards as the visual reference. Older mobile boards
supply layout, not lunch/macro requirements. Authentication is required before public
access; a local build can precede it. Session and ownership design depend on the actual
release audience, not an assumed future native app.

Later: lunches and leftovers, macros, recipe import from links/photos, offline shopping,
native mobile and multiple households. Retain existing per-member preference data even
though dedicated per-person allergy management is deferred in the new UI.

## Source of truth and next action

[build-plan.md](build-plan.md) owns the revised milestones R01–R14, acceptance criteria,
source mapping and open decisions. [progress.md](progress.md) records actual delivery.
[architecture.md](architecture.md) describes the current code. The historical numbered
plan is [build-plan-v1.md](build-plan-v1.md).

The user requested planning before implementation. Review the revised plan first;
resume code changes only when the user requests a build step. No implementation
milestone is complete merely because its requirements are documented.
