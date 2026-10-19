"use client";

import { useEffect } from "react";
import { isTimerBusy } from "@/lib/activity";

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const RELOADED_KEY = "reloaded-for-build";
const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * An installed phone app is usually resumed from memory rather than reloaded, so it can keep running old code long
 * after a new version is out. When the app comes to the foreground (and every few minutes) this asks the server which
 * version is current and reloads once if they differ. It never reloads during a workout, and never twice for the
 * same version, so it cannot loop.
 */
export function UpdateWatcher() {
  useEffect(() => {
    if (BUILD === "dev") return;
    let stopped = false;

    const check = async () => {
      if (stopped || document.visibilityState !== "visible" || isTimerBusy()) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { build } = (await res.json()) as { build?: string };
        if (!build || build === "dev" || build === BUILD || isTimerBusy()) return;
        if (sessionStorage.getItem(RELOADED_KEY) === build) return;
        sessionStorage.setItem(RELOADED_KEY, build);
        window.location.reload();
      } catch {
        // Offline or storage blocked: stay on the current version.
      }
    };

    const first = window.setTimeout(check, 3000);
    const interval = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return null;
}
