export type Mode = "fortime" | "amrap" | "emom";

interface BaseConfig {
  name: string;
  /** Get-ready countdown before the workout starts, in seconds. */
  countdownSec: number;
}

export interface ForTimeConfig extends BaseConfig {
  mode: "fortime";
  /** Time cap in seconds. The clock counts up until the cap. */
  capSec: number;
}

export interface AmrapConfig extends BaseConfig {
  mode: "amrap";
  durationSec: number;
}

export interface EmomConfig extends BaseConfig {
  mode: "emom";
  /** Length of each interval in seconds (60 = every minute). */
  intervalSec: number;
  rounds: number;
}

export type WorkoutConfig = ForTimeConfig | AmrapConfig | EmomConfig;

export type SegmentKind = "countdown" | "work";

/** One continuous stretch of the session. A workout is a list of these. */
export interface Segment {
  kind: SegmentKind;
  durationMs: number;
  /** 1-based round for EMOM, otherwise 1. */
  round: number;
  /** True when the clock should show elapsed time instead of remaining. */
  countsUp: boolean;
}

export interface TimerState {
  segmentIndex: number;
  segment: Segment;
  segmentElapsedMs: number;
  segmentRemainingMs: number;
  totalElapsedMs: number;
  totalDurationMs: number;
  round: number;
  totalRounds: number;
  finished: boolean;
}

export type CueKind = "tick" | "go" | "warn" | "finish";

export interface Cue {
  kind: CueKind;
  /** Offset from the start of the session, in ms. */
  atMs: number;
}
