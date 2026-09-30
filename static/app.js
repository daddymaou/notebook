/**
 * Editor: TipTap (vanilla ESM) + publish flow.
 * Converts TipTap JSON → {tag, attrs, children} node tree.
 */
import { Editor } from 'https://esm.sh/@tiptap/core@2.6.6';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.6.6';
import Underline from 'https://esm.sh/@tiptap/extension-underline@2.6.6';
import Subscript from 'https://esm.sh/@tiptap/extension-subscript@2.6.6';
import Superscript from 'https://esm.sh/@tiptap/extension-superscript@2.6.6';
import Image from 'https://esm.sh/@tiptap/extension-image@2.6.6';
import Link from 'https://esm.sh/@tiptap/extension-link@2.6.6';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@2.6.6';
import { Node, mergeAttributes } from 'https://esm.sh/@tiptap/core@2.6.6';

/* ——— Paper slip (modal) — no browser prompt/alert ——— */
function showSlip({ title, body, input, confirmLabel, cancelLabel, placeholder }) {
  return new Promise((resolve) => {
    const existing = document.querySelector('.slip-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'slip-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    if (title) backdrop.setAttribute('aria-label', title);

    const slip = document.createElement('div');
    slip.className = 'slip';

    if (title) {
      const h = document.createElement('p');
      h.className = 'slip-title';
      h.textContent = title;
      slip.appendChild(h);
    }
    if (body) {
      const p = document.createElement('p');
      p.className = 'slip-body';
      p.textContent = body;
      slip.appendChild(p);
    }

    let inputEl = null;
    if (input !== undefined) {
      inputEl = document.createElement('input');
      inputEl.className = 'slip-input';
      inputEl.type = 'text';
      inputEl.value = input || '';
      inputEl.placeholder = placeholder || '';
      inputEl.autocomplete = 'off';
      slip.appendChild(inputEl);
    }

    const actions = document.createElement('div');
    actions.className = 'slip-actions';

    const finish = (value) => {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 120);
      resolve(value);
    };

    if (cancelLabel !== false) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'slip-btn slip-btn-ghost';
      cancel.textContent = cancelLabel || 'put it back';
      cancel.addEventListener('click', () => finish(null));
      actions.appendChild(cancel);
    }

    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'slip-btn';
    ok.textContent = confirmLabel || 'done';
    ok.addEventListener('click', () => {
      finish(inputEl ? inputEl.value : true);
    });
    actions.appendChild(ok);

    slip.appendChild(actions);
    backdrop.appendChild(slip);
    document.body.appendChild(backdrop);

    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish(null);
    });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        finish(null);
      } else if (e.key === 'Enter' && inputEl && document.activeElement === inputEl) {
        e.preventDefault();
        document.removeEventListener('keydown', onKey);
        finish(inputEl.value);
      }
    };
    document.addEventListener('keydown', onKey);

    if (inputEl) {
      setTimeout(() => {
        inputEl.focus();
        inputEl.select();
      }, 50);
    } else {
      setTimeout(() => ok.focus(), 50);
    }
  });
}

function slipAlert(message) {
  return showSlip({
    title: 'ink ran',
    body: message || 'something spilled on the ink',
    confirmLabel: 'okay',
    cancelLabel: false,
  });
}

function slipPrompt(title, defaultValue, placeholder) {
  return showSlip({
    title,
    input: defaultValue || '',
    placeholder: placeholder || '',
    confirmLabel: 'ink it',
    cancelLabel: 'put it back',
  });
}

/* Custom Details / Summary */
const Details = Node.create({
  name: 'details',
  group: 'block',
  content: 'summary block*',
  defining: true,
  parseHTML() {
    return [{ tag: 'details' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes), 0];
  },
});

const Summary = Node.create({
  name: 'summary',
  group: 'block',
  content: 'inline*',
  defining: true,
  parseHTML() {
    return [{ tag: 'summary' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0];
  },
});

const Aside = Node.create({
  name: 'aside',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'aside' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes), 0];
  },
});

/* TipTap type → tag map */
const TYPE_TO_TAG = {
  paragraph: 'p',
  heading: null, // level decides
  blockquote: 'blockquote',
  codeBlock: 'pre',
  horizontalRule: 'hr',
  hardBreak: null,
  text: null,
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's', // we map strike to <s> but validation may strip; TipTap uses strike
  code: 'code',
  link: 'a',
  image: 'img',
  subscript: 'sub',
  superscript: 'sup',
  details: 'details',
  summary: 'summary',
  aside: 'aside',
  bulletList: null,
  orderedList: null,
  listItem: null,
};

