"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { findRecentById, parseRecent, readRecentRaw, rememberWorkout, subscribeRecent } from "@/lib/recent";
import { decodeConfig, describeConfig, encodeConfig, parseConfig } from "@/lib/timer/share";
import type { WorkoutConfig } from "@/lib/timer/types";
import { InstallHint } from "./InstallHint";
import { TimerScreen } from "./TimerScreen";

/** How long to wait for the server before falling back to the copy saved on this phone (gym Wi-Fi is bad). */
const FETCH_TIMEOUT_MS = 4000;

/** Reads the workout from the URL on the client so the page shell stays static (and cacheable offline). */
export function TimerLoader() {
  const params = useSearchParams();
  const savedId = params.get("w");
  if (savedId) return <SavedWorkout key={savedId} id={savedId} />;
  return <InlineWorkout encoded={params.get("c") ?? undefined} />;
}

/** Workout carried in the URL itself (unsaved preview link). */
function InlineWorkout({ encoded }: { encoded?: string }) {
  const config = useMemo(() => decodeConfig(encoded), [encoded]);

  useEffect(() => {
    if (config) rememberWorkout(config);
  }, [config]);

  if (config) return <TimerScreen config={config} />;
  return <WorkoutPicker message={encoded ? "invalid" : "pick"} />;
}

type Loaded =
  | { status: "ok"; config: WorkoutConfig; fromCache: boolean }
  | { status: "missing" }
  | { status: "unavailable" };

/** Workout saved by a coach: fetched by id, with the phone's own copy as the offline fallback. */
function SavedWorkout({ id }: { id: string }) {
  const [result, setResult] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    const finish = (r: Loaded) => {
      if (!cancelled) setResult(r);
    };
    fetch(`/api/workouts/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      .then(async (res) => {
        if (res.status === 404) return finish({ status: "missing" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const config = parseConfig(((await res.json()) as { config?: unknown }).config);
        if (!config) throw new Error("bad payload");
        rememberWorkout(config, id);
        finish({ status: "ok", config, fromCache: false });
      })
      .catch(() => {
        const cached = findRecentById(id);
        finish(cached ? { status: "ok", config: cached, fromCache: true } : { status: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!result) return <main className="fixed inset-0 flex items-center justify-center bg-zinc-950 text-white/60">Loading workout…</main>;
  if (result.status === "ok") return <TimerScreen config={result.config} />;
  return <WorkoutPicker message={result.status === "missing" ? "missing" : "unavailable"} />;
}

const MESSAGES = {
  pick: ["Pick a workout", "Scan the QR code from the coach page, or reopen a workout you used before. These work without a connection."],
  invalid: ["Workout not found", "This timer link is invalid or incomplete. Ask your coach for a new one, or pick a recent workout below."],
  missing: ["Workout not found", "The coach may have deleted this workout. Ask for a new link, or pick a recent workout below."],
  unavailable: ["Can't load this workout", "No connection, and this workout has not been opened on this phone before. Connect once to load it, or pick a recent workout below."],
} as const;

function WorkoutPicker({ message }: { message: keyof typeof MESSAGES }) {
  const raw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => "[]");
  const recent = useMemo(() => parseRecent(raw), [raw]);
  const [title, body] = MESSAGES[message];

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-zinc-950 p-6 pt-16 text-center text-white">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-sm opacity-70">{body}</p>
      <InstallHint className="w-full max-w-sm" />
      {recent.length > 0 && (
        <ul className="flex w-full max-w-sm flex-col gap-3">
          {recent.map((r) => {
            const href = r.id ? `/t?w=${r.id}` : `/t?c=${encodeConfig(r.config)}`;
            return (
              <li key={href}>
                {/* Plain anchor on purpose: a full page load is answered by the service worker, a client-side
                    <Link> navigation would ask the server for data and fail offline. */}
                <a href={href} className="block rounded-2xl bg-zinc-800 px-5 py-4 text-left active:bg-zinc-700">
                  <span className="block text-xl font-semibold">{r.config.name || describeConfig(r.config)}</span>
                  <span className="block text-sm opacity-70">{describeConfig(r.config)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
