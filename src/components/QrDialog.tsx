"use client";

import { IconCheck, IconCopy, IconX } from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatCode } from "@/lib/workoutRef";

interface Props {
  open: boolean;
  title: string;
  /** Saved workout id, shown as the code. */
  id: string;
  /** Full link the QR code points to. */
  url: string;
  onClose: () => void;
}

/** Large QR code and code for a saved workout, ready to hold up or show on a screen next to the rig. */
export function QrDialog({ open, title, id, url, onClose }: Props) {
  const [qr, setQr] = useState({ url: "", data: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 720, color: { dark: "#14161a", light: "#ffffff" } }).then((data) => {
      if (!cancelled) setQr({ url, data });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, url, onClose]);

  if (!open) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`QR code for ${title}`}
        className="relative w-full max-w-sm rounded-2xl border border-line bg-white p-5 text-center text-ink"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-paper"
        >
          <IconX size={20} aria-hidden="true" />
        </button>
        <p className="font-display mx-10 truncate text-3xl leading-none">{title}</p>
        <div className="mx-auto mt-4 aspect-square w-full max-w-[280px] rounded-lg bg-paper">
          {qr.url === url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr.data} alt="QR code for the timer link" className="h-full w-full rounded-lg" />
          )}
        </div>
        <p className="mt-3 text-sm text-muted">Or enter this code on the phone</p>
        <p className="font-display text-5xl leading-none">{formatCode(id)}</p>
        <button
          type="button"
          onClick={copy}
          className="mx-auto mt-4 flex h-10 items-center gap-2 rounded-lg border border-ink px-4 hover:bg-paper"
        >
          {copied ? <IconCheck size={18} aria-hidden="true" /> : <IconCopy size={18} aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