/**
 * Convert TipTap doc JSON → array of {tag, attrs, children} nodes.
 */
function tiptapToNodes(doc) {
  if (!doc || !doc.content) return [];
  return doc.content.map(convertBlock).filter(Boolean);
}

function convertBlock(node) {
  if (!node) return null;
  const type = node.type;

  if (type === 'paragraph') {
    return { tag: 'p', children: convertInline(node.content) };
  }
  if (type === 'heading') {
    const level = node.attrs?.level === 4 ? 4 : 3;
    return { tag: 'h' + level, children: convertInline(node.content) };
  }
  if (type === 'blockquote') {
    const kids = (node.content || []).map(convertBlock).filter(Boolean);
    return { tag: 'blockquote', children: kids };
  }
  if (type === 'codeBlock') {
    const text = (node.content || []).map((c) => c.text || '').join('');
    return { tag: 'pre', children: [text] };
  }
  if (type === 'horizontalRule') {
    return { tag: 'hr' };
  }
  if (type === 'image') {
    const attrs = {};
    if (node.attrs?.src) attrs.src = node.attrs.src;
    if (node.attrs?.alt) attrs.alt = node.attrs.alt;
    return { tag: 'img', attrs };
  }
  if (type === 'details') {
    const kids = (node.content || []).map(convertBlock).filter(Boolean);
    return { tag: 'details', children: kids };
  }
  if (type === 'summary') {
    return { tag: 'summary', children: convertInline(node.content) };
  }
  if (type === 'aside') {
    const kids = (node.content || []).map(convertBlock).filter(Boolean);
    return { tag: 'aside', children: kids };
  }
  // lists → flatten to paragraphs
  if (type === 'bulletList' || type === 'orderedList') {
    const items = [];
    for (const item of node.content || []) {
      if (item.type === 'listItem' && item.content) {
        for (const c of item.content) {
          const b = convertBlock(c);
          if (b) items.push(b);
        }
      }
    }
    return items.length === 1 ? items[0] : null;
  }
  return null;
}

function convertInline(content) {
  if (!content || !content.length) return [];
  const out = [];
  for (const n of content) {
    if (n.type === 'text') {
      let node = n.text || '';
      const marks = n.marks || [];
      // apply marks from outside in
      for (let i = marks.length - 1; i >= 0; i--) {
        const m = marks[i];
        const wrap = markToNode(m, node);
        node = wrap;
      }
      if (typeof node === 'string') {
        out.push(node);
      } else {
        out.push(node);
      }
    } else if (n.type === 'hardBreak') {
      out.push('\n');
    } else if (n.type === 'image') {
      const attrs = {};
      if (n.attrs?.src) attrs.src = n.attrs.src;
      if (n.attrs?.alt) attrs.alt = n.attrs.alt;
      out.push({ tag: 'img', attrs });
    }
  }
  return flattenChildren(out);
}

function markToNode(mark, children) {
  const ch = Array.isArray(children) ? children : [children];
  switch (mark.type) {
    case 'bold':
      return { tag: 'strong', children: ch };
    case 'italic':
      return { tag: 'em', children: ch };
    case 'underline':
      return { tag: 'u', children: ch };
    case 'strike':
      // not in allowed set as <s>; use <em> fallback or skip
      return { tag: 'em', children: ch };
    case 'code':
      return { tag: 'code', children: ch };
    case 'link':
      return {
        tag: 'a',
        attrs: { href: mark.attrs?.href || '#' },
        children: ch,
      };
    case 'subscript':
      return { tag: 'sub', children: ch };
    case 'superscript':
      return { tag: 'sup', children: ch };
    default:
      return children;
  }
}

function flattenChildren(arr) {
  // merge adjacent strings
  const out = [];
  for (const item of arr) {
    if (typeof item === 'string' && out.length && typeof out[out.length - 1] === 'string') {
      out[out.length - 1] += item;
    } else {
      out.push(item);
    }
  }
  return out;
}

