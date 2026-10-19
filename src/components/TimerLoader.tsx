"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  findCachedWorkout,
  parseLibrary,
  readLibraryRaw,
  refreshLibrary,
  subscribeLibrary,
} from "@/lib/library";
import { parseRecent, readRecentRaw, rememberWorkout, subscribeRecent } from "@/lib/recent";
import { decodeConfig, describeConfig, encodeConfig, parseConfig } from "@/lib/timer/share";
import type { WorkoutConfig } from "@/lib/timer/types";
import { InstallHint } from "./InstallHint";
import { JoinWorkout } from "./JoinWorkout";
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
  | { status: "ok"; config: WorkoutConfig; creator?: string }
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
        const body = (await res.json()) as { config?: unknown; creator?: unknown };
        const config = parseConfig(body.config);
        if (!config) throw new Error("bad payload");
        const creator = typeof body.creator === "string" ? body.creator : undefined;
        rememberWorkout(config, id, creator);
        finish({ status: "ok", config, creator });
      })
      .catch(() => {
        const cached = findCachedWorkout(id);
        finish(cached ? { status: "ok", ...cached } : { status: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!result) return <main className="fixed inset-0 flex items-center justify-center bg-zinc-950 text-white/60">Loading workout…</main>;
  if (result.status === "ok") return <TimerScreen config={result.config} creator={result.creator} />;
  return <WorkoutPicker message={result.status === "missing" ? "missing" : "unavailable"} />;
}

const MESSAGES = {
  pick: ["Start a workout", "Pick a saved workout, scan the coach's QR code, or enter its code. Workouts you have opened work without a connection."],
  invalid: ["Workout not found", "This timer link is invalid or incomplete. Pick a workout below, or scan or enter a new code."],
  missing: ["Workout not found", "The coach may have deleted this workout. Pick another below, or scan or enter a new code."],
  unavailable: ["Can't load this workout", "No connection, and this workout has not been opened on this phone before. Connect once to load it, or pick another below."],
} as const;

type Entry = { key: string; href: string; config: WorkoutConfig; creator?: string };

function WorkoutList({ title, entries }: { title: string; entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="flex w-full max-w-sm flex-col gap-3 text-left">
      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide opacity-60">{title}</h2>
      <ul className="flex flex-col gap-3">
        {entries.map((e) => (
          <li key={e.key}>
            {/* Plain anchor on purpose: a full page load is answered by the service worker, a client-side
                <Link> navigation would ask the server for data and fail offline. */}
            <a href={e.href} className="block rounded-2xl bg-zinc-800 px-5 py-4 active:bg-zinc-700">
              <span className="block text-xl font-semibold">{e.config.name || describeConfig(e.config)}</span>
              <span className="block text-sm opacity-70">
                {describeConfig(e.config)}
                {e.creator ? ` · by ${e.creator}` : ""}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WorkoutPicker({ message }: { message: keyof typeof MESSAGES }) {
  const [title, body] = MESSAGES[message];

  const libraryRaw = useSyncExternalStore(subscribeLibrary, readLibraryRaw, () => "[]");
  const library = useMemo(() => parseLibrary(libraryRaw), [libraryRaw]);
  const recentRaw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => "[]");
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);

  // undefined until the first refresh finishes, then whether the list is fresh.
  const [fresh, setFresh] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void refreshLibrary().then((ok) => {
      if (!cancelled) setFresh(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const savedEntries: Entry[] = library.map((w) => ({ key: w.id, href: `/t?w=${w.id}`, config: w.config, creator: w.creator }));
  const inLibrary = new Set(library.map((w) => w.id));
  // Recent workouts that are already in the saved list would just be duplicates.
  const recentEntries: Entry[] = recent
    .filter((r) => !(r.id && inLibrary.has(r.id)))
    .map((r) => {
      const href = r.id ? `/t?w=${r.id}` : `/t?c=${encodeConfig(r.config)}`;
      return { key: href, href, config: r.config, creator: r.creator };
    });

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-zinc-950 p-6 pt-16 text-center text-white">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="max-w-sm opacity-70">{body}</p>
      <InstallHint className="w-full max-w-sm" />
      <JoinWorkout />
      <WorkoutList title="Saved workouts" entries={savedEntries} />
      {savedEntries.length === 0 && fresh === undefined && <p className="text-sm opacity-60">Loading saved workouts…</p>}
      {savedEntries.length === 0 && fresh === true && (
        <p className="text-sm opacity-60">No saved workouts yet. Ask a coach to save one.</p>
      )}
      {fresh === false && (
        <p className="max-w-sm text-sm opacity-60">
          {savedEntries.length > 0
            ? "Offline: showing the list from your last visit."
            : "Could not load saved workouts. Check your connection."}
        </p>
      )}
      <WorkoutList title="Recent on this phone" entries={recentEntries} />
    </main>
  );
}
