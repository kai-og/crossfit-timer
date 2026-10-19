"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Dark panel for the phone timer, light panel for the coach pages. */
  tone?: "dark" | "light";
  /** Red confirm button, for actions that delete something. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-app replacement for window.confirm: same look as the rest of the app, and it works in installed web apps. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "dark",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const dark = tone === "dark";
  const panel = dark ? "bg-[#1a1c21] text-white border-white/15" : "bg-white text-ink border-line";
  const sub = dark ? "text-white/70" : "text-muted";
  const cancel = dark
    ? "border border-white/30 text-white active:bg-white/10"
    : "border border-ink text-ink hover:bg-paper";
  const confirm = danger
    ? "bg-alert text-white"
    : dark
      ? "bg-lime text-ink"
      : "bg-ink text-white";

  // Rendered into <body> so no transformed or filtered ancestor can trap it.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? "confirm-message" : undefined}
        className={`w-full max-w-sm rounded-2xl border p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-5 ${panel}`}
      >
        <h2 id="confirm-title" className="font-display text-3xl leading-none">
          {title}
        </h2>
        {message && (
          <p id="confirm-message" className={`mt-2 text-base ${sub}`}>
            {message}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={`h-12 flex-1 rounded-xl text-lg ${cancel}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-12 flex-1 rounded-xl text-lg font-medium active:brightness-90 ${confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
