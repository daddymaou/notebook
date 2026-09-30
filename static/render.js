/**
 * XSS-safe node-tree → DOM renderer.
 * Never uses innerHTML with user content.
 */
(function (global) {
  const ALLOWED = new Set([
    'u', 'ins', 'sub', 'sup', 'a', 'strong', 'em', 'code', 'mark',
    'p', 'h3', 'h4', 'blockquote', 'aside', 'figure', 'figcaption',
    'cite', 'hr', 'pre', 'img', 'video', 'details', 'summary',
  ]);

  const VOID = new Set(['hr', 'img']);

  function renderNodes(container, nodes) {
    container.textContent = '';
    if (!Array.isArray(nodes)) return;
    const frag = document.createDocumentFragment();
    for (const n of nodes) {
      const el = renderNode(n);
      if (el) frag.appendChild(el);
    }
    container.appendChild(frag);
  }

  function renderNode(n) {
    if (n == null) return null;
    if (typeof n === 'string') {
      return document.createTextNode(n);
    }
    if (typeof n !== 'object') return null;

    const tag = (n.tag || '').toLowerCase();
    if (!tag || !ALLOWED.has(tag)) {
      // unknown tag — still render children as text/elements
      if (Array.isArray(n.children)) {
        const frag = document.createDocumentFragment();
        for (const c of n.children) {
          const el = renderNode(c);
          if (el) frag.appendChild(el);
        }
        return frag.childNodes.length ? frag : null;
      }
      return null;
    }

    const el = document.createElement(tag);

    if (n.attrs && typeof n.attrs === 'object') {
      for (const [k, v] of Object.entries(n.attrs)) {
        if (v == null) continue;
        const key = k.toLowerCase();
        // only safe attributes
        if (key === 'href' && tag === 'a') {
          const href = String(v);
          if (href.startsWith('javascript:')) continue;
          el.setAttribute('href', href);
          el.setAttribute('rel', 'noopener noreferrer');
          if (!href.startsWith('/') && !href.startsWith('#')) {
            el.setAttribute('target', '_blank');
          }
        } else if (key === 'src' && (tag === 'img' || tag === 'video')) {
          el.setAttribute('src', String(v));
        } else if (key === 'alt' && tag === 'img') {
          el.setAttribute('alt', String(v));
        } else if (key === 'title') {
          el.setAttribute('title', String(v));
        } else if (key === 'class') {
          // only allow a small set of classes if needed
          el.setAttribute('class', String(v).replace(/[^a-z0-9\s_-]/gi, ''));
        }
      }
    }

    if (VOID.has(tag)) return el;

    if (Array.isArray(n.children)) {
      for (const c of n.children) {
        const child = renderNode(c);
        if (child) el.appendChild(child);
      }
    }
    return el;
  }

  global.renderNodes = renderNodes;
})(typeof window !== 'undefined' ? window : globalThis);
