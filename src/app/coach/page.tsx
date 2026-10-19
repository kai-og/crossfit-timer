import type { Metadata } from "next";
import { Suspense } from "react";
import { CoachForm } from "@/components/CoachForm";
import { CoachShell } from "@/components/CoachShell";
import { requireCoach } from "@/lib/coachPage";
import type { SavedWorkout } from "@/lib/savedWorkout";
import { parseConfig } from "@/lib/timer/share";
import { getWorkout } from "@/lib/workoutQueries";

export const metadata: Metadata = { title: "Coach · Set up a workout" };

export default function CoachPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <CoachContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CoachContent({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { name } = await requireCoach();
  const { edit } = await searchParams;

  // ?edit=<code> opens a saved workout in the form.
  let initial: SavedWorkout | undefined;
  if (edit) {
    const row = await getWorkout(edit);
    const config = row && parseConfig(row.config);
    if (row && config) initial = { id: row.id, config, creator: row.creatorName ?? "" };
  }

  return (
    <CoachShell name={name}>
      <div className="mb-4">
        <h1 className="font-display text-4xl leading-none">{initial ? "Edit workout" : "Set up a workout"}</h1>
        <p className="mt-1 text-sm text-muted">Configure it here, then scan the QR code or enter the code on the phone.</p>
      </div>
      <CoachForm key={initial?.id ?? "new"} initial={initial} />
    </CoachShell>
  );
}
