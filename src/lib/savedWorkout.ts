import type { WorkoutConfig } from "./timer/types";

export interface SavedWorkout {
  id: string;
  config: WorkoutConfig;
  /** Display name of the coach who saved it (or their email if they have not chosen one). */
  creator: string;
}
