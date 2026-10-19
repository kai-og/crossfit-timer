"use client";

import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronLeft,
  IconFlag,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { InstallHint } from "@/components/InstallHint";
import { CuePlayer } from "@/lib/timer/audio";
import { buildSegments, clockMs, cuesBetween, formatClock, getState, startClock } from "@/lib/timer/engine";
import { describeConfig } from "@/lib/timer/share";
import type { WorkoutConfig } from "@/lib/timer/types";
import { usePagePaint } from "@/lib/usePagePaint";
import { useWakeLock } from "@/lib/useWakeLock";

type Status = "ready" | "running" | "paused" | "finished";
type Phase = "ready" | "countdown" | "work" | "warning" | "finished";

interface Look {
  bg: string;
  fg: string;
  /** Unfilled part of the progress bar. */
  track: string;
  /** Borders of the control dock. */
  line: string;
  /** Filled part of the progress bar. */
  accent: string;
  btnBg: string;
  btnFg: string;
}

const NIGHT = "#101114";
const LIME = "#c6f432";
const INK = "#14161a";

/** Scoreboard colours: dark while working, lime for get-ready, red for the last 10 seconds, paper when done. */
const LOOK: Record<Phase, Look> = {
  ready: { bg: NIGHT, fg: "#fff", track: "rgba(255,255,255,.2)", line: "rgba(255,255,255,.22)", accent: LIME, btnBg: LIME, btnFg: INK },
  work: { bg: NIGHT, fg: "#fff", track: "rgba(255,255,255,.2)", line: "rgba(255,255,255,.22)", accent: LIME, btnBg: LIME, btnFg: INK },
  countdown: { bg: LIME, fg: INK, track: "rgba(20,22,26,.2)", line: "rgba(20,22,26,.3)", accent: INK, btnBg: INK, btnFg: LIME },
  warning: { bg: "#d7261e", fg: "#fff", track: "rgba(255,255,255,.28)", line: "rgba(255,255,255,.42)", accent: "#fff", btnBg: "#fff", btnFg: INK },
  finished: { bg: "#f4f2ee", fg: INK, track: "rgba(20,22,26,.15)", line: "rgba(20,22,26,.25)", accent: INK, btnBg: INK, btnFg: "#fff" },
};

/** How far ahead (ms) cues are handed to the audio clock. Covers a throttled 1s JS timer. */
const LOOKAHEAD_MS = 1500;
const MAX_ROUND_SEGMENTS = 40;

