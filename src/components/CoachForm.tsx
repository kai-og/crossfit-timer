"use client";

import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { validateConfig } from "@/lib/timer/engine";
import { describeConfig, encodeConfig } from "@/lib/timer/share";
import { formatCode } from "@/lib/workoutRef";
import type { Mode, WorkoutConfig } from "@/lib/timer/types";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "fortime", label: "For Time", hint: "Clock counts up until the athlete finishes or the cap hits." },
  { id: "amrap", label: "AMRAP", hint: "As many rounds as possible before time runs out." },
  { id: "emom", label: "EMOM", hint: "Every interval, for a number of rounds." },
];

interface Form {
  mode: Mode;
  name: string;
  countdownSec: number;
  capMin: number;
  capSec: number;
  durMin: number;
  durSec: number;
  intMin: number;
  intSec: number;
  rounds: number;
}

const INITIAL: Form = {
  mode: "amrap",
  name: "",
  countdownSec: 10,
  capMin: 12,
  capSec: 0,
  durMin: 12,
  durSec: 0,
  intMin: 1,
  intSec: 0,
  rounds: 10,
};

function toConfig(f: Form): WorkoutConfig {
  const base = { name: f.name.trim(), countdownSec: f.countdownSec };
  switch (f.mode) {
    case "fortime":
      return { mode: "fortime", ...base, capSec: f.capMin * 60 + f.capSec };
    case "amrap":
      return { mode: "amrap", ...base, durationSec: f.durMin * 60 + f.durSec };
    case "emom":
      return { mode: "emom", ...base, intervalSec: f.intMin * 60 + f.intSec, rounds: f.rounds };
  }
}

export interface SavedWorkout {
  id: string;
  config: WorkoutConfig;
  /** Display name of the coach who saved it (or their email if they have not chosen one). */
  creator: string;
}

function fromConfig(c: WorkoutConfig): Form {
  const f: Form = { ...INITIAL, mode: c.mode, name: c.name, countdownSec: c.countdownSec };
  switch (c.mode) {
    case "fortime":
      return { ...f, capMin: Math.floor(c.capSec / 60), capSec: c.capSec % 60 };
    case "amrap":
      return { ...f, durMin: Math.floor(c.durationSec / 60), durSec: c.durationSec % 60 };
    case "emom":
      return { ...f, intMin: Math.floor(c.intervalSec / 60), intSec: c.intervalSec % 60, rounds: c.rounds };
  }
}

function NumberField({
  label,
  value,
  onChange,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Math.trunc(Number(e.target.value)))}
          className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-lg text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {suffix && <span className="font-normal text-zinc-500">{suffix}</span>}
      </span>
    </label>
  );
}

