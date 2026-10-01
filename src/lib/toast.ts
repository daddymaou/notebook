/** Single-toast system: slide up, hold 4s, fade out. */

export type ToastKind =
  | "network"
  | "notfound"
  | "server"
  | "upload"
  | "publish"
  | "generic";

const MESSAGES: Record<ToastKind, string> = {
  network: "the ink didn't reach the page. try again.",
  notfound: "this page seems to have been torn out.",
  server: "something spilled on the ink. try again.",
  upload: "couldn't add that image.",
  publish: "the page wouldn't tear off. try again.",
  generic: "something went wrong. try again.",
};

export function toastMessage(kind: ToastKind): string {
  return MESSAGES[kind];
}

type Listener = (message: string) => void;

let listener: Listener | null = null;

export function setToastListener(fn: Listener | null) {
  listener = fn;
}

export function showToast(kindOrMessage: ToastKind | string) {
  const message =
    kindOrMessage in MESSAGES
      ? MESSAGES[kindOrMessage as ToastKind]
      : kindOrMessage;
  listener?.(message);
}

/** Console banner: small ASCII notebook. */
export function printBootBanner() {
  const banner = [
    "  ┌─────────────┐",
    "  │             │",
    "  │  notebook   │",
    "  │             │",
    "  └─────────────┘",
  ];
  console.log(banner.join("\n"));
}
