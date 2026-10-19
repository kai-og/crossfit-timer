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

/**
 * Dim the page itself, not only our overlay. On iPhone the strip along the bottom edge (the home-indicator area) can
 * sit outside every `fixed` layer, so an overlay never reaches it and the page colour shows through undimmed. The
 * root background does cover it, so a translucent black layer on the root gives the same dimming there.
 */
export function usePageDim(active: boolean, alpha = 0.6) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const previous = html.style.backgroundImage;
    html.style.backgroundImage = `linear-gradient(rgba(0,0,0,${alpha}),rgba(0,0,0,${alpha}))`;
    return () => {
      html.style.backgroundImage = previous;
    };
  }, [active, alpha]);
}
