import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CoachForm, type SavedWorkout } from "@/components/CoachForm";
import { CoachShell } from "@/components/CoachShell";
import { getCoachName } from "@/lib/coach";
import { getCoachEmail } from "@/lib/session";
import { parseConfig } from "@/lib/timer/share";
import { listWorkouts } from "@/lib/workoutQueries";

export const metadata: Metadata = { title: "Coach · Set up a workout" };

export default function CoachPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <CoachContent />
    </Suspense>
  );
}

async function CoachContent() {
  const email = await getCoachEmail();
  if (!email) redirect("/login");

  // New coaches choose the name shown as the creator of their workouts before anything else.
  const name = await getCoachName(email);
  if (!name) redirect("/welcome");

  const rows = await listWorkouts();
  const saved: SavedWorkout[] = rows.flatMap((r) => {
    const config = parseConfig(r.config);
    // Coaches see the email of colleagues who have not chosen a name yet.
    return config ? [{ id: r.id, config, creator: r.creatorName ?? r.createdBy }] : [];
  });

  return (
    <CoachShell name={name}>
      <div className="mb-4">
        <h1 className="font-display text-4xl leading-none">Set up a workout</h1>
        <p className="mt-1 text-sm text-muted">Configure it here, then open the link on the phone next to the rig.</p>
      </div>
      <CoachForm saved={saved} />
    </CoachShell>
  );
}
