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
 * sit outside every `fixed` layer, so an overlay never reaches it and the page colour shows through undimmed.
 * That strip is painted by the root background, or by <body> when body has its own colour and reaches the bottom
 * (it does on the phone timer), so a translucent black layer goes on both. Desktop pages pass `includeBody: false`,
 * because there body's colour is visible between the cards and would end up dimmed twice.
 */
export function usePageDim(active: boolean, alpha = 0.6, includeBody = true) {
  useEffect(() => {
    if (!active) return;
    const layer = `linear-gradient(rgba(0,0,0,${alpha}),rgba(0,0,0,${alpha}))`;
    const targets = includeBody ? [document.documentElement, document.body] : [document.documentElement];
    const previous = targets.map((el) => el.style.backgroundImage);
    targets.forEach((el) => (el.style.backgroundImage = layer));
    return () => {
      targets.forEach((el, i) => (el.style.backgroundImage = previous[i]));
    };
  }, [active, alpha, includeBody]);
}
