"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { InstallHint } from "@/components/InstallHint";
import { CuePlayer } from "@/lib/timer/audio";
import { buildSegments, clockMs, cuesBetween, formatClock, getState } from "@/lib/timer/engine";
import { describeConfig } from "@/lib/timer/share";
import type { WorkoutConfig } from "@/lib/timer/types";
import { useOfflineReady } from "@/lib/useOfflineReady";
import { useWakeLock } from "@/lib/useWakeLock";

type Status = "ready" | "running" | "paused" | "finished";

/** How far ahead (ms) cues are handed to the audio clock. Covers a throttled 1s JS timer. */
const LOOKAHEAD_MS = 1500;

export function TimerScreen({ config }: { config: WorkoutConfig }) {
  const segments = useMemo(() => buildSegments(config), [config]);
  const [status, setStatus] = useState<Status>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // False on the server and during hydration, so markup matches; iPhone Safari has no Fullscreen API.
  const supportsFullscreen = useSyncExternalStore(
    () => () => {},
    () => document.documentElement.requestFullscreen !== undefined,
    () => false,
  );

  const player = useRef<CuePlayer | null>(null);
  const baseMs = useRef(0); // elapsed before the current run began
  const startedAt = useRef(0); // performance.now() when the current run began
  const scheduledUntil = useRef(-1);
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const offlineReady = useOfflineReady();
  const wakeLock = useWakeLock(status === "running" || status === "paused");

  const tick = useCallback(() => {
    const now = baseMs.current + (performance.now() - startedAt.current);
    const state = getState(segments, now);
    setElapsed(state.totalElapsedMs);

    const upTo = now + LOOKAHEAD_MS;
    if (!mutedRef.current && player.current) {
      for (const cue of cuesBetween(segments, scheduledUntil.current, upTo)) {
        player.current.schedule(cue.kind, (cue.atMs - now) / 1000);
      }
    }
    scheduledUntil.current = upTo;

    if (state.finished) setStatus("finished");
  }, [segments]);

  useEffect(() => {
    if (status !== "running") return;
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [status, tick]);

  // Release audio on leave.
  useEffect(() => () => player.current?.close(), []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const start = () => {
    player.current ??= new CuePlayer();
    player.current.unlock();
    baseMs.current = 0;
    scheduledUntil.current = -1;
    startedAt.current = performance.now();
    setElapsed(0);
    setStatus("running");
  };

  const pause = () => {
    baseMs.current += performance.now() - startedAt.current;
    setStatus("paused");
  };

  const resume = () => {
    player.current?.unlock();
    startedAt.current = performance.now();
    // Cues already handed to the audio clock before pausing are not re-sent.
    scheduledUntil.current = Math.max(scheduledUntil.current, baseMs.current);
    setStatus("running");
  };

  const reset = () => {
    if (status === "running" && !window.confirm("Reset the timer?")) return;
    baseMs.current = 0;
    setElapsed(0);
    setStatus("ready");
  };

  const finishNow = () => {
    // For Time: the athlete is done, freeze the clock at the current time.
    baseMs.current += performance.now() - startedAt.current;
    setElapsed(baseMs.current);
    setStatus("finished");
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const state = getState(segments, elapsed);
  const seg = state.segment;
  const inCountdown = seg.kind === "countdown";
  const isForTime = config.mode === "fortime";
  const lastTen =
    !inCountdown && !seg.countsUp && state.segmentRemainingMs <= 10_000 && status === "running";

  const bg =
    status === "ready"
      ? "bg-zinc-950"
      : status === "finished"
        ? "bg-sky-700"
        : inCountdown
          ? "bg-amber-500 text-black"
          : lastTen
            ? "bg-red-600"
            : "bg-emerald-700";

  const clock = formatClock(clockMs(state), seg.countsUp && !inCountdown);
  const label =
    status === "finished"
      ? "Done"
      : inCountdown
        ? "Get ready"
        : config.mode === "emom"
          ? `Round ${state.round} / ${state.totalRounds}`
          : isForTime
            ? "For Time"
            : "AMRAP";

  const btn = "rounded-2xl bg-black/30 px-6 py-4 text-xl font-semibold active:bg-black/50";

  return (
    <main className={`fixed inset-0 flex select-none flex-col items-center justify-between text-white ${bg}`}>
      <header className="w-full px-6 pt-[max(env(safe-area-inset-top),1.5rem)] text-center">
        <p className="truncate text-2xl font-semibold opacity-90">{config.name || describeConfig(config)}</p>
        <p className="text-lg opacity-70">{describeConfig(config)}</p>
      </header>

      {status === "ready" ? (
        <div className="flex w-full max-w-md flex-col items-center gap-8 px-4">
          <button
            onClick={start}
            className="rounded-full bg-emerald-500 px-14 py-10 text-5xl font-bold text-black shadow-lg active:scale-95"
          >
            START
          </button>
          <InstallHint />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="text-[8vmin] font-semibold uppercase tracking-widest opacity-90">{label}</p>
          <p
            className="font-bold leading-none"
            style={{ fontSize: "min(32vw, 40vh)", fontVariantNumeric: "tabular-nums" }}
          >
            {clock}
          </p>
          {status === "paused" && <p className="mt-4 text-4xl font-semibold">PAUSED</p>}
        </div>
      )}

      <footer className="flex w-full flex-wrap items-center justify-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        {status === "running" && (
          <button className={btn} onClick={pause}>
            Pause
          </button>
        )}
        {status === "paused" && (
          <button className={btn} onClick={resume}>
            Resume
          </button>
        )}
        {status === "running" && isForTime && !inCountdown && (
          <button className={`${btn} bg-emerald-400! text-black`} onClick={finishNow}>
            Finished
          </button>
        )}
        {status !== "ready" && (
          <button className={btn} onClick={reset}>
            Reset
          </button>
        )}
        <button className={btn} onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
          {muted ? "🔇 Muted" : "🔊 Sound"}
        </button>
        {supportsFullscreen && (
          <button className={btn} onClick={toggleFullscreen}>
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        )}
      </footer>

      {status === "ready" && (
        <p className="absolute bottom-28 px-6 text-center text-base opacity-60">
          Tap START to enable sound and keep the screen on. Make sure the phone is not on silent.
          {offlineReady && <span className="mt-1 block text-emerald-400">✓ Works offline</span>}
        </p>
      )}
      {wakeLock === "unsupported" && status !== "ready" && (
        <p className="absolute top-1 text-xs opacity-60">
          Screen may dim: keep-awake is not supported on this browser.
        </p>
      )}
    </main>
  );
}
