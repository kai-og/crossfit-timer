import { useEffect, useRef, useState } from "react";

/** Keeps the screen on while `active`. Re-acquires after the tab returns to the foreground. */
export function useWakeLock(active: boolean): "on" | "off" | "unsupported" {
  const [state, setState] = useState<"on" | "off">("off");
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const lock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !supported) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) return void sentinel.release();
        lock.current = sentinel;
        setState("on");
        sentinel.addEventListener("release", () => setState("off"));
      } catch {
        setState("off");
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock.current?.release();
      lock.current = null;
    };
  }, [active, supported]);

  return supported ? state : "unsupported";
}
