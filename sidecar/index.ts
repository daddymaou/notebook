/**
 * notebook sidecar — thin HTTP wrapper around gramobase.
 * Telegram is the database. This service only translates HTTP ↔ gramobase.
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { nanoid } from "nanoid";
import { createReadStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// gramobase is initialized via `npx gramobase init` which writes sidecar/.env
// We lazy-import so the process can start even before init (useful for docker healthchecks).
let gb: any = null;

async function getGb() {
  if (gb) return gb;
  const { Gramobase } = await import("gramobase");
  gb = new Gramobase();
  await gb.init();
  // Ensure collection exists
  try {
    await gb.createCollection("pages", {
      fields: ["slug", "title", "content", "createdAt"],
    });
  } catch {
    // already exists
  }
  return gb;
}

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

// POST /pages — create
app.post("/pages", async (c) => {
  try {
    const body = await c.req.json();
    const title = (body.title ?? "").toString();
    const content = body.content ?? [];
    const slug = nanoid(8);
    const createdAt = new Date().toISOString();
    const db = await getGb();
    await db.insert("pages", { slug, title, content, createdAt });
    return c.json({ slug, url: `/p/${slug}` }, 201);
  } catch (e: any) {
    console.error("create page:", e);
    return c.json({ error: e?.message ?? "create failed" }, 500);
  }
});

// GET /pages/:slug
app.get("/pages/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    const db = await getGb();
    const rows = await db.find("pages", { slug });
    if (!rows || rows.length === 0) {
      return c.json({ error: "not found" }, 404);
    }
    const row = rows[0];
    return c.json({
      slug: row.slug,
      title: row.title ?? "",
      content: row.content,
      createdAt: row.createdAt,
    });
  } catch (e: any) {
    console.error("get page:", e);
    return c.json({ error: e?.message ?? "get failed" }, 500);
  }
});

// PATCH /pages/:slug
app.patch("/pages/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    const body = await c.req.json();
    const db = await getGb();
    const rows = await db.find("pages", { slug });
    if (!rows || rows.length === 0) {
      return c.json({ error: "not found" }, 404);
    }
    const existing = rows[0];
    const updated = {
      ...existing,
      title: body.title !== undefined ? body.title : existing.title,
      content: body.content !== undefined ? body.content : existing.content,
    };
    // gramobase update by matching slug
    await db.update("pages", { slug }, updated);
    return c.json({ slug, url: `/p/${slug}` });
  } catch (e: any) {
    console.error("update page:", e);
    return c.json({ error: e?.message ?? "update failed" }, 500);
  }
});

// GET /pages — list recent
app.get("/pages", async (c) => {
  try {
    const db = await getGb();
    let rows = await db.find("pages", {});
    if (!Array.isArray(rows)) rows = [];
    // newest first
    rows.sort((a: any, b: any) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    const out = rows.slice(0, 50).map((r: any) => ({
      slug: r.slug,
      title: r.title ?? "",
      createdAt: r.createdAt,
      // omit full content on list
    }));
    return c.json(out);
  } catch (e: any) {
    console.error("list pages:", e);
    return c.json({ error: e?.message ?? "list failed" }, 500);
  }
});

// POST /upload — use gramobase uploadFile when available, else local fallback for dev
app.post("/upload", async (c) => {
  try {
    const form = await c.req.parseBody();
    const file = form["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "no file" }, 400);
    }
    const blob = file as File;
    const buf = Buffer.from(await blob.arrayBuffer());
    const name = (blob as any).name || `upload-${Date.now()}`;

    const db = await getGb();
    if (typeof db.uploadFile === "function") {
      const url = await db.uploadFile(buf, name);
      return c.json({ url });
    }

    // Dev fallback: write to /tmp and return a data-URL-ish placeholder
    // (in production gramobase returns a CDN URL)
    const dir = join(tmpdir(), "notebook-uploads");
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${Date.now()}-${name}`);
    await writeFile(path, buf);
    // Serve via a simple data approach is not ideal; return path for local testing
    // Real gramobase returns https://… CDN URL.
    return c.json({ url: `file://${path}` });
  } catch (e: any) {
    console.error("upload:", e);
    return c.json({ error: e?.message ?? "upload failed" }, 500);
  }
});

const port = Number(process.env.PORT || 4000);
console.log(`notebook sidecar on :${port}`);
serve({ fetch: app.fetch, port });
