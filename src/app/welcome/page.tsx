import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCoachName, saveCoachName } from "@/lib/coach";
import { NAME_MAX } from "@/lib/displayName";
import { getCoachEmail } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome, coach" };

export default function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-16">
      <Suspense fallback={<p className="text-center text-zinc-500">Loading…</p>}>
        <WelcomeForm searchParams={searchParams} />
      </Suspense>
    </main>
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
    <>
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">{current ? "Change your name" : "Welcome, coach"}</h1>
        <p className="text-zinc-500">
          This name is shown as the creator of your workouts, on the coach page and on athletes&apos; phones.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          Enter a name between 1 and {NAME_MAX} characters.
        </p>
      )}
      <form action={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your name
          <input
            name="name"
            type="text"
            required
            maxLength={NAME_MAX}
            defaultValue={current ?? ""}
            autoComplete="name"
            autoFocus
            placeholder="e.g. Sebastián"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-3 text-lg text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
        <p className="text-xs text-zinc-500">Signed in as {email}. Your email is never shown to athletes.</p>
        <button
          type="submit"
          className="rounded-xl bg-emerald-600 px-5 py-3 text-lg font-semibold text-white hover:bg-emerald-700"
        >
          {current ? "Save name" : "Continue"}
        </button>
        {current && (
          <a href="/coach" className="text-center text-sm underline">
            Cancel
          </a>
        )}
      </form>
    </>
  );
}