/* ——— Boot editor ——— */
const editorEl = document.getElementById('editor');
if (!editorEl) {
  console.warn('no #editor');
} else {
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  async function openLinkSlip() {
    const prev = editor.getAttributes('link').href;
    const url = await slipPrompt('where does this go?', prev || 'https://', 'https://…');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  const editor = new Editor({
    element: editorEl,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
        codeBlock: {},
        // History ships with StarterKit — Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo
        history: { depth: 100 },
      }),
      Underline,
      Subscript,
      Superscript,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Details,
      Summary,
      Aside,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
        spellcheck: 'true',
      },
      handleKeyDown(view, event) {
        const mod = isMac ? event.metaKey : event.ctrlKey;
        if (!mod) return false;

        const key = event.key.toLowerCase();

        // Undo / Redo — reinforce TipTap History (some browsers steal these)
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault();
          editor.commands.undo();
          return true;
        }
        if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault();
          editor.commands.redo();
          return true;
        }

        // Formatting
        if (key === 'b') {
          event.preventDefault();
          editor.chain().focus().toggleBold().run();
          return true;
        }
        if (key === 'i') {
          event.preventDefault();
          editor.chain().focus().toggleItalic().run();
          return true;
        }
        if (key === 'u') {
          event.preventDefault();
          editor.chain().focus().toggleUnderline().run();
          return true;
        }
        if (key === 'e') {
          event.preventDefault();
          editor.chain().focus().toggleCode().run();
          return true;
        }
        if (key === 'k') {
          event.preventDefault();
          openLinkSlip();
          return true;
        }
        if (key === 's') {
          // don't steal browser save — skip
          return false;
        }

        return false;
      },
    },
  });

  // Toolbar wiring
  function bind(id, fn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      fn();
      updateActive();
    });
  }

  bind('btn-bold', () => editor.chain().focus().toggleBold().run());
  bind('btn-italic', () => editor.chain().focus().toggleItalic().run());
  bind('btn-underline', () => editor.chain().focus().toggleUnderline().run());
  bind('btn-strike', () => editor.chain().focus().toggleStrike().run());
  bind('btn-sub', () => editor.chain().focus().toggleSubscript().run());
  bind('btn-sup', () => editor.chain().focus().toggleSuperscript().run());
  bind('btn-code', () => editor.chain().focus().toggleCode().run());
  bind('btn-h3', () => editor.chain().focus().toggleHeading({ level: 3 }).run());
  bind('btn-h4', () => editor.chain().focus().toggleHeading({ level: 4 }).run());
  bind('btn-quote', () => editor.chain().focus().toggleBlockquote().run());
  bind('btn-codeblock', () => editor.chain().focus().toggleCodeBlock().run());
  bind('btn-hr', () => editor.chain().focus().setHorizontalRule().run());
  bind('btn-aside', () => {
    editor.chain().focus().insertContent({ type: 'aside', content: [{ type: 'paragraph' }] }).run();
  });
  bind('btn-details', () => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'details',
        content: [
          { type: 'summary', content: [{ type: 'text', text: 'details' }] },
          { type: 'paragraph' },
        ],
      })
      .run();
  });

  bind('btn-link', () => openLinkSlip());

  bind('btn-image', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'upload failed');
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } catch (err) {
        await slipAlert(err.message || 'something spilled on the ink');
      }
    };
    input.click();
  });

  function updateActive() {
    const map = {
      'btn-bold': () => editor.isActive('bold'),
      'btn-italic': () => editor.isActive('italic'),
      'btn-underline': () => editor.isActive('underline'),
      'btn-strike': () => editor.isActive('strike'),
      'btn-sub': () => editor.isActive('subscript'),
      'btn-sup': () => editor.isActive('superscript'),
      'btn-code': () => editor.isActive('code'),
      'btn-h3': () => editor.isActive('heading', { level: 3 }),
      'btn-h4': () => editor.isActive('heading', { level: 4 }),
      'btn-quote': () => editor.isActive('blockquote'),
      'btn-codeblock': () => editor.isActive('codeBlock'),
      'btn-link': () => editor.isActive('link'),
    };
    for (const [id, fn] of Object.entries(map)) {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('is-active', !!fn());
    }
  }
  editor.on('selectionUpdate', updateActive);
  editor.on('transaction', updateActive);

  // Title field
  const titleInput = document.getElementById('title');

  // Publish
  const publishBtn = document.getElementById('btn-publish');
  if (publishBtn) {
    publishBtn.addEventListener('click', async () => {
      publishBtn.disabled = true;
      publishBtn.textContent = 'tearing…';
      try {
        const json = editor.getJSON();
        const nodes = tiptapToNodes(json);
        const title = (titleInput?.value || '').trim();
        const res = await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content: nodes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'could not tear off the page');
        window.location.href = data.url || '/p/' + data.slug;
      } catch (err) {
        await slipAlert(err.message || 'something spilled on the ink');
        publishBtn.disabled = false;
        publishBtn.textContent = 'Tear off this page';
      }
    });
  }

  // expose for debugging
  window.__notebookEditor = editor;
  window.__tiptapToNodes = tiptapToNodes;
}
