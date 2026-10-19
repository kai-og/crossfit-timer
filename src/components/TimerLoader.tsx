"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { parseRecent, readRecentRaw, rememberWorkout, subscribeRecent } from "@/lib/recent";
import { decodeConfig, describeConfig, encodeConfig } from "@/lib/timer/share";
import { TimerScreen } from "./TimerScreen";

/** Reads the workout from the URL on the client so the page shell stays static (and cacheable offline). */
export function TimerLoader() {
  const encoded = useSearchParams().get("c") ?? undefined;
  const config = useMemo(() => decodeConfig(encoded), [encoded]);

  useEffect(() => {
    if (config) rememberWorkout(config);
  }, [config]);

  if (config) return <TimerScreen config={config} />;
  return <WorkoutPicker invalid={Boolean(encoded)} />;
}

function WorkoutPicker({ invalid }: { invalid: boolean }) {
  const raw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => "[]");
  const recent = useMemo(() => parseRecent(raw), [raw]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-zinc-950 p-6 pt-16 text-center text-white">
      <h1 className="text-3xl font-bold">{invalid ? "Workout not found" : "Pick a workout"}</h1>
      <p className="max-w-sm opacity-70">
        {invalid
          ? "This timer link is invalid or incomplete. Ask your coach for a new one, or pick a recent workout below."
          : "Scan the QR code from the coach page, or reopen a workout you used before. These work without a connection."}
      </p>
      {recent.length > 0 && (
        <ul className="flex w-full max-w-sm flex-col gap-3">
          {recent.map((c) => (
            <li key={encodeConfig(c)}>
              {/* Plain anchor on purpose: a full page load is answered by the service worker, a client-side
                  <Link> navigation would ask the server for data and fail offline. */}
              <a
                href={`/t?c=${encodeConfig(c)}`}
                className="block rounded-2xl bg-zinc-800 px-5 py-4 text-left active:bg-zinc-700"
              >
                <span className="block text-xl font-semibold">{c.name || describeConfig(c)}</span>
                <span className="block text-sm opacity-70">{describeConfig(c)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <Link href="/coach" className="text-sm underline opacity-60">
        Coach page
      </Link>
    </main>
  );
}
