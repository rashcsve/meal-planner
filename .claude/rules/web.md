---
paths:
  - "web/**"
---

## Frontend

Lives in `web/`. Vite + React + TypeScript.

| Concern      | Choice                                                  |
| ------------ | ------------------------------------------------------- |
| Routing      | React Router                                            |
| Server state | TanStack Query — this IS the state architecture         |
| Client state | useState / useReducer only                              |
| API client   | Hono `hc` typed RPC, importing AppType from the backend |
| Forms        | react-hook-form + Zod (schemas imported from backend)   |
| Styling      | Tailwind v4                                             |
| Component tests | Storybook + `@storybook/addon-vitest` — every story runs as a real Vitest test in headless Chromium |

Storybook: `npm run storybook -w web` to browse. Every story auto-generates a
Docs tab (`@storybook/addon-docs` + `tags: ['autodocs']` in `preview.tsx`).
`npm run test -w web` runs every story as a real Vitest test in headless
Chromium — render crashes and accessibility violations (`@storybook/addon-a11y`,
axe-core) both fail the run, not just flag for review (`preview.tsx`'s
`a11y.test: 'error'`). Root `npm test` / `typecheck` / `lint` cover both `api`
and `web`, so CI enforces all of this. `@storybook/addon-mcp` exposes the story
catalog to AI agents over MCP at `/mcp` — call `get-storybook-story-instructions`
before writing stories, `preview-stories` / `run-story-tests` after.

Rules:

- No global store. No Redux, no Zustand. If it comes from the server, it's a query.
- Folders by feature: `features/week`, `features/recipes`, …
  Features never import from each other. Shared things move to `shared/`.
- No component library. No barrel files. No atomic design.
- Types are never hand-written to mirror the backend — they're inferred.
- Desktop app: viewport-height layout, panes scroll independently, never the page.
  12px base, mouse-sized targets, keyboard shortcuts.

## Design system

Primitives in `web/src/shared/ui/`. Tokens in `web/src/index.css`.

### Principles

- Numbers are the display type. Archivo variable, the width axis does the work:
  numerals condensed+heavy, labels narrow+uppercase, body normal.
- Borders, not shadows. No elevation anywhere. 1px lines, 2px radius only.
- One saturated colour at a time. The UI is greyscale on paper.
- Density is a feature: 12px base, 16px hit targets, viewport-height layout.

### Tokens

surfaces paper #EFEEE9 · card #FFF · sink #E7E5DF · rail #F4F3EF
text ink #17191C · muted #6B6E73 · faint #9A9C9F
borders line #DAD8D1 · hair #E6E4DE
semantic promo #D93A20 · check #B8860B · ok #2E7D52 · lock #1F3F8F
tints promo #FBE7E2 · check #FDF3D6 · ok #E3F0E9 · lock #E7E9EE

### Semantic colour — each means exactly one thing

- promo money saved, over budget, expired
- check the model is unsure, needs the user's eyes
- ok confirmed match, uses pantry stock
- lock user intent (locked meal), focus ring

promo and check are opposites: promo is good news needing no action, check is
"look at this". Never use promo for warnings or check for savings.

Destructive actions (delete, remove) currently borrow promo's red for visual
weight without claiming its meaning — this is a deliberate exception, not a
fifth semantic colour.

### Type scale

9 · 10 · 11 · 12 · 13 · 15 · 18 · 25 · 34. Nothing between.
Tabular numerals wherever numbers stack in a column.

### Rules

- Row state = 2px inset bar on the first cell, never a background wash.
- One primary button per view; ghost for everything else.
- Never remove focus-visible — keyboard nav is a feature of this app.
- No hex values outside index.css. Ever.
- No dark mode, no animation beyond skeleton shimmer.
- Add a primitive when a screen needs it, never speculatively.
