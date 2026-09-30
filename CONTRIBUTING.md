# contributing to notebook

Thanks for wanting to write in the margins.

## running locally

1. **Sidecar**
   ```bash
   cd sidecar
   npm install
   npx gramobase init   # generates .env — do this once
   npm start
   ```

2. **Go backend**
   ```bash
   cd go-backend
   go run .
   ```

Open http://localhost:8080. No other env vars required; sidecar URL defaults to `http://localhost:4000`.

## code style

- **Go**: `go fmt`. stdlib only. No frameworks.
- **CSS**: vanilla. Variables in `:root`. No Tailwind, no Bootstrap.
- **JS**: vanilla. TipTap via ESM CDN. No React, no bundler required for the app itself.
- Comments explain *why*, not *what*.

## adding a new node tag

Three places must agree:

1. **Editor** (`static/app.js`) — TipTap extension + `tiptapToNodes` conversion
2. **Renderer** (`static/render.js`) — add the tag to `ALLOWED`
3. **Validation** (`go-backend/content/node.go`) — add to `allowedTags`

If any one is missing, the tag will be stripped or rejected.

## pull requests

- Small and focused. One idea per PR.
- Match the paper vibe — no dashboard chrome, no gradients, no glassmorphism.
- Prefer fewer dependencies over clever abstractions.

## the vibe

Minimal. No frameworks. Paper over pixels. If it looks like Medium, start over.

## good first issues

- Add a paper texture option (heavier grain / linen)
- Add a “grid paper” theme (graph paper instead of ruled lines)
- Add an export-to-PNG button on the reader
- Add a table of contents for long pages
- Add heading anchors so you can link to a section

Write something. Tear off the page.
