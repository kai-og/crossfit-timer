import { redirect } from "next/navigation";
import { getCoachName } from "./coach";
import { getCoachEmail } from "./session";
import type { SavedWorkout } from "./savedWorkout";
import { parseConfig } from "./timer/share";
import { listWorkouts } from "./workoutQueries";

/** Gate for the coach pages: signed in, and has chosen the name shown as the creator of their workouts. */
export async function requireCoach(): Promise<{ email: string; name: string }> {
  const email = await getCoachEmail();
  if (!email) redirect("/login");
  const name = await getCoachName(email);
  if (!name) redirect("/welcome");
  return { email, name };
}

export async function loadSavedWorkouts(): Promise<SavedWorkout[]> {
  const rows = await listWorkouts();
  return rows.flatMap((r) => {
    const config = parseConfig(r.config);
    // Coaches see the email of colleagues who have not chosen a name yet.
    return config ? [{ id: r.id, config, creator: r.creatorName ?? r.createdBy }] : [];
  });
}
