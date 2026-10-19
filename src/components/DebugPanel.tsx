"use client";

import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function rectOf(selector: string): string {
  const el = document.querySelector(selector);
  if (!el) return "not on this screen";
  const r = el.getBoundingClientRect();
  return `top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)}, height ${Math.round(r.height)}`;
}

function measure(): [string, string][] {
  // env() safe-area values can only be read through a styled element.
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = `top ${cs.paddingTop}, right ${cs.paddingRight}, bottom ${cs.paddingBottom}, left ${cs.paddingLeft}`;
  probe.remove();

  const html = document.documentElement;
  const vv = window.visualViewport;
  const bg = (el: Element) => getComputedStyle(el).backgroundColor;
  return [
    ["build", process.env.NEXT_PUBLIC_BUILD_ID?.slice(0, 7) ?? "dev"],
    ["window inner", `${window.innerWidth} x ${window.innerHeight}`],
    ["screen", `${screen.width} x ${screen.height}`],
    ["visual viewport", vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)}, offsetTop ${Math.round(vv.offsetTop)}, pageTop ${Math.round(vv.pageTop)}, scale ${vv.scale}` : "n/a"],
    ["html client/scroll height", `${html.clientHeight} / ${html.scrollHeight}`],
    ["body height", `${document.body.offsetHeight}`],
    ["scrollY", `${Math.round(window.scrollY)}`],
    ["page can scroll", String(html.scrollHeight > window.innerHeight + 1)],
    ["safe-area insets", insets],
    ["timer root", rectOf(".timer-root")],
    ["timer controls", rectOf(".timer-controls")],
    ["dialog overlay", rectOf('[role="alertdialog"]')],
    ["html background", bg(html)],
    ["body background", bg(document.body)],
    ["theme-color", document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? "none"],
    ["installed (standalone)", String(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)],
    ["page-lock", String(html.classList.contains("page-lock"))],
  ];
}

/** Hidden screen-geometry readout for tracking down layout problems on a real phone. */
export function DebugPanel({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<[string, string][]>([]);

  useEffect(() => {
    const update = () => setRows(measure());
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return createPortal(
    <div role="dialog" aria-label="Diagnostics" className="fixed inset-0 z-[200] overflow-auto bg-black p-4 pt-[max(env(safe-area-inset-top),1rem)] text-white">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-2xl">Diagnostics</p>
        <button onClick={onClose} aria-label="Close diagnostics" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <IconX size={20} aria-hidden="true" />
        </button>
      </div>
      <p className="mb-3 text-sm text-white/70">Take a screenshot of this screen and send it.</p>
      <dl className="font-mono text-[13px] leading-snug">
        {rows.map(([k, v]) => (
          <div key={k} className="mb-2">
            <dt className="text-lime">{k}</dt>
            <dd className="break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>,
    document.body,
  );
}
