"use client";

import { IconDownload, IconX } from "@tabler/icons-react";
import { useInstall } from "@/lib/useInstall";

/** Nudges phone users to install the timer as an app: full screen, no browser bars, and it opens offline. */
export function InstallHint({ className = "" }: { className?: string }) {
  const state = useInstall();
  if (state.kind === "hidden") return null;

  return (
    <div
      role="region"
      aria-label="Install the app"
      className={`flex items-center gap-3 rounded-xl border border-white/20 px-4 py-3 text-left text-sm text-white/85 ${className}`}
    >
      <IconDownload size={22} className="shrink-0 text-lime" aria-hidden="true" />
      {state.kind === "prompt" ? (
        <>
          <p className="flex-1">Install this timer as an app for full screen and offline use.</p>
          <button
            onClick={state.install}
            className="rounded-lg bg-lime px-4 py-2 font-medium text-ink active:brightness-90"
          >
            Install
          </button>
        </>
      ) : (
        <p className="flex-1">
          To use it as an app, tap <strong className="font-medium text-white">Share</strong>, then{" "}
          <strong className="font-medium text-white">Add to Home Screen</strong>. Open it from the home screen icon.
        </p>
      )}
      <button onClick={state.dismiss} aria-label="Dismiss" className="shrink-0 p-1 text-white/60">
        <IconX size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
