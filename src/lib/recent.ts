import { parseConfig } from "./timer/share";
import type { WorkoutConfig } from "./timer/types";

const KEY = "recent-workouts-v1";
const MAX = 10;

/** Raw snapshot string, stable between reads so it works with useSyncExternalStore. */
export function readRecentRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseRecent(raw: string): WorkoutConfig[] {
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map(parseConfig).filter((c): c is WorkoutConfig => c !== null);
  } catch {
    return [];
  }
}

/** Remember a workout on this phone so it can be reopened with no connection. Most recent first, de-duplicated. */
export function rememberWorkout(config: WorkoutConfig) {
  const key = JSON.stringify(config);
  const rest = parseRecent(readRecentRaw()).filter((c) => JSON.stringify(c) !== key);
  try {
    localStorage.setItem(KEY, JSON.stringify([config, ...rest].slice(0, MAX)));
    window.dispatchEvent(new Event("recent-workouts"));
  } catch {
    // Storage full or blocked (private mode): the timer still works, it just won't be remembered.
  }
}

export function subscribeRecent(onChange: () => void) {
  window.addEventListener("recent-workouts", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("recent-workouts", onChange);
    window.removeEventListener("storage", onChange);
  };
}
