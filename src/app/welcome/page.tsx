import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { getCoachName, saveCoachName } from "@/lib/coach";
import { NAME_MAX } from "@/lib/displayName";
import { getCoachEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome, coach" };

export default function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
      <WelcomeForm searchParams={searchParams} />
    </Suspense>
  );
}

async function WelcomeForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const email = await getCoachEmail();
  if (!email) redirect("/login");
  const [current, { error }] = await Promise.all([getCoachName(email), searchParams]);

  async function save(formData: FormData) {
    "use server";
    const who = await getCoachEmail();
    if (!who) redirect("/login");
    const saved = await saveCoachName(who, formData.get("name"));
    redirect(saved ? "/coach" : "/welcome?error=name");
  }

  return (
    <AuthCard
      title={current ? "Change your name" : "Welcome, coach"}
      intro="This name is shown as the creator of your workouts, on the coach page and on athletes' phones."
    >
      {error && (
        <p role="alert" className="rounded-lg border border-alert px-4 py-3 text-sm text-alert">
          Enter a name between 1 and {NAME_MAX} characters.
        </p>
      )}
      <form action={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Your name
          <input
            name="name"
            type="text"
            required
            maxLength={NAME_MAX}
            defaultValue={current ?? ""}
            autoComplete="name"
            autoFocus
            placeholder="Sebastián"
            className="rounded-lg border border-line bg-white px-3 py-3 text-lg text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
          />
        </label>
        <p className="text-xs text-muted">Signed in as {email}. Your email is never shown to athletes.</p>
        <button
          type="submit"
          className="h-12 rounded-lg bg-ink text-lg font-medium text-white hover:bg-black"
        >
          {current ? "Save name" : "Continue"}
        </button>
        {current && (
          <a href="/coach" className="text-center text-sm underline">
            Cancel
          </a>
        )}
      </form>
    </AuthCard>
  );
}
