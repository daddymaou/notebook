# notebook

A telegra.ph-style publishing app that looks like a paper notebook — ruled paper,
red margin line, handwritten titles (Caveat), ink that "dries" as you publish.
No accounts: pick up a page, write, tear it off, share the link.

## Stack

- Vite + TypeScript + React 19 (package manager: bun)
- TipTap v3 editor (`@tiptap/*` 3.x) with custom Aside/Details/Summary nodes
- Convex for backend & storage (pages table + `uploadImage` HTTP action)
- Plain CSS theme in `src/notebook.css` layered over the Tailwind foundation in
  `src/index.css` (do not remove the Tailwind directives)

## Routes

| Route     | Page                              |
| --------- | --------------------------------- |
| `/`       | Table of contents (newest first)  |
| `/new`    | Editor (TipTap + toolbar)         |
| `/p/:slug`| Reader (sanitized node rendering) |
| `/about`  | About the notebook                |
| `*`       | 404 — "torn out" page             |

`/p/:slug?edit=1` shows a "tear out" link that opens a delete confirmation.

## Page format

Pages are stored as Telegraph-style JSON node trees:

```json
[
  { "tag": "p", "children": ["hello ", { "tag": "strong", "children": ["world"] }] },
  { "tag": "img", "attrs": { "src": "https://...convex.site/..." } }
]
```

Allowed tags are whitelisted in two places that must stay in sync:

- `src/lib/nodes.ts` — client whitelist, sanitizer, and TipTap→tree converter
- `src/convex/pages.ts` — server-side sanitizer applied at publish time

Rendering uses `document.createElement` / `createTextNode` only (never
`innerHTML`), and URLs are restricted to `http(s)` or same-origin paths.

## Design tokens (locked)

- `--line: 32px` — the ruled-line grid; spacing snaps to multiples of 32
- `--paper: #fdfbf5`, `--ink: #1a1a1a`, red margin line at 40px (28px mobile)
- Neobrutalist chrome: square corners, 2px black borders, `--chrome-shadow`
  offset shadows, "stamped" buttons that invert on hover

## Backend

- `src/convex/pages.ts` — create (8-char slug with collision retry), getBySlug,
  list, remove; server sanitizes content before insert
- `src/convex/http.ts` — `POST /uploadImage` (multipart, 8MB cap, stored via
  `ctx.storage.store`). Note: `httpAction` must be imported from
  `./_generated/server`. No auth routes — the app has no accounts.

## Development

```bash
bun install
bunx convex dev --once   # regenerate Convex types / push functions
bun tsc -b --noEmit      # typecheck
```
