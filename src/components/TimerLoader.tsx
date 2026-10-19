"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { decodeConfig } from "@/lib/timer/share";
import { TimerScreen } from "./TimerScreen";

/** Reads the workout from the URL on the client so the page shell stays static (and cacheable offline). */
export function TimerLoader() {
  const config = decodeConfig(useSearchParams().get("c") ?? undefined);
  if (!config) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center text-white">
        <h1 className="text-3xl font-bold">Workout not found</h1>
        <p className="opacity-70">This timer link is invalid or incomplete. Ask your coach for a new one.</p>
        <Link href="/coach" className="underline">
          Coach page
        </Link>
      </main>
    );
  }
  return <TimerScreen config={config} />;
}
