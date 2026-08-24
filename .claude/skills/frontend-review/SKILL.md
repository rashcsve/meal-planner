---
name: frontend-review
description: Audit web/ against the design system and frontend rules in CLAUDE.md. Checks component boundaries, design token compliance, TanStack Query patterns, accessibility, and Storybook coverage. Use when the user asks to review, audit, or clean up the frontend, the UI, the design system, or the components. For backend layers, database, or cross-cutting concerns, use architecture-review instead.
---

# Frontend review

A read-first audit of `web/`. Produces a report and proposals. **Changes nothing
without explicit approval.**

Scope is the frontend only. Backend layering, migrations, logging and CI belong
to `architecture-review` — don't duplicate them here.

---

## Rules for this skill

1. **Read everything before judging anything.** No verdicts from filenames.
2. **Change no files during phases 1–3.**
3. **Every finding names a file and gives a one-line fix.**
4. **Severity is honest.** Most findings are `low`. If everything is `high`,
   severity carries no information.
5. **Name what's holding up well.** A review that only lists problems gets
   ignored by the third run.
6. **The user has 7 years of React.** Don't explain React. Do explain
   TanStack Query cache semantics, accessibility specifics, and anything
   about this project's own conventions.
7. **Never propose a rewrite or a new library.** Fix in place.

---

## Phase 1 — Inventory

Read in this order:

1. `CLAUDE.md` — especially the Frontend and Design system sections
2. `web/src/index.css` — the token definitions
3. Every file in `web/src/shared/`
4. Every file in `web/src/features/`
5. `web/src/routes/`, `App.tsx`, `main.tsx`
6. All `*.stories.tsx`
7. All `*.test.tsx`
8. `.storybook/main.ts` and `.storybook/preview.ts`

**If Storybook is running**, use the `meal-planner-sb` MCP tools:

- `list-all-documentation` — which components are actually documented
- `get-documentation` — for any component whose props look inconsistent with use
- `run-story-tests` — current state of story tests

If Storybook isn't running, say so and skip those checks rather than guessing.

Then state in three or four lines: how many features exist, how many primitives,
how many have stories, how many have tests, and which routes are real versus
placeholder.

---

## Phase 2 — Audit

Report passes as well as failures.

### Component boundaries

- Does any file in `features/X` import from `features/Y`?
- Does anything in `shared/ui` reference recipes, meals, pantry, plans, or any
  other domain concept? Test: could it exist unchanged in a different product?
- Is anything in `features/` used by two features, and should therefore move to
  `shared/`? (Trigger is actual reuse, not anticipated reuse.)
- Is anything in `shared/` used by only one feature, and should move back?
- Any top-level `components/`, `hooks/`, or `utils/` directories?
- Any barrel `index.ts` re-export files?

### Design system compliance

- Any hex, `rgb()`, or `hsl()` value outside `web/src/index.css`
- Any font size outside the scale: 9 · 10 · 11 · 12 · 13 · 15 · 18 · 25 · 34
- Any `border-radius` other than 2px (pills and kbd excepted)
- Any `box-shadow` or elevation
- Row state implemented as a background wash rather than a 2px inset bar on the
  first cell
- More than one primary button in a single view
- Semantic colours used against their defined meaning — `promo` for a warning,
  `check` for anything that isn't model uncertainty, `ok` for a generic success
- Spinners instead of skeletons
- Empty states that don't carry the action that fills them
- Arbitrary Tailwind values (`text-[13px]`, `bg-[#fff]`) where a token exists

### TanStack Query

- Any `useEffect` fetching data instead of a query
- Any global store, or `setQueryData` used as a store rather than for optimistic
  updates
- Query key structure: are keys hierarchical enough to invalidate partially, or
  does one mutation have to nuke everything?
- Optimistic mutations: is `cancelQueries` called in `onMutate`? Is there a
  rollback in `onError`? Is `onSettled` invalidating?
- Any hand-written interface mirroring a backend type instead of inferring from
  the typed client
- `staleTime` / `gcTime` set deliberately, or left default without a reason
- In tests: is `retry: false` set on the test QueryClient? Without it, error-path
  tests hang and then pass for the wrong reason.

### React correctness

- Derived values stored in `useState` and synced with `useEffect`, where they
  could just be computed during render
- `key` props using array index on lists that reorder
- Missing error boundary around the routed content
- Effects with missing or over-broad dependency arrays

### Accessibility

- `focus-visible` removed or overridden anywhere
- Interactive `div`s or `span`s with click handlers and no role, tabindex, or
  keyboard handler
- Form inputs without an associated label
- Icon-only buttons without an accessible name
- The keyboard shortcut handler: is it disabled while focus is in an input?
- Colour used as the sole carrier of meaning, with no text or shape alongside

### Storybook

- Every `shared/ui` primitive has a story covering all its variants and states
- No stories exist for `features/` components
- Any story documenting a prop the component doesn't have, or missing one it does
  (verify via `get-documentation`)
- Stories referencing components that no longer exist
- Is `.storybook/preview.ts` importing `index.css`? Without it primitives render
  unstyled and every visual judgement made in Storybook is wrong.
- Does the `/design` route still exist? It should have been deleted when
  Storybook replaced it.

### Dead weight

- Components nothing imports
- Exported functions with no callers
- Commented-out blocks
- Dependencies in `web/package.json` that nothing imports
- Placeholder routes for features whose endpoints now exist

---

## Phase 3 — Report

### Holding up well

Two to four specifics. "No feature imports another feature" beats "good structure".

### Findings

| #   | File | Issue | Why it matters | Severity | Fix |
| --- | ---- | ----- | -------------- | -------- | --- |

Severity:

- **high** — a user-visible bug, an accessibility barrier, or something that will
  make the next feature painful
- **medium** — will cause drift or rework soon
- **low** — inconsistency; fix when you're next in that file

### The one thing

The single fix that would most improve the frontend, and why that one over the
others. Force a judgement; don't hedge with a list.

---

## Phase 4 — Propose updates

**To `CLAUDE.md`:** conventions the code now follows that the file doesn't
describe, and rules the code has outgrown. Present as a diff with one line of
reasoning each. Be strict — ask of every proposed line: _would Claude Code have
done something different if this had been there?_ If not, don't add it.

**To the design system reference:** any primitive built since the last review
that isn't in `docs/design-system.html`.

---

## Phase 5 — Wait

Stop. Present everything and ask what to apply.

Apply only what's approved, in small commits, one concern each, using the
Conventional Commits format from `CLAUDE.md`. Never batch unrelated fixes.

If Storybook is running and stories changed, run `run-story-tests` afterwards and
report the result.

Then ask three questions about the changes to check the user followed what
happened and why.
