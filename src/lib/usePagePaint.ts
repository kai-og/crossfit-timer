import { useEffect } from "react";

/**
 * Paint the whole page, not just our container. On iPhone Safari the notch / safe-area strips in landscape (and the
 * browser UI tint) come from the root background and theme-color; if only <main> changes colour, the sides keep the old one.
 */
export function usePagePaint(color: string, restore = "#101114") {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    html.style.backgroundColor = color;
    body.style.backgroundColor = color;
    meta?.setAttribute("content", color);
    return () => {
      html.style.backgroundColor = "";
      body.style.backgroundColor = "";
      meta?.setAttribute("content", restore);
    };
  }, [color, restore]);
}
