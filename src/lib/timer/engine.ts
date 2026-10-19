import type {
  Cue,
  Segment,
  TimerState,
  WorkoutConfig,
} from "./types";

export const LIMITS = {
  maxCountdownSec: 60,
  maxDurationSec: 4 * 3600,
  maxRounds: 200,
};

export function validateConfig(config: WorkoutConfig): string[] {
  const errors: string[] = [];
  const int = (n: number) => Number.isInteger(n);
  if (!int(config.countdownSec) || config.countdownSec < 0 || config.countdownSec > LIMITS.maxCountdownSec) {
    errors.push(`Countdown must be 0–${LIMITS.maxCountdownSec} seconds.`);
  }
  const seconds = (label: string, n: number) => {
    if (!int(n) || n < 1 || n > LIMITS.maxDurationSec) errors.push(`${label} must be between 1 second and 4 hours.`);
  };
  switch (config.mode) {
    case "fortime":
      seconds("Time cap", config.capSec);
      break;
    case "amrap":
      seconds("Duration", config.durationSec);
      break;
    case "emom":
      seconds("Interval", config.intervalSec);
      if (!int(config.rounds) || config.rounds < 1 || config.rounds > LIMITS.maxRounds) {
        errors.push(`Rounds must be between 1 and ${LIMITS.maxRounds}.`);
      }
      break;
  }
  return errors;
}

export function buildSegments(config: WorkoutConfig): Segment[] {
  const segments: Segment[] = [];
  if (config.countdownSec > 0) {
    segments.push({ kind: "countdown", durationMs: config.countdownSec * 1000, round: 1, countsUp: false });
  }
  switch (config.mode) {
    case "fortime":
      segments.push({ kind: "work", durationMs: config.capSec * 1000, round: 1, countsUp: true });
      break;
    case "amrap":
      segments.push({ kind: "work", durationMs: config.durationSec * 1000, round: 1, countsUp: false });
      break;
    case "emom":
      for (let r = 1; r <= config.rounds; r++) {
        segments.push({ kind: "work", durationMs: config.intervalSec * 1000, round: r, countsUp: false });
      }
      break;
  }
  return segments;
}

export function totalDurationMs(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.durationMs, 0);
}

export function totalRounds(segments: Segment[]): number {
  return segments.filter((s) => s.kind === "work").length;
}

/** Pure function of elapsed time, so a throttled or resumed tab can never drift. */
export function getState(segments: Segment[], elapsedMs: number): TimerState {
  const total = totalDurationMs(segments);
  const elapsed = Math.min(Math.max(elapsedMs, 0), total);
  const finished = elapsed >= total;

  let start = 0;
  let index = 0;
  for (; index < segments.length - 1; index++) {
    if (elapsed < start + segments[index].durationMs) break;
    start += segments[index].durationMs;
  }
  const segment = segments[index];
  const segmentElapsedMs = elapsed - start;
  return {
    segmentIndex: index,
    segment,
    segmentElapsedMs,
    segmentRemainingMs: segment.durationMs - segmentElapsedMs,
    totalElapsedMs: elapsed,
    totalDurationMs: total,
    round: segment.round,
    totalRounds: totalRounds(segments),
    finished,
  };
}

/** Milliseconds the big clock should show for this state. */
export function clockMs(state: TimerState): number {
  return state.segment.countsUp ? state.segmentElapsedMs : state.segmentRemainingMs;
}

/** m:ss, or h:mm:ss from one hour. Count-down values round up so 0:00 only shows at the end. */
export function formatClock(ms: number, countsUp: boolean): string {
  const clamped = Math.max(ms, 0);
  const totalSec = countsUp ? Math.floor(clamped / 1000) : Math.ceil(clamped / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const WARN_MS = 10_000;
const TICKS_MS = [3000, 2000, 1000];

/**
 * Every cue that fires in the window (fromMs, toMs]. Call it each frame with the last and current
 * elapsed time, starting from fromMs = -1 so a "go" at 0 is not missed.
 */
export function cuesBetween(segments: Segment[], fromMs: number, toMs: number): Cue[] {
  const cues: Cue[] = [];
  const total = totalDurationMs(segments);
  const inWindow = (t: number) => t > fromMs && t <= toMs;
  const push = (kind: Cue["kind"], atMs: number) => {
    if (inWindow(atMs)) cues.push({ kind, atMs });
  };

  let start = 0;
  segments.forEach((seg, i) => {
    const end = start + seg.durationMs;
    const isLast = i === segments.length - 1;

    if (seg.kind === "work") push("go", start);

    const countsDown = !seg.countsUp;
    if (countsDown) {
      for (const t of TICKS_MS) if (seg.durationMs > t) push("tick", end - t);
    }
    if (isLast && seg.durationMs > WARN_MS * 2) push("warn", end - WARN_MS);
    if (isLast) push("finish", end);
    start = end;
  });

  return cues.filter((c) => c.atMs <= total).sort((a, b) => a.atMs - b.atMs);
}
