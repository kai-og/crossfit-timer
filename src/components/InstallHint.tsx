"use client";

import { useInstall } from "@/lib/useInstall";

/** Nudges phone users to install the timer as an app: full screen, no browser bars, and it opens offline. */
export function InstallHint({ className = "" }: { className?: string }) {
  const state = useInstall();
  if (state.kind === "hidden") return null;

  return (
    <div
      role="region"
      aria-label="Install the app"
      className={`flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left text-sm ${className}`}
    >
      {state.kind === "prompt" ? (
        <>
          <p className="flex-1">Install this timer as an app for full screen and offline use.</p>
          <button
            onClick={state.install}
            className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-black active:bg-emerald-400"
          >
            Install
          </button>
        </>
      ) : (
        <p className="flex-1">
          To use it as an app: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Open it from the
          home screen icon for full screen.
        </p>
      )}
      <button onClick={state.dismiss} aria-label="Dismiss" className="px-2 text-xl leading-none opacity-60">
        ×
      </button>
    </div>
  );
}
