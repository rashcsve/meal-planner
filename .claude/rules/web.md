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
| Forms        | react-hook-form + Zod (schemas imported from `shared/`) |
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
- Desktop-first: viewport-height layout, panes scroll independently, never the page.
  Keyboard shortcuts. Narrow widths stack, never clip.

## Current look

Primitives in `web/src/shared/ui/`. Tokens in `web/src/index.css` — Archivo, 12px
base, 2px radius, `paper/card/ink/line/…` colours. Until R06 lands, new and changed
screens use these existing tokens and primitives, not the v1 values below.

## Design system — v1 (target for R06, not yet built)

R06 ([build-plan.md](../../context/build-plan.md) "R06 — Use It Up design refresh")
migrates `index.css` and the primitives to this.

Visual reference: screenshots in `context/design/v1/` — `style-guide.png` plus one
per screen (`today`, `plan`, `shopping`, `fridge`, `recipes`, `recipe-detail`,
`household`). The screens fix layout and copy; this section fixes the look. Where a
screenshot and this section disagree, this section wins.

Editable source (owner only): https://claude.ai/artifact/DpL7zNqvqVntG8si6KxsFe —
boards "Design system v1 — style guide" and the row "Old pages, style A design
system". When the design changes, replace the PNGs in the same commit.

### Principles

- The page explains itself. Every list says why (reason lines, status tags with
  words); the look stays quiet so the explanations carry the screen.
- Borders, not shadows. White cards with a 1px divider line, no elevation.
- Greyscale first. Colour only carries meaning (see semantic colour).
- Real food photos, never illustrations.

### Tokens

surfaces page #FAFAF9 · surface #FFFFFF · fill #F5F5F4 · dark card #18181B
text ink #18181B · muted #57534E
non-text subtle #A8A29E — icons and disabled states only; fails AA as text (~2.5:1)
borders border #D6D3D1 (controls) · divider #E7E5E4 (cards, rows)
semantic ok #2D6A4F · warning #B54708 · danger #B42318 · lock #1F3F8F
tints ok #ECFDF3 · warning #FFFAEB · danger #FEF3F2 · lock #E7E9EE
radius tag 4px · control 6px · card 8px · circles only for dots and avatars
spacing 4 · 8 · 12 · 16 · 24 · 32

### Semantic colour — each means exactly one thing

- ok uses what's in the fridge, inside the calorie target, money saved,
  confirmed match; also the accent (current-page underline, text links)
- warning expires soon, a guessed value, the model is unsure — needs the user's eyes
- danger expires today or expired, binned, over target or budget; destructive actions
- lock user intent (locked meal), focus ring

Colour never carries meaning alone: every tag or tone also has words.

### Type

Inter only. Sentence case everywhere — no uppercase, no letter-spaced labels.

| Role          | Size / weight |
| ------------- | ------------- |
| Page title    | 24 / 600      |
| Stat          | 28 / 600      |
| Section title | 16 / 600      |
| Body          | 14 / 400      |
| Small text    | 13 / 400      |
| Label         | 12 / 500, muted |

Tabular numerals wherever numbers stack in a column.

### Components

- Buttons 44px tall, 6px radius, 14/500. Primary: ink fill, white text — one per
  area. Secondary: white with a border line. Destructive: white, danger text and
  danger-tint border. Icon buttons are 44px squares, never circles.
- Top menu: 56px white header with a bottom divider; plain links, the current
  page marked by a 2px ok underline.
- Inputs 44px, 6px radius, border line, always with a visible `<label>`.
- Status tags 12/600 on the tone's tint, 4px radius.
- Dark card: only for tonight's dinner, at most once per screen.
- Photos: `object-fit: cover`, card or control radius. No photo: a fill-coloured
  tile with the dish name, never a drawing.

### Rules

- Row state = a tag or a 3px left bar in the tone, never a full background wash.
- One primary button per area; secondary for everything else.
- Never remove focus-visible — keyboard nav is a feature of this app.
- No hex values outside index.css. Ever.
- No dark mode, no animation beyond skeleton shimmer.
- Add a primitive when a screen needs it, never speculatively.
