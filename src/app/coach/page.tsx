import type { Metadata } from "next";
import { Suspense } from "react";
import { CoachForm } from "@/components/CoachForm";
import { CoachShell } from "@/components/CoachShell";
import { CoachSkeleton } from "@/components/CoachSkeleton";
import { SavedList } from "@/components/SavedList";
import { loadSavedWorkouts, requireCoach } from "@/lib/coachPage";
import type { SavedWorkout } from "@/lib/savedWorkout";
import { parseConfig } from "@/lib/timer/share";
import { getWorkout } from "@/lib/workoutQueries";

export const metadata: Metadata = { title: "Coach · Set up a workout" };

export default function CoachPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  return (
    <Suspense fallback={<CoachSkeleton />}>
      <CoachContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CoachContent({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { name } = await requireCoach();
  const { edit } = await searchParams;

  // ?edit=<code> opens a saved workout in the form. Loaded together with the list, not one after the other.
  const [saved, editing] = await Promise.all([loadSavedWorkouts(), edit ? getWorkout(edit) : undefined]);
  let initial: SavedWorkout | undefined;
  const config = editing && parseConfig(editing.config);
  if (editing && config) initial = { id: editing.id, config, creator: editing.creatorName ?? "" };

  return (
    <CoachShell name={name}>
      <div className="mb-4">
        <h1 className="font-display text-4xl leading-none">{initial ? "Edit workout" : "Set up a workout"}</h1>
        <p className="mt-1 text-sm text-muted">Configure it here, then scan the QR code or enter the code on the phone.</p>
      </div>
      <CoachForm key={initial?.id ?? "new"} initial={initial} />
      <section id="saved" className="-mx-3 -mb-3 mt-2 scroll-mt-4 rounded-2xl p-3">
        <SavedList saved={saved} />
      </section>
    </CoachShell>
  );
}
