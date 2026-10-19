"use client";

import { useState } from "react";
import { findCachedWorkout } from "@/lib/library";
import { parseWorkoutRef, refHref, type WorkoutRef } from "@/lib/workoutRef";
import { QrScanner } from "./QrScanner";

type Resolved = { href: string } | { error: string };

/** Check a saved workout exists (trying the lowercase form too, for codes typed with a capital) before opening it. */
async function resolve(ref: WorkoutRef): Promise<Resolved> {
  if (ref.kind === "inline") return { href: refHref(ref) };

  for (const id of new Set([ref.id, ref.id.toLowerCase()])) {
    try {
      const res = await fetch(`/api/workouts/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return { href: refHref({ kind: "saved", id }) };
      if (res.status !== 404) return { error: "The server had a problem. Try again in a moment." };
    } catch {
      // No connection: a workout already opened on this phone still works.
      if (findCachedWorkout(id)) return { href: refHref({ kind: "saved", id }) };
      return { error: "No connection, and this workout has not been opened on this phone before." };
    }
  }
  return { error: "No workout found for that code. Check it and try again." };
}

/** Start a workout from inside the app: scan the coach's QR code, or type the code (or paste the link). */
export function JoinWorkout() {
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = async (ref: WorkoutRef) => {
    setBusy(true);
    setError("");
    const result = await resolve(ref);
    if ("href" in result) {
      // A full page load, so it is answered by the service worker and works offline too.
      window.location.assign(result.href);
      return;
    }
    setError(result.error);
    setBusy(false);
  };

  const onScanned = (text: string) => {
    const ref = parseWorkoutRef(text);
    if (!ref) return false;
    setScanning(false);
    void open(ref);
    return true;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = parseWorkoutRef(code);
    if (!ref) {
      setError("That does not look like a workout code. It has 10 letters and numbers.");
      return;
    }
    void open(ref);
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <button
        onClick={() => {
          setError("");
          setScanning(true);
        }}
        disabled={busy}
        className="rounded-2xl bg-emerald-500 px-6 py-4 text-xl font-bold text-black active:bg-emerald-400 disabled:opacity-60"
      >
        Scan QR code
      </button>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          placeholder="Or enter the code"
          aria-label="Workout code"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          className="min-w-0 flex-1 rounded-2xl border border-white/25 bg-black/40 px-4 py-3 text-lg text-white placeholder:text-white/50"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-lg font-semibold disabled:opacity-50"
        >
          Go
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-red-900/80 px-4 py-3 text-left text-sm">
          {error}
        </p>
      )}

      {scanning && <QrScanner onText={onScanned} onClose={() => setScanning(false)} />}
    </div>
  );
}
