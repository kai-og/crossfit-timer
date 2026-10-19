import { describe, expect, it } from "vitest";
import { newId } from "./id";
import { encodeConfig } from "./timer/share";
import type { WorkoutConfig } from "./timer/types";
import { formatCode, parseWorkoutRef, refHref } from "./workoutRef";

const config: WorkoutConfig = { mode: "amrap", name: "Cindy", countdownSec: 10, durationSec: 1200 };

describe("parseWorkoutRef", () => {
  it("reads a saved-workout link, from any origin", () => {
    expect(parseWorkoutRef("https://crossfit-timer-yaqbot.vercel.app/t?w=k7m2p9xq4r")).toEqual({
      kind: "saved",
      id: "k7m2p9xq4r",
    });
    expect(parseWorkoutRef("http://192.168.1.5:3000/t?w=k7m2p9xq4r&x=1")).toEqual({ kind: "saved", id: "k7m2p9xq4r" });
  });
  it("reads a link without a scheme", () => {
    expect(parseWorkoutRef("crossfit-timer-yaqbot.vercel.app/t?w=k7m2p9xq4r")).toEqual({
      kind: "saved",
      id: "k7m2p9xq4r",
    });
  });
  it("reads a link carrying the whole workout", () => {
    const encoded = encodeConfig(config);
    expect(parseWorkoutRef(`https://x.app/t?c=${encoded}`)).toEqual({ kind: "inline", encoded });
  });
  it("rejects a link with a broken inline workout", () => {
    expect(parseWorkoutRef("https://x.app/t?c=bm90LWpzb24")).toBeNull();
  });
  it("reads bare codes, with or without a dash or spaces", () => {
    expect(parseWorkoutRef("k7m2p9xq4r")).toEqual({ kind: "saved", id: "k7m2p9xq4r" });
    expect(parseWorkoutRef("  k7m2p-9xq4r ")).toEqual({ kind: "saved", id: "k7m2p9xq4r" });
    expect(parseWorkoutRef("k7m2p 9xq4r")).toEqual({ kind: "saved", id: "k7m2p9xq4r" });
  });
  it("keeps the case of older mixed-case ids", () => {
    expect(parseWorkoutRef("AbC123xyZ9")).toEqual({ kind: "saved", id: "AbC123xyZ9" });
  });
  it("rejects anything else", () => {
    for (const bad of ["", "   ", "hello", "k7m2p9xq4", "k7m2p9xq4rr", "https://example.com", "WIFI:S:x;;"]) {
      expect(parseWorkoutRef(bad)).toBeNull();
    }
  });
  it("does not take a longer run of characters for an id", () => {
    expect(parseWorkoutRef("https://x.app/t?w=k7m2p9xq4rZZ")).toBeNull();
  });
});

describe("helpers", () => {
  it("formats codes in two groups", () => {
    expect(formatCode("k7m2p9xq4r")).toBe("k7m2p-9xq4r");
    expect(formatCode("short")).toBe("short");
  });
  it("builds hrefs", () => {
    expect(refHref({ kind: "saved", id: "k7m2p9xq4r" })).toBe("/t?w=k7m2p9xq4r");
  });
  it("generates ids that parse back, without look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const id = newId();
      expect(id).toMatch(/^[2-9a-hjkmnp-z]{10}$/);
      expect(parseWorkoutRef(id)).toEqual({ kind: "saved", id });
    }
  });
});
