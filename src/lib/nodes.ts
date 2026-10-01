/**
 * Telegraph-style node trees: strings and/or {tag, attrs, children}.
 * Supported tags are whitelisted; everything else is rejected.
 */

export type PageNode =
  | string
  | {
      tag: string;
      attrs?: Record<string, string>;
      children?: PageNode[];
    };

export const INLINE_TAGS = [
  "u", "ins", "sub", "sup", "a", "strong", "em", "code", "mark", "s",
] as const;

export const BLOCK_TAGS = [
  "p", "h3", "h4", "blockquote", "aside", "figure", "figcaption", "cite", "hr", "pre",
] as const;

export const MEDIA_TAGS = ["img", "video"] as const;
export const STRUCT_TAGS = ["details", "summary"] as const;

export const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  ...INLINE_TAGS,
  ...BLOCK_TAGS,
  ...MEDIA_TAGS,
  ...STRUCT_TAGS,
]);

const VOID_TAGS = new Set(["hr", "img", "video"]);

const SAFE_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(["href"]),
  img: new Set(["src", "alt"]),
  video: new Set(["src"]),
};

export function isSafeUrl(value: string): boolean {
  if (value.startsWith("/")) return true; // local uploads
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Deep-clone with sanitization (client mirror of the server-side whitelist). */
export function sanitizeNode(node: unknown): PageNode | null {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return null;
  const n = node as { tag?: unknown; attrs?: unknown; children?: unknown };
  if (typeof n.tag !== "string" || !ALLOWED_TAGS.has(n.tag)) return null;
  const tag = n.tag;
  const attrs: Record<string, string> = {};
  if (n.attrs && typeof n.attrs === "object") {
    for (const [k, val] of Object.entries(n.attrs as Record<string, unknown>)) {
      if (typeof val !== "string") continue;
      if (!SAFE_ATTRS[tag]?.has(k)) continue;
      if ((k === "href" || k === "src") && !isSafeUrl(val)) continue;
      attrs[k] = val;
    }
  }
  let children: PageNode[] | undefined;
  if (Array.isArray(n.children)) {
    children = n.children
      .map(sanitizeNode)
      .filter((c): c is PageNode => c !== null);
  }
  const hasChildren = Array.isArray(children) && children.length > 0;
  if (VOID_TAGS.has(tag)) {
    return { tag, ...(Object.keys(attrs).length ? { attrs } : {}) };
  }
  if (!hasChildren) return null;
  return {
    tag,
    ...(Object.keys(attrs).length ? { attrs } : {}),
    children,
  };
}

/** Sanitize an array of top-level nodes. */
export function sanitizeTree(nodes: unknown): PageNode[] {
  if (!Array.isArray(nodes)) {
    const one = sanitizeNode(nodes);
    return one ? [one] : [];
  }
  return nodes.map(sanitizeNode).filter((c): c is PageNode => c !== null);
}

// ---------- TipTap JSON → node tree ----------

const TIPTAP_MARK_MAP: Record<string, string> = {
  bold: "strong",
  italic: "em",
  strike: "s",
  code: "code",
  underline: "u",
  subscript: "sub",
  superscript: "sup",
  link: "a",
  highlight: "mark",
};

function marksToNodes(
  text: string,
  marks: Array<{ type: string; attrs?: Record<string, unknown> }> | undefined,
): PageNode {
  if (!marks || marks.length === 0) return text;
  const [first, ...rest] = marks;
  const tag = TIPTAP_MARK_MAP[first.type];
  if (!tag) return marksToNodes(text, rest);
  const attrs: Record<string, string> = {};
  if (tag === "a") {
    const href = first.attrs?.href;
    if (typeof href === "string") attrs.href = href;
    if (!attrs.href || !isSafeUrl(attrs.href)) return marksToNodes(text, rest);
  }
  const inner = marksToNodes(text, rest);
  return { tag, ...(Object.keys(attrs).length ? { attrs } : {}), children: [inner] };
}

/** Convert TipTap getJSON() output to the telegraph node tree. */
export function tiptapToJson(doc: unknown): PageNode[] {
  const out: PageNode[] = [];
  const content =
    doc && typeof doc === "object" && Array.isArray((doc as { content?: unknown }).content)
      ? ((doc as { content: unknown[] }).content as TipTapNode[])
      : [];
  for (const block of content) {
    convertBlock(block, out);
  }
  return out;
}

type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

function inlineContent(node: TipTapNode | undefined, marks: TipTapNode["marks"] = []): PageNode[] {
  if (!node) return [];
  if (node.type === "text") {
    return [marksToNodes(node.text ?? "", marks)];
  }
  if (node.type === "hardBreak") return [" "];
  if (Array.isArray(node.content)) {
    const out: PageNode[] = [];
    for (const child of node.content) {
      out.push(
        ...inlineContent(child, child.marks ? [...marks, ...child.marks] : marks),
      );
    }
    return out;
  }
  return [];
}

function convertBlock(node: TipTapNode, out: PageNode[]): void {
  switch (node.type) {
    case "paragraph": {
      out.push({ tag: "p", children: inlineContent(node) });
      return;
    }
    case "heading": {
      const level = node.attrs?.level;
      out.push({ tag: level === 4 ? "h4" : "h3", children: inlineContent(node) });
      return;
    }
    case "blockquote": {
      out.push({
        tag: "blockquote",
        children: collectBlocks(node),
      });
      return;
    }
    case "aside": {
      out.push({
        tag: "aside",
        children: inlineContent(node),
      });
      return;
    }
    case "details": {
      const kids = collectBlocks(node);
      out.push({ tag: "details", children: kids.length ? kids : [{ tag: "summary", children: [""] }] });
      return;
    }
    case "summary": {
      out.push({ tag: "summary", children: inlineContent(node) });
      return;
    }
    case "codeBlock": {
      const text = node.content?.map((c) => c.text ?? "").join("\n") ?? "";
      out.push({ tag: "pre", children: [text] });
      return;
    }
    case "horizontalRule":
      out.push({ tag: "hr", children: [""] });
      return;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      if (!src) return;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : undefined;
      out.push({ tag: "img", ...(alt ? { attrs: { src, alt } } : { attrs: { src } }) });
      return;
    }
    default:
      // bulletList/orderedList etc. are flattened to paragraphs
      if (Array.isArray(node.content)) {
        for (const child of (node.content as TipTapNode[])) convertBlock(child, out);
      }
  }
}

function collectBlocks(node: TipTapNode): PageNode[] {
  const out: PageNode[] = [];
  if (Array.isArray(node.content)) {
    for (const child of node.content as TipTapNode[]) convertBlock(child, out);
  }
  return out;
}

// ---------- extraction helpers ----------

export function nodeText(node: PageNode): string {
  if (typeof node === "string") return node;
  return (node.children ?? []).map(nodeText).join("");
}

export function plainText(nodes: PageNode[]): string {
  return nodes.map(nodeText).join(" ").replace(/\s+/g, " ").trim();
}

export function firstImage(nodes: PageNode[]): string | null {
  for (const node of nodes) {
    if (typeof node === "string") continue;
    if (node.tag === "img" && node.attrs?.src) return node.attrs.src;
    if (node.children) {
      const found = firstImage(node.children);
      if (found) return found;
    }
  }
  return null;
}

export function firstLine(nodes: PageNode[]): string {
  for (const node of nodes) {
    if (typeof node === "string") {
      const t = node.trim();
      if (t) return t;
      continue;
    }
    const t = nodeText(node).trim();
    if (t) return t;
  }
  return "";
}
