import { describe, expect, it } from "vitest";
import { decodeConfig, describeConfig, encodeConfig, parseConfig } from "./share";
import type { WorkoutConfig } from "./types";

const emom: WorkoutConfig = { mode: "emom", name: "Ünïcode 💪", countdownSec: 10, intervalSec: 90, rounds: 8 };

describe("share", () => {
  it("round-trips a config, including unicode names", () => {
    expect(decodeConfig(encodeConfig(emom))).toEqual(emom);
  });
  it("produces URL-safe output", () => {
    expect(encodeConfig(emom)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("returns null for garbage or missing input", () => {
    expect(decodeConfig(undefined)).toBeNull();
    expect(decodeConfig("%%%")).toBeNull();
    expect(decodeConfig(encodeConfig({ ...emom, rounds: 0 }))).toBeNull();
  });
  it("rejects unknown modes and drops extra fields", () => {
    expect(parseConfig({ mode: "tabata" })).toBeNull();
    expect(parseConfig({ ...emom, evil: "x" })).toEqual(emom);
  });
  it("describes configs", () => {
    expect(describeConfig(emom)).toBe("EMOM · 8 × 1:30");
  });
});