export function CoachForm({ saved }: { saved: SavedWorkout[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [qrState, setQrState] = useState({ url: "", data: "" });
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const config = useMemo(() => toConfig(form), [form]);
  const errors = useMemo(() => validateConfig(config), [config]);
  const valid = errors.length === 0;
  const dirty = JSON.stringify(config) !== savedJson;
  // A saved workout gets a short link; edits not yet saved fall back to a link carrying the full config.
  const path = !valid ? "" : editingId && !dirty ? `/t?w=${editingId}` : `/t?c=${encodeConfig(config)}`;
  const url = origin && path ? origin + path : "";

  useEffect(() => {
    let cancelled = false;
    if (!url) return;
    QRCode.toDataURL(url, { margin: 1, width: 360 }).then((data) => {
      if (!cancelled) setQrState({ url, data });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(editingId ? `/api/workouts/${editingId}` : "/api/workouts", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Your session expired. Sign in again." : "Could not save. Try again.");
      const { workout } = (await res.json()) as { workout: { id: string } };
      setEditingId(workout.id);
      setSavedJson(JSON.stringify(config));
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const load = (w: SavedWorkout) => {
    const f = fromConfig(w.config);
    setForm(f);
    setEditingId(w.id);
    setSavedJson(JSON.stringify(toConfig(f)));
    setSaveError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNew = () => {
    setForm(INITIAL);
    setEditingId(null);
    setSavedJson("");
    setSaveError("");
  };

  const remove = async (w: SavedWorkout) => {
    if (!window.confirm(`Delete "${w.config.name || describeConfig(w.config)}"? Its link and QR code will stop working.`)) return;
    const res = await fetch(`/api/workouts/${w.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) return setSaveError("Could not delete. Try again.");
    if (editingId === w.id) startNew();
    router.refresh();
  };

  const copyLink = async (id: string) => {
    await navigator.clipboard.writeText(`${origin}/t?w=${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const qr = qrState.url === url ? qrState.data : "";
  const mode = MODES.find((m) => m.id === form.mode)!;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Mode</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={form.mode === m.id}
                onClick={() => set("mode", m.id)}
                className={`rounded-xl border px-3 py-3 text-lg font-semibold ${
                  form.mode === m.id
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-zinc-500">{mode.hint}</p>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Workout name (optional)
          <input
            type="text"
            maxLength={60}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Fran, Cindy, Monday strength"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-lg text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <div className="flex flex-wrap gap-6">
          {form.mode === "fortime" && (
            <>
              <NumberField label="Time cap" value={form.capMin} onChange={(n) => set("capMin", n)} max={240} suffix="min" />
              <NumberField label="&nbsp;" value={form.capSec} onChange={(n) => set("capSec", n)} max={59} suffix="sec" />
            </>
          )}
          {form.mode === "amrap" && (
            <>
              <NumberField label="Duration" value={form.durMin} onChange={(n) => set("durMin", n)} max={240} suffix="min" />
              <NumberField label="&nbsp;" value={form.durSec} onChange={(n) => set("durSec", n)} max={59} suffix="sec" />
            </>
          )}
          {form.mode === "emom" && (
            <>
              <NumberField label="Every" value={form.intMin} onChange={(n) => set("intMin", n)} max={60} suffix="min" />
              <NumberField label="&nbsp;" value={form.intSec} onChange={(n) => set("intSec", n)} max={59} suffix="sec" />
              <NumberField label="For" value={form.rounds} onChange={(n) => set("rounds", n)} max={200} suffix="rounds" />
            </>
          )}
          <NumberField
            label="Get-ready countdown"
            value={form.countdownSec}
            onChange={(n) => set("countdownSec", n)}
            max={60}
            suffix="sec"
          />
        </div>

        {errors.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-red-600" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </form>

      <aside className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <p className="truncate text-xl font-semibold">{config.name || "Untitled workout"}</p>
          <p className="text-zinc-600 dark:text-zinc-400">{valid ? describeConfig(config) : "Fix the errors to continue"}</p>
        </div>

        {valid && qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt="QR code for the timer link"
            // Shrinks on short screens so the page still fits without scrolling.
            style={{ width: "min(180px, 26vh)", height: "auto", aspectRatio: "1" }}
            className="self-center rounded-lg bg-white"
          />
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!valid || saving || (editingId !== null && !dirty)}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-lg font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {saving ? "Saving…" : editingId ? (dirty ? "Update saved workout" : "Saved ✓") : "Save workout"}
          </button>
          {saveError && (
            <p role="alert" className="text-sm text-red-600">
              {saveError}
            </p>
          )}
          {editingId && (
            <button type="button" onClick={startNew} className="text-sm underline">
              Start a new workout
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
          <a
            href={valid ? path : undefined}
            target="_blank"
            rel="noopener"
            aria-disabled={!valid}
            className={`rounded-xl px-3 py-2.5 text-center font-semibold text-white ${
              valid ? "bg-emerald-600 hover:bg-emerald-700" : "pointer-events-none bg-zinc-400"
            }`}
          >
            Open timer
          </a>
          <button
            type="button"
            onClick={copy}
            disabled={!valid}
            className="rounded-xl border border-zinc-300 px-3 py-2.5 font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          </div>
          {editingId && !dirty ? (
            <p className="text-center text-sm text-zinc-500">
              Code: <span className="font-mono text-base font-semibold text-zinc-800 dark:text-zinc-200">{formatCode(editingId)}</span>
            </p>
          ) : null}
          <p className="text-xs text-zinc-500">Scan the QR code (or enter the code) on the phone, then tap START.</p>
        </div>
      </aside>

      <section className="md:col-span-2">
        {saved.length === 0 ? (
          <p className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Saved workouts:</span> nothing yet. Save one to
            get a short link and QR code.
          </p>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-semibold">Saved workouts</h2>
            <ul className="flex flex-col gap-2">
              {saved.map((w) => (
                <li
                  key={w.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    w.id === editingId ? "border-emerald-600" : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{w.config.name || "Untitled workout"}</p>
                    <p className="text-sm text-zinc-500">
                      {describeConfig(w.config)} · code <span className="font-mono">{formatCode(w.id)}</span> · by {w.creator}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button type="button" onClick={() => load(w)} className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => copyLink(w.id)} className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700">
                      {copiedId === w.id ? "Copied!" : "Copy link"}
                    </button>
                    <a href={`/t?w=${w.id}`} target="_blank" rel="noopener" className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700">
                      Open
                    </a>
                    <button type="button" onClick={() => remove(w)} className="rounded-lg border border-red-300 px-3 py-2 text-red-700 dark:border-red-900 dark:text-red-300">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
