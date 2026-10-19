import { findRecentById, type RecentWorkout } from "./recent";
import { parseConfig } from "./timer/share";
import type { WorkoutConfig } from "./timer/types";

const KEY = "saved-library-v1";
const TIMEOUT_MS = 5000;

export interface LibraryItem {
  id: string;
  config: WorkoutConfig;
  /** Display name of the coach who saved it, when they have chosen one. */
  creator?: string;
}

/** Raw snapshot string, stable between reads so it works with useSyncExternalStore. */
export function readLibraryRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseLibrary(raw: string): LibraryItem[] {
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.flatMap((item): LibraryItem[] => {
      const config = parseConfig(item?.config);
      if (!config || typeof item.id !== "string") return [];
      return [{ id: item.id, config, creator: typeof item.creator === "string" ? item.creator : undefined }];
    });
  } catch {
    return [];
  }
}

export function subscribeLibrary(onChange: () => void) {
  window.addEventListener("saved-library", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("saved-library", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The phone's copy of a workout, from the saved-workouts list or from workouts it opened before. */
export function findCachedWorkout(id: string): Pick<RecentWorkout, "config" | "creator"> | null {
  return parseLibrary(readLibraryRaw()).find((w) => w.id === id) ?? findRecentById(id);
}

/**
 * Fetch the saved workouts and keep a copy on the phone, so the list (and every workout in it) still opens with no
 * signal. Resolves true when the list is fresh, false when the server could not be reached.
 */
export async function refreshLibrary(): Promise<boolean> {
  try {
    const res = await fetch("/api/workouts/public", { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return false;
    const { workouts } = (await res.json()) as { workouts?: unknown };
    const items = parseLibrary(JSON.stringify(workouts ?? []));
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("saved-library"));
    } catch {
      // Storage full or blocked: the list still shows this visit, it just is not kept for offline.
    }
    return true;
  } catch {
    return false;
  }
}
