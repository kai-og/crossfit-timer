"use client";

import { IconX } from "@tabler/icons-react";
import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePageDim } from "@/lib/usePagePaint";

const SCAN_INTERVAL_MS = 150;
const MAX_FRAME_WIDTH = 640;

/**
 * Full-screen camera view that reads QR codes. Works in an installed iPhone web app, where the system camera
 * would send the link to Safari instead. `onText` returns true when it accepted the code (scanning then stops).
 */
export function QrScanner({ onText, onClose }: { onText: (text: string) => boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onTextRef = useRef(onText);
  const [error, setError] = useState("");
  const [rejected, setRejected] = useState(false);
  usePageDim(true, 1);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    let stream: MediaStream | null = null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("The camera is not available here. Enter the code instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
      } catch (e) {
        const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
        setError(
          denied
            ? "Camera access was blocked. Allow it in your phone's settings for this app, or enter the code instead."
            : "Could not start the camera. Enter the code instead.",
        );
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video || !ctx) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const scan = () => {
        if (stopped) return;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
          if (result?.data) {
            if (onTextRef.current(result.data)) return;
            setRejected(true);
          }
        }
        timer = window.setTimeout(scan, SCAN_INTERVAL_MS);
      };
      scan();
    }

    void start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Rendered into <body>: inside the sticky bottom bar, its backdrop blur would make `fixed` relative to the bar.
  return createPortal(
    <div role="dialog" aria-label="Scan QR code" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />

      <div className="relative flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <p className="font-display text-2xl">Scan QR code</p>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 active:bg-black"
        >
          <IconX size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="pointer-events-none relative flex flex-1 items-center justify-center">
        <div className="h-[min(70vw,55vh)] w-[min(70vw,55vh)] rounded-3xl border-4 border-lime shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]" />
      </div>

      <div className="relative flex flex-col items-center gap-3 px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-4 text-center">
        {error ? (
          <p role="alert" className="max-w-sm rounded-xl bg-alert px-4 py-3">
            {error}
          </p>
        ) : (
          <p className="max-w-sm rounded-xl bg-black/65 px-4 py-2.5">
            {rejected
              ? "That is not a timer QR code. Try the one on the coach page."
              : "Point the camera at the QR code on the coach page."}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
