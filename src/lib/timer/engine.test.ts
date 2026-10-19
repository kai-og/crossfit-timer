import { describe, expect, it } from "vitest";
import {
  buildSegments,
  clockMs,
  cuesBetween,
  formatClock,
  getState,
  totalDurationMs,
  validateConfig,
} from "./engine";
import type { WorkoutConfig } from "./types";

const forTime: WorkoutConfig = { mode: "fortime", name: "Fran", countdownSec: 10, capSec: 600 };
const amrap: WorkoutConfig = { mode: "amrap", name: "Cindy", countdownSec: 10, durationSec: 1200 };
const emom: WorkoutConfig = { mode: "emom", name: "EMOM", countdownSec: 5, intervalSec: 60, rounds: 10 };

describe("buildSegments", () => {
  it("adds a countdown only when configured", () => {
    expect(buildSegments({ ...amrap, countdownSec: 0 })).toHaveLength(1);
    expect(buildSegments(amrap)).toHaveLength(2);
  });
  it("creates one segment per EMOM round", () => {
    const segs = buildSegments(emom);
    expect(segs).toHaveLength(11);
    expect(totalDurationMs(segs)).toBe((5 + 600) * 1000);
  });
  it("counts up for For Time only", () => {
    expect(buildSegments(forTime)[1].countsUp).toBe(true);
    expect(buildSegments(amrap)[1].countsUp).toBe(false);
  });
});

describe("getState", () => {
  const segs = buildSegments(emom);
  it("starts in the countdown", () => {
    const s = getState(segs, 0);
    expect(s.segment.kind).toBe("countdown");
    expect(s.segmentRemainingMs).toBe(5000);
  });
  it("moves into round 1, then round 2 on the boundary", () => {
    expect(getState(segs, 5000).round).toBe(1);
    expect(getState(segs, 5000).segment.kind).toBe("work");
    expect(getState(segs, 65_000).round).toBe(2);
  });
  it("clamps and reports finished", () => {
    const s = getState(segs, 10 ** 9);
    expect(s.finished).toBe(true);
    expect(s.totalElapsedMs).toBe(605_000);
    expect(getState(segs, -50).totalElapsedMs).toBe(0);
  });
  it("is not finished one ms before the end", () => {
    expect(getState(segs, 604_999).finished).toBe(false);
  });
});

describe("clock formatting", () => {
  it("rounds countdowns up and count-ups down", () => {
    expect(formatClock(59_001, false)).toBe("1:00");
    expect(formatClock(59_999, true)).toBe("0:59");
    expect(formatClock(0, false)).toBe("0:00");
  });
  it("uses hours from 60 minutes", () => {
    expect(formatClock(3_600_000, true)).toBe("1:00:00");
  });
  it("shows elapsed for For Time and remaining otherwise", () => {
    const s = getState(buildSegments({ ...forTime, countdownSec: 0 }), 90_000);
    expect(formatClock(clockMs(s), true)).toBe("1:30");
    const a = getState(buildSegments({ ...amrap, countdownSec: 0 }), 90_000);
    expect(formatClock(clockMs(a), false)).toBe("18:30");
  });
});

describe("cuesBetween", () => {
  const segs = buildSegments(amrap); // 10s countdown + 20 min
  it("ticks 3-2-1 in the countdown, then go", () => {
    const cues = cuesBetween(segs, -1, 10_000);
    expect(cues.map((c) => [c.kind, c.atMs])).toEqual([
      ["tick", 7000],
      ["tick", 8000],
      ["tick", 9000],
      ["go", 10_000],
    ]);
  });
  it("warns at 10s left and finishes", () => {
    const cues = cuesBetween(segs, 1_209_000, 1_210_000);
    expect(cues).toEqual([{ kind: "finish", atMs: 1_210_000 }]);
    expect(cuesBetween(segs, 1_199_000, 1_200_000)).toEqual([{ kind: "warn", atMs: 1_200_000 }]);
  });
  it("fires each cue once across consecutive windows", () => {
    const seen: number[] = [];
    let prev = -1;
    for (let t = 0; t <= 1_210_000; t += 250) {
      seen.push(...cuesBetween(segs, prev, t).map((c) => c.atMs));
      prev = t;
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toContain(1_210_000);
  });
  it("fires go at 0 when there is no countdown", () => {
    const s = buildSegments({ ...amrap, countdownSec: 0 });
    expect(cuesBetween(s, -1, 0)).toEqual([{ kind: "go", atMs: 0 }]);
  });
  it("beeps at every EMOM interval boundary", () => {
    const s = buildSegments(emom);
    const goes = cuesBetween(s, -1, 605_000).filter((c) => c.kind === "go");
    expect(goes).toHaveLength(10);
  });
  it("skips tick and warn cues that do not fit in a short segment", () => {
    const s = buildSegments({ mode: "emom", name: "x", countdownSec: 0, intervalSec: 2, rounds: 2 });
    const ticks = cuesBetween(s, -1, 4000).filter((c) => c.kind === "tick");
    expect(ticks.map((c) => c.atMs)).toEqual([1000, 3000]);
  });
});

describe("validateConfig", () => {
  it("accepts good configs", () => {
    for (const c of [forTime, amrap, emom]) expect(validateConfig(c)).toEqual([]);
  });
  it("rejects zero, negative and fractional values", () => {
    expect(validateConfig({ ...amrap, durationSec: 0 })).not.toEqual([]);
    expect(validateConfig({ ...emom, rounds: -1 })).not.toEqual([]);
    expect(validateConfig({ ...forTime, capSec: 1.5 })).not.toEqual([]);
    expect(validateConfig({ ...forTime, countdownSec: 500 })).not.toEqual([]);
  });
});
