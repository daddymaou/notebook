/**
 * Convex deployment URLs must never carry a trailing slash. The client appends
 * `/api/...` by plain concatenation, so a trailing slash produces `//api/...`,
 * which the backend answers with 404 and the sync WebSocket never connects.
 * Normalising here means a sloppy value in a hosting dashboard's env var
 * cannot take the app down.
 */
function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Client API origin (`*.convex.cloud`), used by ConvexReactClient. */
export function convexUrl(): string {
  return normalize(import.meta.env.VITE_CONVEX_URL ?? "");
}

/** HTTP actions are served from the site origin (`*.convex.site`), not cloud. */
export function uploadEndpoint(): string {
  const cloud = convexUrl();
  if (!cloud) return "/uploadImage";
  return `${cloud.replace(".convex.cloud", ".convex.site")}/uploadImage`;
}
