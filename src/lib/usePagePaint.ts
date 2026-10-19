import { useEffect } from "react";

type Listener = () => void;

/** How much black is currently laid over the page colours (0 = none). Set while a dialog is open. */
let dimAlpha = 0;
const listeners = new Set<Listener>();

function setDim(alpha: number) {
  dimAlpha = alpha;
  listeners.forEach((listener) => listener());
}

/** `#rrggbb` mixed with black. Browsers and iOS read plain colours, so the dim is baked into the colour itself. */
function withDim(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match || dimAlpha === 0) return hex;
  const n = parseInt(match[1], 16);
  const keep = 1 - dimAlpha;
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * keep);
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/**
 * Paint the whole page, not just our container. On iPhone the notch / safe-area strips in landscape, the strip along the
 * bottom edge in portrait, and the browser UI tint all come from the root background and theme-color; if only <main>
 * changes colour, those keep the old one. Applied again when the app comes back, because iOS can drop it, and again
 * whenever a dialog dims the page (see usePageDim).
 */
export function usePagePaint(color: string, restore = "#101114") {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const apply = () => {
      const shown = withDim(color);
      html.style.backgroundColor = shown;
      body.style.backgroundColor = shown;
      meta?.setAttribute("content", shown);
    };
    apply();
    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };
    listeners.add(apply);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", apply);
    return () => {
      listeners.delete(apply);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", apply);
      html.style.backgroundColor = "";
      body.style.backgroundColor = "";
      meta?.setAttribute("content", restore);
    };
  }, [color, restore]);
}

/**
 * Dim the page colours themselves while a dialog is open. On iPhone the strip along the bottom edge is filled from the
 * page's colour settings, not from anything drawn on top, so an overlay (or a gradient) never darkens it. Mixing the
 * dim into the colours that usePagePaint hands to the root, body and theme-color does.
 */
export function usePageDim(active: boolean, alpha = 0.6) {
  useEffect(() => {
    if (!active) return;
    setDim(alpha);
    return () => setDim(0);
  }, [active, alpha]);
}

/** Stop the document from scrolling while a full-screen screen (the timer) is shown, so nothing can shift under it. */
export function usePageLock() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("page-lock");
    return () => html.classList.remove("page-lock");
  }, []);
}
