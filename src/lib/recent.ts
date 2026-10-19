import { parseConfig } from "./timer/share";
import type { WorkoutConfig } from "./timer/types";

const KEY = "recent-workouts-v2";
const MAX = 20;

export interface RecentWorkout {
  /** Set for workouts saved by a coach: reopening them fetches the latest version when online. */
  id?: string;
  config: WorkoutConfig;
  /** Display name of the coach who saved it, when known. */
  creator?: string;
}

/** Raw snapshot string, stable between reads so it works with useSyncExternalStore. */
export function readRecentRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseRecent(raw: string): RecentWorkout[] {
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.flatMap((item): RecentWorkout[] => {
      const config = parseConfig(item?.config);
      if (!config) return [];
      const id = typeof item.id === "string" ? item.id : undefined;
      const creator = typeof item.creator === "string" ? item.creator : undefined;
      return [{ id, config, creator }];
    });
  } catch {
    return [];
  }
}

export function findRecentById(id: string): RecentWorkout | null {
  return parseRecent(readRecentRaw()).find((r) => r.id === id) ?? null;
}

/** Remember a workout on this phone so it can be reopened with no connection. Most recent first, de-duplicated. */
export function rememberWorkout(config: WorkoutConfig, id?: string, creator?: string) {
  const sameConfig = JSON.stringify(config);
  const rest = parseRecent(readRecentRaw()).filter((r) =>
    id ? r.id !== id : r.id !== undefined || JSON.stringify(r.config) !== sameConfig,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify([{ id, config, creator }, ...rest].slice(0, MAX)));
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
