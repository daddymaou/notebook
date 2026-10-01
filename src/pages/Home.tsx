import { useQuery } from "convex/react";
import { Link, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { Desk, Paper } from "@/components/Paper";
import { firstLine, plainText } from "@/lib/nodes";
import type { PageNode } from "@/lib/nodes";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Older drafts could store a bare string; the server always stores arrays. */
function contentNodes(content: unknown): PageNode[] {
  if (Array.isArray(content)) return content as PageNode[];
  if (typeof content === "string" && content.trim()) return [content];
  return [];
}

function wordCount(nodes: PageNode[]): number {
  const text = plainText(nodes);
  return text ? text.split(/\s+/).length : 0;
}

export default function Home() {
  const pages = useQuery(api.pages.list);
  const navigate = useNavigate();

  return (
    <Desk>
      <Paper variant="home">
        <div className="paper-topbar">
          <h1 className="app-title font-hand">notebook</h1>
          <Link className="ink-link" to="/about">
            about
          </Link>
        </div>
        <hr className="hand-rule" />
        <div className="toc">
          {pages === undefined ? null : pages.length === 0 ? (
            <p className="empty-note">the notebook is empty. write the first page.</p>
          ) : (
            pages.map((page) => {
              const nodes = contentNodes(page.content);
              const words = wordCount(nodes);
              return (
                <Link key={page.slug} className="toc-row" to={`/p/${page.slug}`}>
                  <span className="toc-title">
                    {page.title?.trim() || firstLine(nodes) || "untitled"}
                  </span>
                  <span className="toc-leader" />
                  <span className="toc-date">
                    {words > 0 && `${words} words · `}
                    {formatDate(page.createdAt)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
        <button type="button" className="stamp stamp-lg" onClick={() => void navigate("/new")}>
          Write a page
        </button>
      </Paper>
    </Desk>
  );
}
