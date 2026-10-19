"use client";

import { IconArrowRight, IconKeyboard, IconScan } from "@tabler/icons-react";
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

/** Bottom bar of the phone start page: scan the coach's QR code, or type the code (or paste the link). */
export function JoinWorkout() {
  const [scanning, setScanning] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
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
    <div className="sticky bottom-0 border-t border-white/10 bg-night/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur">
      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/85">
          {error}
        </p>
      )}

      {codeOpen && (
        <form onSubmit={submit} className="mb-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            placeholder="Workout code"
            aria-label="Workout code"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            className="min-w-0 flex-1 rounded-xl border border-white/30 bg-transparent px-4 py-3 text-xl text-white placeholder:text-white/40 focus:border-lime focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            aria-label="Open workout"
            className="flex w-14 items-center justify-center rounded-xl bg-lime text-ink disabled:opacity-40"
          >
            <IconArrowRight size={24} aria-hidden="true" />
          </button>
        </form>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={() => {
            setError("");
            setScanning(true);
          }}
          disabled={busy}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-lime text-lg font-medium text-ink active:brightness-90 disabled:opacity-60"
        >
          <IconScan size={22} aria-hidden="true" />
          Scan QR code
        </button>
        <button
          onClick={() => {
            setError("");
            setCodeOpen((o) => !o);
          }}
          aria-expanded={codeOpen}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 text-lg text-white active:bg-white/10"
        >
          <IconKeyboard size={22} aria-hidden="true" />
          Enter code
        </button>
      </div>

      {scanning && <QrScanner onText={onScanned} onClose={() => setScanning(false)} />}
    </div>
  );
}