export function TimerScreen({ config, creator }: { config: WorkoutConfig; creator?: string }) {
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

  const phase: Phase =
    status === "ready" ? "ready" : status === "finished" ? "finished" : inCountdown ? "countdown" : lastTen ? "warning" : "work";
  const look = LOOK[phase];
  usePagePaint(look.bg);

  const clock = status === "ready" ? startClock(config) : formatClock(clockMs(state), seg.countsUp && !inCountdown);
  // Clock width in em (Barlow Condensed digits are narrow, the colon narrower), so the font can fit the screen.
  const clockWidthEm = [...clock].reduce((w, ch) => w + (ch === ":" ? 0.3 : 0.54), 0);

  const label =
    status === "finished"
      ? "Done"
      : status === "paused"
        ? "Paused"
        : status === "ready"
          ? describeConfig(config)
          : inCountdown
            ? "Get ready"
            : config.mode === "emom"
              ? `Round ${state.round} of ${state.totalRounds}`
              : isForTime
                ? "For time"
                : "AMRAP";

  // Progress: one segment per EMOM round, otherwise a single bar for the current stretch.
  const segmentProgress = status === "ready" ? 0 : status === "finished" && !isForTime ? 1 : state.segmentElapsedMs / seg.durationMs;
  const roundBars = config.mode === "emom" && config.rounds <= MAX_ROUND_SEGMENTS ? config.rounds : 0;
  const bars = roundBars
    ? Array.from({ length: roundBars }, (_, i) => {
        const round = i + 1;
        if (status === "finished") return 1;
        if (status === "ready" || inCountdown) return 0;
        return round < state.round ? 1 : round === state.round ? segmentProgress : 0;
      })
    : [Math.min(Math.max(segmentProgress, 0), 1)];

  const atRest = status === "ready" || status === "finished";
  const compact = !atRest;
  const iconSize = 22;

  return (
    <main
      className="timer-root"
      style={
        {
          "--bg": look.bg,
          "--fg": look.fg,
          "--track": look.track,
          "--line-soft": look.line,
          "--accent": look.accent,
          "--btn-bg": look.btnBg,
          "--btn-fg": look.btnFg,
        } as React.CSSProperties
      }
    >
      <div className="timer-progress" aria-hidden="true">
        {bars.map((fill, i) => (
          <span key={i}>
            <i style={{ width: `${Math.round(fill * 1000) / 10}%` }} />
          </span>
        ))}
      </div>

      <header className="timer-header">
        {atRest && (
          // Full page load to the workout list: the installed iPhone app has no browser back button.
          <a href="/t" className="timer-back">
            <IconChevronLeft size={20} aria-hidden="true" />
            Workouts
          </a>
        )}
        {atRest && (
          <>
            <p className="timer-title font-display">{config.name || describeConfig(config)}</p>
            <p className="timer-meta">
              {describeConfig(config)}
              {creator ? ` · by ${creator}` : ""}
            </p>
          </>
        )}
      </header>

      <section className="timer-center">
        {!atRest && (
          <p className="timer-label">
            <span className="truncate">{config.name || describeConfig(config)}</span>
            <span className="shrink-0">{label}</span>
          </p>
        )}
        <p
          className="timer-clock font-display"
          style={{ "--clock-w": clockWidthEm, opacity: status === "ready" ? 0.28 : 1 } as React.CSSProperties}
          role="timer"
        >
          {clock}
        </p>
        {status === "finished" && <p className="timer-label !justify-center">Done</p>}
        {status === "ready" && <InstallHint className="mt-4 w-full max-w-sm" />}
      </section>

      <footer className="timer-controls">
        {status === "ready" && (
          <button className="timer-start" onClick={start}>
            <IconPlayerPlay size={24} aria-hidden="true" />
            Start
          </button>
        )}
        {status === "finished" && (
          <button className="timer-start" onClick={reset}>
            <IconRefresh size={24} aria-hidden="true" />
            Run again
          </button>
        )}
        <div className="timer-dock">
          {status === "running" && (
            <button className="primary" onClick={pause}>
              <IconPlayerPause size={iconSize} aria-hidden="true" />
              Pause
            </button>
          )}
          {status === "paused" && (
            <button className="primary" onClick={resume}>
              <IconPlayerPlay size={iconSize} aria-hidden="true" />
              Resume
            </button>
          )}
          {status === "running" && isForTime && !inCountdown && (
            <button onClick={finishNow}>
              <IconFlag size={iconSize} aria-hidden="true" />
              Finish
            </button>
          )}
          {compact && (
            <button onClick={reset}>
              <IconRefresh size={iconSize} aria-hidden="true" />
              Reset
            </button>
          )}
          <button onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
            {muted ? <IconVolumeOff size={iconSize} aria-hidden="true" /> : <IconVolume size={iconSize} aria-hidden="true" />}
            {muted ? "Muted" : "Sound"}
          </button>
          {supportsFullscreen && (
            <button onClick={toggleFullscreen}>
              {fullscreen ? (
                <IconArrowsMinimize size={iconSize} aria-hidden="true" />
              ) : (
                <IconArrowsMaximize size={iconSize} aria-hidden="true" />
              )}
              {fullscreen ? "Exit" : compact ? "Full" : "Full screen"}
            </button>
          )}
        </div>
      </footer>

      {wakeLock === "unsupported" && status !== "ready" && (
        <p className="timer-notice">Screen may dim: keep-awake is not supported on this browser.</p>
      )}
    </main>
  );
}
