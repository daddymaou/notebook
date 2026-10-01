import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Desk, Paper } from "@/components/Paper";
import { Modal } from "@/components/Modal";
import { NodeRenderer } from "@/components/NodeRenderer";
import { firstImage, firstLine, plainText, sanitizeTree } from "@/lib/nodes";
import type { PageNode } from "@/lib/nodes";
import { showToast } from "@/lib/toast";
import type { Doc } from "@/convex/_generated/dataModel";

function setMeta(attr: "property" | "name", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** ~200 wpm reading time, rounded up; pages under 60s just say "a short read". */
function readingTime(nodes: PageNode[]): string {
  const text = plainText(nodes);
  const words = text ? text.split(/\s+/).length : 0;
  if (words === 0) return "a short read";
  const minutes = Math.ceil(words / 200);
  if (minutes < 1) return "a short read";
  return minutes === 1 ? "1 min read" : `${minutes} min read`;
}

export default function Reader() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editMode = params.get("edit") === "1";
  const removePage = useMutation(api.pages.remove);
  const page = useQuery(api.pages.getBySlug, slug ? { slug } : "skip");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const safeNodes: PageNode[] = useMemo(
    () => (page ? sanitizeTree(page.content) : []),
    [page],
  );

  const title = page?.title?.trim() || "";
  const bodyText = useMemo(() => plainText(safeNodes), [safeNodes]);
  const docTitle = title
    ? `${title} — notebook`
    : bodyText
      ? `${bodyText.slice(0, 60)} — notebook`
      : "untitled — notebook";

  // browser tab title + meta tags (injected client-side; SPA has no SSR)
  useEffect(() => {
    document.title = docTitle;
    const desc = bodyText.slice(0, 160);
    const shareTitle = title || firstLine(safeNodes) || "untitled";
    setMeta("property", "og:type", "article");
    setMeta("property", "og:title", shareTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:image", firstImage(safeNodes) ?? "/og.png");
    setMeta("property", "og:url", window.location.href);
    setMeta("property", "article:published_time", page ? new Date(page.createdAt).toISOString() : "");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", shareTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", firstImage(safeNodes) ?? "/og.png");
  }, [docTitle, bodyText, title, safeNodes, page]);

  useEffect(() => {
    if (page === null) document.title = "torn out — notebook";
  }, [page]);

  if (page === undefined) {
    // loading: paper fades in with skeleton ruled lines (max ~200ms)
    return (
      <Desk>
        <Paper variant="reader">
          <div className="reader-skeleton" style={{ minHeight: 200 }}>
            <div className="skel" />
            <div className="skel" />
            <div className="skel" />
          </div>
        </Paper>
        </Desk>
      );
  }

  if (page === null) {
    return (
      <Desk>
        <Paper variant="sheet">
          <div className="centered-paper">
            <p className="torn-note">this page seems to have been torn out</p>
            <Link className="ink-link" to="/">
              go back to the notebook →
            </Link>
          </div>
        </Paper>
      </Desk>
    );
  }

  const doRemove = async () => {
    setDeleting(true);
    try {
      await removePage({ slug });
      navigate("/");
    } catch {
      showToast("network");
    } finally {
      setDeleting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("link copied to your clipboard.");
    } catch {
      showToast("network");
    }
  };

  return (
    <Desk>
      <Paper variant="reader">
        {title && <h2 className="page-title font-hand">{title}</h2>}
        {safeNodes.length === 0 ? (
          <p className="empty-note">this page is blank.</p>
        ) : (
          <NodeRenderer nodes={safeNodes} />
        )}
        <div className="reader-footer">
          <p className="written-on font-hand">
            {readingTime(safeNodes)} · page written on {formatDate(page.createdAt)}
            </p>
          <Link className="write-own ink-link" to="/new">
            write your own →
          </Link>
          {editMode && (
            <div className="reader-edit-bar">
              <button type="button" className="ink-link" onClick={() => void copyLink()}>
                copy link
              </button>
              <button type="button" className="ink-link" onClick={() => setConfirmDelete(true)}>
                tear out
              </button>
            </div>
          )}
        </div>
      </Paper>

      {confirmDelete && (
        <Modal title="tear out this page?" onClose={() => setConfirmDelete(false)}>
          <p className="modal-body">
            This page will be removed permanently. The link will stop working.
          </p>
          <div className="modal-actions">
            <button type="button" className="text-btn" onClick={() => setConfirmDelete(false)}>
              keep it
            </button>
            <button
              type="button"
              className="stamp stamp-danger"
              disabled={deleting}
              onClick={() => void doRemove()}
            >
              tear it out
            </button>
          </div>
        </Modal>
      )}
    </Desk>
  );
}
