import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import "./notebook.css";
import { ToastHost } from "@/components/ToastHost";
import { printBootBanner } from "@/lib/toast";

printBootBanner();

// Lazy load route components for better code splitting
const Home = lazy(() => import("./pages/Home.tsx"));
const Editor = lazy(() => import("./pages/Editor.tsx"));
const Reader = lazy(() => import("./pages/Reader.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

function RouteLoading() {
  return (
    <div className="desk">
      <div className="paper" style={{ minHeight: 160 }} />
    </div>
  );
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="desk">
          <div className="paper centered-paper">
            <p className="torn-note" style={{ fontSize: 20 }}>
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre
                style={{
                  maxWidth: "100%",
                  overflow: "auto",
                  fontSize: 12,
                  lineHeight: "16px",
                  background: "#f4efe2",
                  padding: 16,
                  borderRadius: 2,
                }}
              >
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ConvexProvider client={convex}>
        <BrowserRouter>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/new" element={<Editor />} />
              <Route path="/p/:slug" element={<Reader />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <ToastHost />
      </ConvexProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
