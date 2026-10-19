import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/auth";
import { CoachForm, type SavedWorkout } from "@/components/CoachForm";
import { getCoachName } from "@/lib/coach";
import { getCoachEmail } from "@/lib/session";
import { parseConfig } from "@/lib/timer/share";
import { listWorkouts } from "@/lib/workoutQueries";

export const metadata: Metadata = { title: "Coach · Set up a workout" };

export default function CoachPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-5 sm:py-6">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <CoachContent />
      </Suspense>
    </main>
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
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-0.5 text-2xl font-bold">Set up a workout</h1>
          <p className="text-zinc-500">Configure it here, then open the link on the phone next to the rig.</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="text-sm"
        >
          <span className="mr-3 text-zinc-500">{name}</span>
          <a href="/welcome" className="mr-3 underline">
            Change name
          </a>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </div>
      <CoachForm saved={saved} />
    </>
  );
}
