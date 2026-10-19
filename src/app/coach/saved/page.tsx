import type { Metadata } from "next";
import { Suspense } from "react";
import { CoachShell } from "@/components/CoachShell";
import { SavedList } from "@/components/SavedList";
import { loadSavedWorkouts, requireCoach } from "@/lib/coachPage";

export const metadata: Metadata = { title: "Coach · Saved workouts" };

export default function SavedPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <SavedContent />
    </Suspense>
  );
}

async function SavedContent() {
  const { name } = await requireCoach();
  const saved = await loadSavedWorkouts();

  return (
    <CoachShell name={name}>
      <div className="mb-4">
        <h1 className="font-display text-4xl leading-none">Saved workouts</h1>
        <p className="mt-1 text-sm text-muted">Athletes pick these on their phone, or use the code or QR code.</p>
      </div>
      <SavedList saved={saved} />
    </CoachShell>
  );
}
