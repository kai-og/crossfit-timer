import { useEffect } from "react";

/**
 * Paint the whole page, not just our container. On iPhone Safari the notch / safe-area strips in landscape, the area
 * under the toolbar in portrait, and the browser UI tint all come from the root background and theme-color; if only
 * <main> changes colour, those keep the old one. Applied again when the tab comes back, because iOS can drop it.
 */
export function usePagePaint(color: string, restore = "#101114") {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const apply = () => {
      html.style.backgroundColor = color;
      body.style.backgroundColor = color;
      meta?.setAttribute("content", color);
    };
    apply();
    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", apply);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", apply);
      html.style.backgroundColor = "";
      body.style.backgroundColor = "";
      meta?.setAttribute("content", restore);
    };
  }, [color, restore]);
}
