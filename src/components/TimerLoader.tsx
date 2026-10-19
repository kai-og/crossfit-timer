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
import { usePagePaint } from "@/lib/usePagePaint";
import { TimerScreen } from "./TimerScreen";
import { TimerSkeleton } from "./TimerSkeleton";

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

type View =
  | { status: "loading" }
  | { status: "ok"; config: WorkoutConfig; creator?: string }
  | { status: "missing" }
  | { status: "unavailable" };

const sameView = (a: View, b: View) =>
  a.status === b.status &&
  (a.status !== "ok" || (b.status === "ok" && a.creator === b.creator && JSON.stringify(a.config) === JSON.stringify(b.config)));

/**
 * Workout saved by a coach. If this phone already has a copy it starts instantly from that, and the server is asked in
 * the background for the latest version; only a workout never seen before waits for the network.
 */
function SavedWorkout({ id }: { id: string }) {
  const [view, setView] = useState<View>(() => {
    const cached = findCachedWorkout(id);
    return cached ? { status: "ok", config: cached.config, creator: cached.creator } : { status: "loading" };
  });

  useEffect(() => {
    let cancelled = false;
    // Keep the current object when nothing changed, so a running timer is never disturbed.
    const apply = (next: View) => {
      if (!cancelled) setView((prev) => (sameView(prev, next) ? prev : next));
    };
    fetch(`/api/workouts/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      .then(async (res) => {
        if (res.status === 404) return apply({ status: "missing" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { config?: unknown; creator?: unknown };
        const config = parseConfig(body.config);
        if (!config) throw new Error("bad payload");
        const creator = typeof body.creator === "string" ? body.creator : undefined;
        rememberWorkout(config, id, creator);
        apply({ status: "ok", config, creator });
      })
      .catch(() => {
        // Offline or slow: keep what is on screen, or say so if there was nothing to show.
        if (!cancelled) setView((prev) => (prev.status === "loading" ? { status: "unavailable" } : prev));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (view.status === "loading") return <TimerSkeleton />;
  if (view.status === "ok") return <TimerScreen config={view.config} creator={view.creator} />;
  return <WorkoutPicker message={view.status === "missing" ? "missing" : "unavailable"} />;
}

const NOTICES: Record<"invalid" | "missing" | "unavailable", string> = {
  invalid: "This timer link is invalid or incomplete. Pick a workout below, or scan or enter a new code.",
  missing: "That workout was not found. The coach may have deleted it. Pick another below, or scan a new code.",
  unavailable:
    "No connection, and this workout has not been opened on this phone before. Connect once to load it, or pick another below.",
};

type Entry = { key: string; href: string; config: WorkoutConfig; creator?: string };

function WorkoutList({ title, entries }: { title: string; entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="mt-2 text-sm text-white/55">{title}</h2>
      <ul className="flex flex-col gap-2.5">
        {entries.map((e) => (
          <li key={e.key}>
            {/* Plain anchor on purpose: a full page load is answered by the service worker, a client-side
                <Link> navigation would ask the server for data and fail offline. */}
            <a
              href={e.href}
              className="block rounded-l-sm rounded-r-xl border-l-4 border-lime bg-[#1a1c21] px-4 py-3 active:bg-[#23262c]"
            >
              <span className="font-display block text-2xl leading-tight">{e.config.name || describeConfig(e.config)}</span>
              <span className="block text-sm text-white/60">
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

function WorkoutPicker({ message }: { message: "pick" | keyof typeof NOTICES }) {
  usePagePaint("#101114");

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
    <main className="flex min-h-dvh flex-col bg-night text-white">
      <div className="flex flex-1 flex-col gap-4 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-6">
        <h1 className="font-display mt-4 text-5xl leading-none">Workouts</h1>
        {message !== "pick" && (
          <p role="alert" className="rounded-xl border border-white/20 px-4 py-3 text-sm text-white/80">
            {NOTICES[message]}
          </p>
        )}
        <InstallHint />
        <WorkoutList title="Saved workouts" entries={savedEntries} />
        {savedEntries.length === 0 && fresh === undefined && <p className="text-sm text-white/55">Loading saved workouts…</p>}
        {savedEntries.length === 0 && fresh === true && (
          <p className="text-sm text-white/55">No saved workouts yet. Scan a coach&apos;s QR code or enter its code below.</p>
        )}
        {fresh === false && (
          <p className="text-sm text-white/55">
            {savedEntries.length > 0
              ? "Offline: showing the list from your last visit."
              : "Could not load saved workouts. Check your connection."}
          </p>
        )}
        <WorkoutList title="Recent on this phone" entries={recentEntries} />
      </div>
      <JoinWorkout />
    </main>
  );
}
