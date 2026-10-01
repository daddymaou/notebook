import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extensions";
import { Aside, Details, Summary } from "@/lib/tiptap-nodes";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Desk, Paper } from "@/components/Paper";
import { Modal } from "@/components/Modal";
import { tiptapToJson } from "@/lib/nodes";
import { showToast } from "@/lib/toast";

const DRAFT_KEY = "notebook_draft";

/** Convex deployments expose http actions on the .convex.site domain. */
function uploadEndpoint(): string {
  const cloud = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!cloud) return "/uploadImage";
  return `${cloud.replace(".convex.cloud", ".convex.site")}/uploadImage`;
}

type Draft = { title: string; json: unknown };

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`tool-btn ${active ? "active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const Icons = {
  bold: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square"><path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z" /></svg>,
  italic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><line x1="14" y1="4" x2="9" y2="20" /><line x1="18" y1="4" x2="13" y2="20" /></svg>,
  underline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><path d="M7 4v7a5 5 0 0 0 10 0V4" /><line x1="5" y1="21" x2="19" y2="21" /></svg>,
  strike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><line x1="4" y1="12" x2="20" y2="12" /><path d="M16 6c-1-1.6-2.4-2-4-2-2.4 0-4 1.2-4 3 0 1.6 1 2.4 3 3M8 18c1 1.6 2.6 2 4.4 2 2.4 0 4.2-1.2 4.2-3 0-.9-.4-1.7-1.2-2.3" /></svg>,
  sub: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><text x="4" y="14" fontSize="16" fill="currentColor" stroke="none" fontFamily="serif">A</text><text x="13" y="21" fontSize="11" fill="currentColor" stroke="none" fontFamily="serif">2</text></svg>,
  sup: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><text x="4" y="20" fontSize="16" fill="currentColor" stroke="none" fontFamily="serif">A</text><text x="13" y="9" fontSize="11" fill="currentColor" stroke="none" fontFamily="serif">2</text></svg>,
  code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><polyline points="8 6 3 12 8 18" /><polyline points="16 6 21 12 16 18" /></svg>,
  mark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><path d="M4 20h16" /><path d="M6 15l7.5-9.5L18 9.2 10.5 18.7H6z" /></svg>,
  h3: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><text x="3" y="18" fontSize="15" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="serif">H3</text></svg>,
  h4: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><text x="3" y="18" fontSize="15" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="serif">H4</text></svg>,
  quote: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><path d="M6 17c2 0 3-1.6 3-4V7H5v6h3" /><path d="M15 17c2 0 3-1.6 3-4V7h-4v6h3" /></svg>,
  aside: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><line x1="6" y1="4" x2="6" y2="20" /><line x1="10" y1="8" x2="19" y2="8" /><line x1="10" y1="12" x2="19" y2="12" /><line x1="10" y1="16" x2="16" y2="16" /></svg>,
  pre: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="3" y="5" width="18" height="14" rx="1" /><polyline points="8 10 6 12 8 14" /><polyline points="16 10 18 12 16 14" /></svg>,
  hr: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><line x1="3" y1="12" x2="21" y2="12" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><path d="M10 14a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><rect x="3" y="4" width="18" height="16" rx="1" /><circle cx="9" cy="10" r="1.6" /><path d="M4 18l5-5 4 4 3-3 4 4" /></svg>,
  details: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square"><polyline points="8 9 12 13 16 9" /><line x1="4" y1="17" x2="20" y2="17" /></svg>,
};

function SelectionLinkModal({
  onClose,
  onAdd,
  initialText,
}: {
  onClose: () => void;
  onAdd: (text: string, url: string) => void;
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlRef.current?.focus();
  }, []);

  const submit = () => {
    if (!/^https?:\/\//.test(url)) {
      setError("urls should start with https://");
      return;
    }
    onAdd(text, url);
  };

  return (
    <Modal title="add a link" onClose={onClose}>
      <div className="modal-field">
        <label className="modal-label">text</label>
        <input
          className="modal-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="the words you want to link"
        />
      </div>
      <div className="modal-field">
        <label className="modal-label">url</label>
        <input
          ref={urlRef}
          className="modal-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="https://example.com"
        />
      </div>
      {error && <p className="inline-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="text-btn" onClick={onClose}>
          cancel
        </button>
        <button type="button" className="stamp" onClick={submit}>
          add link
        </button>
      </div>
    </Modal>
  );
}

export default function Editor() {
  const navigate = useNavigate();
  const createPage = useMutation(api.pages.create);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
        // lists are not part of the telegraph whitelist; flatten to paragraphs
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        defaultProtocol: "https",
        autolink: false,
      }),
      Image.configure({ inline: false }),
      Aside,
      Details,
      Summary,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
  });

  // restore draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && (draft.title || draft.json)) {
      setTitle(typeof draft.title === "string" ? draft.title : "");
      if (draft.json && editor) {
        editor.commands.setContent(draft.json as never, { emitUpdate: false });
      }
      setRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // autosave every 3s
  useEffect(() => {
    const t = setInterval(() => {
      if (!editor) return;
      const json = editor.getJSON();
      const hasBody = JSON.stringify(json).length > 22; // more than empty doc
      if (title.trim() || hasBody) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, json }));
      }
    }, 3000);
    return () => clearInterval(t);
  }, [editor, title]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setRestored(false);
  }, []);

  const doPublish = useCallback(async () => {
    if (!editor) return;
    try {
      const nodes = tiptapToJson(editor.getJSON());
      const slug = await createPage({ title: title.trim(), content: nodes });
      if (!slug) throw new Error("no slug");
      clearDraft();
      setError(null);
      navigate(`/p/${slug}`);
    } catch {
      showToast("publish");
      setError("something spilled on the ink. try again.");
    }
  }, [editor, title, createPage, clearDraft, navigate]);

  const publish = useCallback(() => {
    if (!editor) return;
    const doc = editor.state.doc;
    const plain = doc.textBetween(0, doc.content.size, " ", " ").trim();
    const t = title.trim();
    if (!t && !plain) {
      setError("write something first");
      return;
    }
    if (t && !plain) {
      setConfirmEmpty(true);
      return;
    }
    void doPublish();
  }, [editor, title, doPublish]);

  // keyboard shortcuts: ⌘K opens the link modal, ⌘↵ publishes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLinkModalOpen(true);
      } else if (e.key === "Enter") {
        e.preventDefault();
        publish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [publish]);

  const handleDiscard = () => {
    clearDraft();
    setTitle("");
    editor?.commands.clearContent(true);
    navigate("/");
  };

  const handleLinkAdd = (text: string, url: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: text || url,
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
    }
    setLinkModalOpen(false);
  };

  const handleImagePick = () => fileRef.current?.click();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(uploadEndpoint(), { method: "POST", body: form });
      if (!res.ok) throw new Error("upload failed");
      const { url } = (await res.json()) as { url: string };
      editor?.chain().focus().setImage({ src: url }).run();
    } catch {
      showToast("upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!editor) {
    return (
      <Desk>
        <Paper variant="editor">
          <div className="editor-body" />
        </Paper>
      </Desk>
    );
  }

  return (
    <Desk>
      <Paper variant="editor">
        {uploading && (
          <div className="upload-overlay">
            <div className="ink-pulse" />
            <span>uploading…</span>
          </div>
        )}

        {restored && (
          <p className="draft-note">
            restored from draft —{" "}
            <button type="button" className="ink-link" onClick={() => { clearDraft(); setTitle(""); editor.commands.clearContent(true); }}>
              discard
            </button>
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        <div className="toolbar" role="toolbar" aria-label="formatting">
          <ToolButton label="bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>{Icons.bold}</ToolButton>
          <ToolButton label="italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>{Icons.italic}</ToolButton>
          <ToolButton label="underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>{Icons.underline}</ToolButton>
          <ToolButton label="strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>{Icons.strike}</ToolButton>
          <ToolButton label="subscript" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>{Icons.sub}</ToolButton>
          <ToolButton label="superscript" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>{Icons.sup}</ToolButton>
          <ToolButton label="inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>{Icons.code}</ToolButton>
          <ToolButton label="highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>{Icons.mark}</ToolButton>
          <ToolButton label="heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>{Icons.h3}</ToolButton>
          <ToolButton label="heading 4" active={editor.isActive("heading", { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>{Icons.h4}</ToolButton>
          <ToolButton label="blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>{Icons.quote}</ToolButton>
          <ToolButton label="aside" active={editor.isActive("aside")} onClick={() => editor.commands.toggleAside()}>{Icons.aside}</ToolButton>
          <ToolButton label="code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{Icons.pre}</ToolButton>
          <ToolButton label="horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>{Icons.hr}</ToolButton>
          <ToolButton label="link (⌘K)" active={editor.isActive("link")} onClick={() => setLinkModalOpen(true)}>{Icons.link}</ToolButton>
          <ToolButton label="image" onClick={handleImagePick}>{Icons.image}</ToolButton>
          <ToolButton label="details" active={editor.isActive("details")} onClick={() => editor.commands.toggleDetails()}>{Icons.details}</ToolButton>
        </div>

        {error && <p className="inline-error">{error}</p>}

        <input
          className="title-input"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title"
          aria-label="title"
        />
        <hr className="title-rule" />
        <EditorContent editor={editor} className="editor-body" />

        <div className="editor-actions">
          <button type="button" className="stamp stamp-lg" onClick={() => void publish()}>
            Tear off this page
          </button>
          <button type="button" className="text-btn" onClick={handleDiscard}>
            Discard
          </button>
        </div>
      </Paper>

      {linkModalOpen && (
        <SelectionLinkModal
          initialText={editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            " ",
          )}
          onClose={() => setLinkModalOpen(false)}
          onAdd={handleLinkAdd}
        />
      )}

      {confirmEmpty && (
        <Modal title="publish an empty page?" onClose={() => setConfirmEmpty(false)}>
          <p className="modal-body">
            This page has a title but no content. You can still publish it, or go
            back and write something.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setConfirmEmpty(false);
                editor.commands.focus();
              }}
            >
              go back
            </button>
            <button
              type="button"
              className="stamp"
              onClick={() => {
                setConfirmEmpty(false);
                void doPublish();
              }}
            >
              publish anyway
            </button>
          </div>
        </Modal>
      )}
    </Desk>
  );
}
