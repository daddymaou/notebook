import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/** Telegraph-style node tree: strings and/or {tag, attrs, children} nodes. */
export type PageNode =
  | string
  | { tag: string; attrs?: Record<string, string>; children?: PageNode[] };

const SLUG_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const randomByte = () => {
  const a = new Uint8Array(1);
  crypto.getRandomValues(a);
  return a[0];
};

function makeSlug(len = 8): string {
  let s = "p";
  for (let i = 0; i < len - 1; i++) s += SLUG_ALPHABET[randomByte() % SLUG_ALPHABET.length];
  return s;
}

/** Whitelist of supported tags — everything else is rejected. */
const ALLOWED_TAGS = new Set([
  "u", "ins", "s", "sub", "sup", "a", "strong", "em", "code", "mark",
  "p", "h3", "h4", "blockquote", "aside", "figure", "figcaption", "cite", "hr", "pre",
  "img", "video", "details", "summary",
]);

const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
  img: new Set(["src", "alt"]),
  video: new Set(["src"]),
};

function safeUrl(value: string): boolean {
  if (value.startsWith("/")) return true; // local uploads
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
    } catch {
    return false;
  }
}

function sanitize(node: unknown): PageNode | null {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return null;
  const n = node as { tag?: unknown; attrs?: unknown; children?: unknown };
  if (typeof n.tag !== "string" || !ALLOWED_TAGS.has(n.tag)) return null;
  const tag = n.tag;
  const attrs: Record<string, string> = {};
  if (n.attrs && typeof n.attrs === "object") {
    for (const [k, val] of Object.entries(n.attrs as Record<string, unknown>)) {
      if (typeof val !== "string" || !SAFE_ATTRS[tag]?.has(k)) continue;
      if ((k === "href" || k === "src") && !safeUrl(val)) continue;
      attrs[k] = val;
    }
  }
  let children: PageNode[] | undefined;
  if (Array.isArray(n.children)) {
    children = n.children.map(sanitize).filter((c): c is PageNode => c !== null);
  }
  return {
    tag,
    ...(Object.keys(attrs).length ? { attrs } : {}),
    ...(children && children.length ? { children } : {}),
  };
}

/** Publish a new page. Returns the slug of the created page. */
export const create = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.any(),
  },
  handler: async (ctx, { title, content }) => {
    const cleanTitle = typeof title === "string" ? title.trim().slice(0, 120) : "";
    const safe: PageNode[] | PageNode | null =
      content == null
        ? null
        : Array.isArray(content)
          ? content.map(sanitize).filter((c): c is PageNode => c !== null)
          : sanitize(content);
    const isEmptyContent =
      safe === null ||
      safe === "" ||
      (Array.isArray(safe) && safe.length === 0);
    if (!cleanTitle && isEmptyContent) throw new Error("write something first");

    // try a few times to find an unused slug (8 chars, unguessable)
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = makeSlug();
      const existing: Doc<"pages"> | null = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (existing) continue;
      const now = Date.now();
      await ctx.db.insert("pages", {
        slug,
        title: cleanTitle || undefined,
        content: safe ?? "",
        createdAt: now,
        updatedAt: now,
      });
      return slug;
    }
    throw new Error("the page wouldn't tear off. try again.");
  },
});

/** Fetch a page by slug (readable by anyone with the link). */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/** Table of contents: newest first. */
export const list = query({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("pages")
      .withIndex("by_creation", (q) => q.gte("createdAt", 0))
      .order("desc")
      .collect(),
});

/** Delete a page (anyone with the link; v1 has no auth). */
export const remove = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const page: Doc<"pages"> | null = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!page) throw new Error("this page seems to have been torn out");
    await ctx.db.delete(page._id as Id<"pages">);
  },
});
