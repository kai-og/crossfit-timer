import { validateConfig } from "./engine";
import type { WorkoutConfig } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Narrow unknown JSON to a valid WorkoutConfig, or null. Never trusts the input shape. */
export function parseConfig(input: unknown): WorkoutConfig | null {
  if (!isObj(input)) return null;
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 60) : "";
  const countdownSec = Number(input.countdownSec);
  let config: WorkoutConfig;
  switch (input.mode) {
    case "fortime":
      config = { mode: "fortime", name, countdownSec, capSec: Number(input.capSec) };
      break;
    case "amrap":
      config = { mode: "amrap", name, countdownSec, durationSec: Number(input.durationSec) };
      break;
    case "emom":
      config = { mode: "emom", name, countdownSec, intervalSec: Number(input.intervalSec), rounds: Number(input.rounds) };
      break;
    default:
      return null;
  }
  return validateConfig(config).length === 0 ? config : null;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Interim sharing format until workouts are saved server-side: the config travels in the URL. */
export function encodeConfig(config: WorkoutConfig): string {
  return toBase64Url(JSON.stringify(config));
}

export function decodeConfig(value: string | undefined): WorkoutConfig | null {
  if (!value) return null;
  try {
    return parseConfig(JSON.parse(fromBase64Url(value)));
  } catch {
    return null;
  }
}

export function describeConfig(config: WorkoutConfig): string {
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  switch (config.mode) {
    case "fortime":
      return `For Time · cap ${mmss(config.capSec)}`;
    case "amrap":
      return `AMRAP ${mmss(config.durationSec)}`;
    case "emom":
      return `EMOM · ${config.rounds} × ${mmss(config.intervalSec)}`;
  }
}
