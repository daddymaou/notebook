<div align="center">

#  notebook

**telegra.ph, but it feels like paper.**

Ruled lines. A red margin. Handwritten titles. Ink that dries as you publish.
No accounts, no sign-up. Pick up a page, write, tear it off, share the link.

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white&style=flat-square)
![Convex](https://img.shields.io/badge/Convex-backend-ee342f?style=flat-square)
![TipTap](https://img.shields.io/badge/TipTap-v3-1a1a1a?style=flat-square)
![Deployed on Vercel](https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel&logoColor=white&style=flat-square)

[Report a bug](https://github.com/daddymaou/notebook/issues) · [Request a feature](https://github.com/daddymaou/notebook/issues)

</div>

---

## Table of contents

- [What is this?](#what-is-this)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Routes](#routes)
- [Page format](#page-format)
- [Security model](#security-model)
- [Design system](#design-system)
- [Backend](#backend)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## What is this?

Notebook is a minimalist publishing app in the spirit of [telegra.ph](https://telegra.ph), with one big difference: it looks and feels like a real paper notebook.

There are no accounts and no profiles. You open the app, write on a ruled page, publish, and get a short link you can share with anyone. Every page you publish lands in the notebook's table of contents, newest first.

## Features

- **Paper-first design.** Ruled lines, a red margin line, handwritten titles set in Caveat, and a "drying ink" publish effect.
- **Zero friction.** No sign-up, no login. Write and publish.
- **Rich editor.** Built on TipTap v3 with a toolbar and custom `Aside`, `Details` and `Summary` nodes.
- **Image uploads.** Drop images into a page; they are stored through Convex file storage (8 MB cap).
- **Shareable short links.** Every page gets an 8-character slug at `/p/:slug`.
- **Safe by construction.** Content is sanitized on both the client and the server, and rendered without `innerHTML`.
- **"Tear out" to delete.** Pages can be removed through a confirmation step using `?edit=1`.
- **A 404 that fits the theme.** Missing pages are "torn out" of the notebook.

## Tech stack

| Layer      | Choice                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| Frontend   | Vite, TypeScript, React 19                                                      |
| Editor     | TipTap v3 (`@tiptap/*` 3.x) with custom Aside, Details and Summary nodes        |
| Backend    | Convex (`pages` table plus an `uploadImage` HTTP action)                        |
| Styling    | Plain CSS theme in `src/notebook.css`, layered over Tailwind in `src/index.css` |
| Tooling    | bun, ESLint, Prettier                                                           |
| Hosting    | Vercel                                                                          |

> **Note:** keep the Tailwind directives in `src/index.css`. The notebook theme is layered on top of them.

## Getting started

### Prerequisites

- [bun](https://bun.sh)
- A [Convex](https://convex.dev) account (the free tier is fine)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/daddymaou/notebook.git
cd notebook

# 2. Install dependencies
bun install

# 3. Connect Convex and push the backend functions
#    (also regenerates the Convex types)
bunx convex dev --once
```

### Run locally

Run the Convex dev server and the Vite dev server side by side:

```bash
# terminal 1: backend
bunx convex dev

# terminal 2: frontend
bun run dev
```

### Typecheck

```bash
bun tsc -b --noEmit
```

## Routes

| Route                | Page                                           |
| -------------------- | ---------------------------------------------- |
| `/`                  | Table of contents (newest first)               |
| `/new`               | Editor (TipTap plus toolbar)                   |
| `/p/:slug`           | Reader (sanitized node rendering)              |
| `/p/:slug?edit=1`    | Reader with a "tear out" link and delete confirmation |
| `/about`             | About the notebook                             |
| `*`                  | 404, the "torn out" page                       |

## Page format

Pages are stored as Telegraph-style JSON node trees, not HTML:

```json
[
  { "tag": "p", "children": ["hello ", { "tag": "strong", "children": ["world"] }] },
  { "tag": "img", "attrs": { "src": "https://...convex.site/..." } }
]
```

The allowed tags are whitelisted in **two places that must stay in sync**:

| File                | Role                                                      |
| ------------------- | --------------------------------------------------------- |
| `src/lib/nodes.ts`  | Client whitelist, sanitizer, and TipTap-to-tree converter |
| `src/convex/pages.ts` | Server-side sanitizer applied at publish time           |

If you add a new tag or node type, update both files.

## Security model

- The reader builds the DOM with `document.createElement` and `createTextNode` only. `innerHTML` is never used.
- URLs are restricted to `http(s)` or same-origin paths.
- The server re-sanitizes every page before inserting it, so a hand-crafted request cannot bypass the client whitelist.
- Image uploads are capped at 8 MB.
- There are no auth routes, because the app has no accounts.

## Design system

The visual language is locked. Please keep contributions inside it.

| Token            | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| `--line`         | `32px`, the ruled-line grid. Spacing snaps to multiples of 32 |
| `--paper`        | `#fdfbf5`                                                 |
| `--ink`          | `#1a1a1a`                                                 |
| Margin line      | Red, at `40px` (`28px` on mobile)                         |
| Titles           | Caveat (handwritten)                                      |
| Chrome           | Neobrutalist: square corners, 2px black borders, `--chrome-shadow` offset shadows |
| Buttons          | "Stamped" style that invert on hover                      |

## Backend

### `src/convex/pages.ts`

- `create` generates an 8-character slug with collision retry and sanitizes content before insert.
- `getBySlug` fetches a single page.
- `list` returns pages for the table of contents.
- `remove` deletes a page.

### `src/convex/http.ts`

- `POST /uploadImage` accepts multipart uploads (8 MB cap) and stores them via `ctx.storage.store`.

> **Gotcha:** `httpAction` must be imported from `./_generated/server`.

## Project structure

```
notebook/
├── public/              # static assets
├── src/
│   ├── convex/          # backend: pages.ts, http.ts
│   ├── lib/
│   │   └── nodes.ts     # whitelist, sanitizer, TipTap → tree converter
│   ├── index.css        # Tailwind foundation (keep the directives)
│   └── notebook.css     # the paper theme
├── components.json
├── convex.json
├── eslint.config.js
├── index.html
├── vercel.json
└── vite.config.ts
```

## Scripts

| Command                        | What it does                              |
| ------------------------------ | ----------------------------------------- |
| `bun install`                  | Install dependencies                      |
| `bunx convex dev --once`       | Push functions and regenerate types       |
| `bunx convex dev`              | Run the Convex dev server                 |
| `bun tsc -b --noEmit`          | Typecheck the project                     |

## Deployment

The frontend is configured for Vercel (see `vercel.json`) and the backend runs on Convex.

1. Deploy the Convex backend with `bunx convex deploy`.
2. Import the repo into Vercel.
3. Set your production Convex URL as the environment variable the frontend expects, then deploy.

## Contributing

Contributions are welcome.

1. Fork the repo and create a branch: `git checkout -b feat/your-idea`
2. Keep the design tokens intact and run Prettier and ESLint before committing.
3. If you touch the node whitelist, update **both** `src/lib/nodes.ts` and `src/convex/pages.ts`.
4. Make sure `bun tsc -b --noEmit` passes.
5. Open a pull request describing what changed and why.

<div align="center">

*Pick up a page. Write. Tear it off. Share the link.*

</div>