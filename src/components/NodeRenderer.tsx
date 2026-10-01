import { useEffect, useRef } from "react";
import type { PageNode } from "@/lib/nodes";

function renderNode(node: PageNode): Node {
  if (typeof node === "string") return document.createTextNode(node);

  const { tag, attrs, children } = node;

  let el: HTMLElement;
  switch (tag) {
    case "a": {
      const a = document.createElement("a");
      if (attrs?.href) a.setAttribute("href", attrs.href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      el = a;
      break;
    }
    case "img": {
      const img = document.createElement("img");
      if (attrs?.src) img.setAttribute("src", attrs.src);
      if (attrs?.alt) img.setAttribute("alt", attrs.alt);
      img.setAttribute("loading", "lazy");
      return img;
    }
    case "video": {
      const v = document.createElement("video");
      if (attrs?.src) v.setAttribute("src", attrs.src);
      v.setAttribute("controls", "");
      return v;
    }
    case "hr":
      return document.createElement("hr");
    default:
      el = document.createElement(tag);
  }

  if (children) {
    for (const child of children) {
      el.appendChild(renderNode(child));
    }
  }
  return el;
}

/**
 * Renders a telegraph node tree. Uses document.createElement and
 * document.createTextNode only — never innerHTML — so stored content
 * cannot inject markup or scripts. The DOM is rebuilt in an effect
 * (not a memoized fragment), because appending a DocumentFragment
 * moves its children out, which would blank the page on re-render.
 */
export function NodeRenderer({ nodes }: { nodes: PageNode[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = ref.current;
    if (!div) return;
    const frag = document.createDocumentFragment();
    for (const node of nodes) {
      frag.appendChild(renderNode(node));
    }
    div.replaceChildren(frag);
  }, [nodes]);

  return <div className="content" ref={ref} />;
}
