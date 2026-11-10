<div align="center">

# 📐 Floor Plan Studio

**Plan a room, one thoughtful move at a time.**

![Vue](https://img.shields.io/badge/Vue-3-42b883?style=for-the-badge&logo=vuedotjs&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=ffffff)
![License](https://img.shields.io/badge/License-MIT-777777?style=for-the-badge)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

_Vue room planner with snapped furniture dragging, keyboard nudges, overlap checks, and portable SVG/JSON plans._

</div>

---

## ✨ Highlights

- **Considered spaces:** Sketch a rectangular room on a 25 cm grid and place up to 30 desks, sofas, tables, shelves, or plants.
- **Move with confidence:** Drag with pointer capture, nudge with arrow keys, rotate a quarter turn, or edit exact cell coordinates.
- **Valid plans:** Keep furniture inside the room and avoid overlaps. Touching edges are allowed; invalid edits preserve the previous plan.
- **A personal palette:** Name pieces, choose clay/moss/slate tones, and lock positions and sizes.
- **Portable room notes:** Download a self-contained SVG drawing or editable JSON with validated provenance.
- **Local workspace:** Restore validated drafts, import detached data, and confirm removal or sample restoration.
- **Project identity:** Original FP favicon/social artwork, locally bundled fonts, and CodeSculptor attribution.

## 🧱 Project Structure

```text
public/
├── favicon.svg                         # Original project emblem
├── og.svg                              # Original social artwork
├── font-licenses.txt                   # Font copyright and OFL licenses
└── sample-workspace.json               # Complete importable sample
src/
├── components/
│   ├── FloorCanvas.vue
│   ├── AppDialog.vue                   # Native modal via Teleport
│   ├── AppIcon.vue                     # Original inline SVG icons
│   ├── DataExchange.vue                # JSON import dialog
│   └── StudioHeader.vue                # Workspace branding and actions
├── domain/
│   ├── plan.ts                        # Validation, operations, and exports
│   └── validation.ts                   # Strict unknown-input guards
├── directives/planDrag.ts               # Typed gesture directive
├── services/
│   ├── draft.ts                        # Validated local drafts
│   └── files.ts                        # Downloads and deterministic stamps
├── App.vue                             # Workspace and detached editor state
├── base.css                            # Tailwind, fonts, and control defaults
├── style.css                           # Project theme tokens
└── main.ts                             # Vue application entry
tests/
├── *.test.ts                           # Native domain/export checks
└── e2e/                                # Production browser workflows
```

Project-root files include Vite/TypeScript/Playwright configuration, an explicit `vercel.json`, Prettier settings, a reproducible npm lockfile, and the MIT license. Default scaffold logos and their empty `src/assets` folder are removed.

## 🛠 Tech Stack

| Tool                          | Role                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| Vue 3.5                       | Typed SFCs, reactive state, component models, and lifecycle management           |
| TypeScript 6                  | Strict domain types and checked component contracts                              |
| Vite 8                        | Development server and static production bundle                                  |
| Tailwind CSS 4                | Vite integration, theme tokens, template utilities, and responsive/state styling |
| DM Sans + Bricolage Grotesque | Locally bundled Latin variable fonts from Fontsource                             |
| Node.js 24+                   | Native TypeScript domain tests and local build tools                             |
| Playwright                    | Chromium checks against the production build                                     |

No runtime API service, account, or additional UI library is required. Dependencies and CLI tools are installed locally in this project.

## 🎨 Tailwind Styling

`vite.config.ts` enables the official Tailwind Vite plugin. `src/base.css` imports Tailwind, defines font tokens, and uses `@apply` for small native control defaults. `src/style.css` defines project colors through `@theme`.

Application templates use complete Tailwind utilities for layout, spacing, typography, borders, colors, responsive behavior, focus, and state styling. Explicit `data-ui`, `data-project`, and domain identity attributes are browser hooks, not substitutes for missing custom CSS. Fixed preview/list containers keep neighboring panels stable when selection or filtering changes. Reduced-motion preferences shorten CSS transitions.

Both font files are bundled into hashed local assets; copyright and SIL Open Font License text are in [font-licenses.txt](./public/font-licenses.txt). SVG artwork and interface icons are original project assets. Furniture coordinates, dimensions, fitted room geometry, and edited artwork colors use inline styles because these values belong to the room document.

## 📦 Included Demo Data

The original **A small creative studio** plan contains five pieces in a 600 × 450 cm room: a window desk, reading sofa, project table, locked materials shelf, and corner plant. It uses all three material tones and includes stable piece identities.

The complete [sample-workspace.json](./public/sample-workspace.json) is a valid import document with provenance. It is also available from the workspace information dialog. The domain module contains the same canonical sample for first use and confirmed restoration.

## 🚀 Local Development

Use Node.js **24 or later**:

```bash
npm ci
npm run dev
```

Vite prints the local URL and binds to `0.0.0.0` for the shared development container. To inspect the production bundle:

```bash
npm run build
npm run preview
```

This project uses the workspace’s generic development container and has no project-specific global installation requirements.

## 🧩 Vue Implementation

[Vue custom directives](https://vuejs.org/guide/reusability/custom-directives.html) isolate the low-level pointer interaction in `src/directives/planDrag.ts`. `updated` replaces the binding used by listeners instead of retaining callbacks from the initial render. A gesture captures its original coordinates and cell size; reactive updates show a ghost position without writing the persisted plan. Pointer release requests a validated commit, while Escape, pointer cancellation, lost capture, and unmount cancel the gesture.

`FloorCanvas.vue` observes its reserved viewport and derives a fitted room size. The observer disconnects when its scope ends. Keyed native buttons preserve furniture identities and expose complete accessible labels; arrow keys provide an alternative to dragging. The room inspector and piece inspector use detached form values. Domain operations clone and validate before replacing the workspace, so a failed rotation, move, resize, or import never partially changes the room.

Locked pieces remain selectable. Their position/size inputs, keyboard movement, dragging, and rotation are disabled until unlocked. Changing material or label is still possible. New pieces use a deterministic row-by-row free-space search and stop at the collection limit.

The shared dialog uses `Teleport`, a unique `useId` heading, and a post-flush watcher to synchronize Vue state with native `showModal`/`close`. It keeps native Escape/focus behavior and guards against a queued close event resetting a dialog that has already reopened.

## 💾 Local Drafts & Data Exchange

The validated workspace is stored under `vue-floor-plan-studio:v1`. Selection, view/filter settings, pending forms, dialog text, and interaction logs are session-only. Initial or restored data is validated before use. Malformed storage falls back to the sample without immediately overwriting the damaged entry; the next valid workspace change creates a save.

Every workspace change is validated before persistence. Storage access failures leave the in-memory editor and downloads usable and show a status message. Import parses a detached candidate and replaces the current workspace only after complete validation; a failed import leaves the workspace and saved draft intact. JSON text is limited to **120,000 characters**. Known fields are reconstructed into a canonical object; extra fields and supplied provenance are not trusted or carried into the editable domain.

| Field                    | Accepted values                                                          |
| ------------------------ | ------------------------------------------------------------------------ |
| `version`                | `1`                                                                      |
| `name`                   | Nonblank string, at most 80 characters                                   |
| `width`, `height`        | Integers from 12 to 40 grid cells                                        |
| `items`                  | At most 30 furniture objects; empty rooms are allowed                    |
| Piece identity and label | Unique safe ID up to 40 characters; nonblank label up to 45              |
| Piece dimensions         | Integer width/depth from 1 to 12 cells                                   |
| Piece position           | Nonnegative integer coordinates, with the complete piece inside the room |
| Piece appearance/state   | Listed kind and tone; actual boolean `locked`                            |

Overlapping pieces, duplicate IDs, incorrect primitive types, and arrays masquerading as enum strings are rejected. One cell is always 25 cm; dimensions are not arbitrary physical units.

SVG contains the complete room, escaped labels, grid, dimensions, and FP metadata. Text is fitted to its available drawing width, including maximum-length room names and labels on narrow furniture. It has no external images, stylesheets, or fonts; it uses the viewer’s system sans-serif font. The editable JSON contains all furniture, including locked pieces.

Downloaded files use short-lived Blob URLs that are revoked after download. Sample restoration and destructive removal require native modal confirmation.

## ◈ Project Markers

- `FP` is present in the wordmark, original favicon, metadata, and workspace identity.
- `FP-XXXXXXXX` is a deterministic 32-bit content stamp calculated from the canonical validated payload, without import provenance.
- JSON provenance includes the project slug, `CodeSculptor`, and the marker; downloadable output includes the appropriate marker in its filename and/or content.
- Markers identify configurations and help recognize artifacts. They are not cryptographic signatures or tamper-proof authorship claims.
- Author metadata and the MIT license retain CodeSculptor attribution.

## 🧭 Extension Notes & Nuances

- This is a top-view layout sketch. It does not model doors, windows, clearance regulations, furniture height, or construction tolerances.
- Occupied area is the sum of validated nonoverlapping furniture footprints. The room’s area uses the fixed 25 cm grid.
- Rotating swaps width and depth; collision validation can reject the result.
- Selection and pending inspector edits are session state. The validated plan is the only persisted data.
- Extend furniture kinds in the domain, initial sizes, and display/export code together. The SVG is intentionally independent of the workshop’s Tailwind CSS.

The interface and documents are English. At 320 px the editor stacks vertically; larger screens keep the workspace columns in a shared grid. Native controls, explicit accessible labels, visible focus styling, and a single main landmark remain available across layouts.

## ✅ Build & Checks

```bash
npm run build
npm run format:check
npm test
npx playwright install chromium
npm run test:e2e
```

`build` runs `vue-tsc` before Vite. Domain tests use Node’s native runner; browser tests launch the built application with the local preview command and do not reuse another server. Build before running browser tests so they inspect current output. `npm run format` formats maintained source files; dependencies, output, lockfiles, and browser artifacts are excluded.

Domain tests cover sample/provenance round-trips, free-space placement, touching/overlapping bounds, atomic failures, strict import types, limits, and escaped standalone SVG. Production browser checks cover actual pointer dragging and Escape cancellation, keyboard movement, rotation/locking, deletion, SVG parsing, failed room resizes, and stable canvas geometry.

Shared browser workflows cover valid and failed imports, reload persistence, JSON downloads, blocked/corrupt storage, confirmed sample restoration, dialog reopening/Escape/focus, actual Tailwind grid behavior, named visible controls, and overflow checks from 320 to 1440 px. These checks validate the local production application; they do not represent a deployed Vercel smoke test.

## ▲ Vercel Deployment

1. Import the repository and select this project folder as the Root Directory if using the shared workspace.
2. Use the committed `vercel.json`: `npm ci`, `npm run build`, and output directory `dist`.
3. Confirm the root page and public sample/artwork after deployment.

The explicit configuration rewrites only `/` to `/index.html` and permanently redirects `/index.html` to `/`. There are no client-side routes requiring a catch-all rewrite; missing resources remain missing. All responses include `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. Public files and HTML revalidate; Vite’s hashed JS/CSS/font files under `/assets/` receive one-year immutable caching. The development command accepts Vercel’s `$PORT` with `--strictPort`.

Routing, used configuration fields, and cache rules are checked against the official configuration schema and generated files locally. Vite preview serves the production bundle but does not emulate Vercel response headers. The included SVG social artwork is an editable source; platforms requiring raster cards need a rendered image and an absolute deployed image URL.

## 📄 License

[MIT](./LICENSE) · Copyright (c) 2026 **CodeSculptor**. Bundled fonts retain their separate OFL licenses.
