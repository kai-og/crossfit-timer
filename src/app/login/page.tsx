import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "@/auth";
import { ALLOWED_DOMAIN } from "@/lib/auth-domain";

export const metadata: Metadata = { title: "Coach sign in" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-16 text-center">
      <h1 className="text-3xl font-bold">Coach sign in</h1>
      <p className="text-zinc-500">Only @{ALLOWED_DOMAIN} Google accounts can set up workouts.</p>
      <Suspense>
        <LoginError searchParams={searchParams} />
      </Suspense>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/coach" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-5 py-4 text-lg font-semibold text-white hover:bg-emerald-700"
        >
          Sign in with Google
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        Athletes do not need to sign in: the timer opens from the coach&apos;s QR code or link.
      </p>
    </main>
  );
}

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
      {error === "AccessDenied"
        ? `That account is not allowed. Sign in with your @${ALLOWED_DOMAIN} Google account.`
        : "Sign in failed. Please try again."}
    </p>
  );
}
