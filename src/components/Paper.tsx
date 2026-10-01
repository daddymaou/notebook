import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * A sheet of paper on the desk. Children render above the ruled
 * lines and grain overlays (::before / ::after).
 */
export function Paper({
  variant = "sheet",
  children,
}: {
  variant?: "sheet" | "home" | "editor" | "reader";
  children: ReactNode;
}) {
  const cls = [
    "paper",
    variant === "home" ? "paper-home" : "",
    variant === "editor" ? "paper-editor" : "",
    variant === "reader" ? "paper-reader" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}

export function Desk({ children }: { children: ReactNode }) {
  return <div className="desk">{children}</div>;
}

export function InkLink({
  to,
  onClick,
  children,
  className = "",
}: {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (to) {
    return (
      <Link className={`ink-link ${className}`} to={to}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={`ink-link ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
