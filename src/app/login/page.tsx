import { IconBrandGoogle } from "@tabler/icons-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "@/auth";
import { AuthCard } from "@/components/AuthCard";
import { ALLOWED_DOMAIN } from "@/lib/auth-domain";

export const metadata: Metadata = { title: "Coach sign in" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <AuthCard title="Coach sign in" intro={`Only @${ALLOWED_DOMAIN} Google accounts can set up workouts.`}>
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
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-ink text-lg font-medium text-white hover:bg-black"
        >
          <IconBrandGoogle size={22} className="text-lime" aria-hidden="true" />
          Sign in with Google
        </button>
      </form>
      <p className="text-sm text-muted">
        Athletes do not need to sign in: the timer opens from the coach&apos;s QR code or link.
      </p>
    </AuthCard>
  );
}

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg border border-alert px-4 py-3 text-sm text-alert">
      {error === "AccessDenied"
        ? `That account is not allowed. Sign in with your @${ALLOWED_DOMAIN} Google account.`
        : "Sign in failed. Please try again."}
    </p>
  );
}
