"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { InstallHint } from "@/components/InstallHint";
import { CuePlayer } from "@/lib/timer/audio";
import { buildSegments, clockMs, cuesBetween, formatClock, getState } from "@/lib/timer/engine";
import { describeConfig } from "@/lib/timer/share";
import type { WorkoutConfig } from "@/lib/timer/types";
import { useWakeLock } from "@/lib/useWakeLock";

type Status = "ready" | "running" | "paused" | "finished";
type Phase = "ready" | "countdown" | "work" | "warning" | "finished";

const PHASE_BG: Record<Phase, string> = {
  ready: "#09090b",
  countdown: "#f59e0b",
  work: "#047857",
  warning: "#dc2626",
  finished: "#0369a1",
};

/**
 * Paint the whole page, not just our container. On iPhone Safari the notch / safe-area strips in landscape (and the
 * browser UI tint) come from the root background and theme-color; if only <main> changes colour, the sides keep the old one.
 */
function usePagePaint(color: string) {
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
      meta?.setAttribute("content", PHASE_BG.ready);
    };
  }, [color]);
}

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

  const phase: Phase = status === "ready" ? "ready" : status === "finished" ? "finished" : inCountdown ? "countdown" : lastTen ? "warning" : "work";
  const bg = PHASE_BG[phase];
  usePagePaint(bg);

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

  // Clock width in em (digits are wider than colons), so the font can be sized to always fit the screen.
  const clockWidthEm = [...clock].reduce((w, ch) => w + (ch === ":" ? 0.32 : 0.62), 0);

  const btn =
    "rounded-2xl border border-white/25 bg-black/55 px-6 py-4 text-xl font-semibold text-white active:bg-black/75";

  return (
    <main
      className="timer-root select-none text-white"
      style={{ backgroundColor: bg, color: phase === "countdown" ? "#000" : undefined }}
    >
      <header className="timer-header w-full px-6 pt-[max(env(safe-area-inset-top),1.5rem)] text-center">
        <p className="truncate text-2xl font-semibold opacity-90">{config.name || describeConfig(config)}</p>
        <p className="text-lg opacity-70">{describeConfig(config)}</p>
      </header>

      {status === "ready" ? (
        <div className="timer-center flex w-full max-w-md flex-col items-center gap-6 justify-self-center px-4">
          <button
            onClick={start}
            className="rounded-full bg-emerald-500 px-14 py-10 text-5xl font-bold text-black shadow-lg active:scale-95"
          >
            START
          </button>
          <InstallHint />
        </div>
      ) : (
        <div className="timer-center flex flex-col items-center">
          <p className="timer-label font-semibold uppercase tracking-widest opacity-90">{label}</p>
          <p className="timer-clock" style={{ "--clock-w": clockWidthEm } as React.CSSProperties}>
            {clock}
          </p>
          {status === "paused" && <p className="mt-2 text-3xl font-semibold">PAUSED</p>}
        </div>
      )}

      <footer className="timer-controls">
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
          <button
            className="rounded-2xl bg-emerald-400 px-6 py-4 text-xl font-semibold text-black active:bg-emerald-300"
            onClick={finishNow}
          >
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

      {wakeLock === "unsupported" && status !== "ready" && (
        <p className="absolute left-0 top-1 w-full text-center text-xs opacity-60">
          Screen may dim: keep-awake is not supported on this browser.
        </p>
      )}
    </main>
  );
}
