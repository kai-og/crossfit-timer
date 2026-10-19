import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/auth";
import { CoachForm, type SavedWorkout } from "@/components/CoachForm";
import { getDb, schema } from "@/db";
import { getCoachEmail } from "@/lib/session";
import { parseConfig } from "@/lib/timer/share";

export const metadata: Metadata = { title: "Coach · Set up a workout" };

export default function CoachPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:py-12">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <CoachContent />
      </Suspense>
    </main>
  );
}

async function CoachContent() {
  const email = await getCoachEmail();
  if (!email) redirect("/login");

  const rows = await getDb().select().from(schema.workouts).orderBy(desc(schema.workouts.updatedAt));
  const saved: SavedWorkout[] = rows.flatMap((r) => {
    const config = parseConfig(r.config);
    return config ? [{ id: r.id, config, createdBy: r.createdBy }] : [];
  });

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-bold">Set up a workout</h1>
          <p className="text-zinc-500">Configure it here, then open the link on the phone next to the rig.</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="text-sm"
        >
          <span className="mr-3 text-zinc-500">{email}</span>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </div>
      <CoachForm saved={saved} />
    </>
  );
}
