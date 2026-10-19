"use client";

import {
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconExternalLink,
  IconFlame,
  IconInfinity,
  IconPencil,
  IconRepeat,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { startClock, validateConfig } from "@/lib/timer/engine";
import { describeConfig, encodeConfig } from "@/lib/timer/share";
import type { Mode, WorkoutConfig } from "@/lib/timer/types";
import { formatCode } from "@/lib/workoutRef";

const MODES: { id: Mode; label: string; hint: string; Icon: typeof IconFlame }[] = [
  { id: "fortime", label: "For time", hint: "The clock counts up until the athlete finishes or the cap hits.", Icon: IconFlame },
  { id: "amrap", label: "AMRAP", hint: "As many rounds as possible before time runs out.", Icon: IconInfinity },
  { id: "emom", label: "EMOM", hint: "Every interval, for a number of rounds.", Icon: IconRepeat },
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

const card = "rounded-xl border border-line bg-white p-4";
const control =
  "rounded-lg border border-line bg-white px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime";
const iconButton =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink hover:border-ink hover:bg-paper";

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
  suffix: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-muted">
      {label}
      <span className="relative block">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Math.trunc(Number(e.target.value)))}
          className={`${control} w-24 pr-11`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>
      </span>
    </label>
  );
}

/** A small phone showing what the athlete will see before pressing start. */
function PhonePreview({ config, valid }: { config: WorkoutConfig; valid: boolean }) {
  return (
    <div className="rounded-[18px] bg-black p-1" style={{ width: 104 }} aria-hidden="true">
      <div className="flex h-[148px] flex-col items-center justify-center gap-1.5 rounded-[14px] bg-night px-1 text-white">
        <span className="font-display max-w-full truncate text-xs text-white/70">{config.name || "Workout"}</span>
        <span className="font-display text-4xl leading-none text-white/90">{valid ? startClock(config) : "--:--"}</span>
        <span className="h-1 w-14 rounded-full bg-lime" />
      </div>
    </div>
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
    QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#14161a", light: "#ffffff" } }).then((data) => {
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
  const isSaved = editingId !== null && !dirty;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_248px]">
      <form className="flex min-w-0 flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <fieldset className={card}>
          <legend className="sr-only">Mode</legend>
          <p className="mb-2 text-xs text-muted">1. Mode</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mode">
            {MODES.map(({ id, label, Icon }) => {
              const selected = form.mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => set("mode", id)}
                  className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left text-base transition-colors ${
                    selected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"
                  }`}
                >
                  <Icon size={20} className={selected ? "text-lime" : "text-ink"} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-muted">{mode.hint}</p>
        </fieldset>

        <fieldset className={card}>
          <legend className="sr-only">Settings</legend>
          <p className="mb-2 text-xs text-muted">2. Settings</p>
          <label className="mb-3 flex flex-col gap-1.5 text-xs text-muted">
            Workout name (optional)
            <input
              type="text"
              maxLength={60}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Fran, Cindy, Monday strength"
              className={`${control} w-full`}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            {form.mode === "fortime" && (
              <>
                <NumberField label="Time cap" value={form.capMin} onChange={(n) => set("capMin", n)} max={240} suffix="min" />
                <NumberField label="Cap seconds" value={form.capSec} onChange={(n) => set("capSec", n)} max={59} suffix="sec" />
              </>
            )}
            {form.mode === "amrap" && (
              <>
                <NumberField label="Duration" value={form.durMin} onChange={(n) => set("durMin", n)} max={240} suffix="min" />
                <NumberField label="Duration seconds" value={form.durSec} onChange={(n) => set("durSec", n)} max={59} suffix="sec" />
              </>
            )}
            {form.mode === "emom" && (
              <>
                <NumberField label="Every" value={form.intMin} onChange={(n) => set("intMin", n)} max={60} suffix="min" />
                <NumberField label="Every seconds" value={form.intSec} onChange={(n) => set("intSec", n)} max={59} suffix="sec" />
                <NumberField label="For" value={form.rounds} onChange={(n) => set("rounds", n)} max={200} suffix="rounds" />
              </>
            )}
            <NumberField
              label="Get ready"
              value={form.countdownSec}
              onChange={(n) => set("countdownSec", n)}
              max={60}
              suffix="sec"
            />
          </div>
          {errors.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-alert" role="alert">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!valid || saving || isSaved}
            className="flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-base font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {isSaved ? <IconCheck size={20} aria-hidden="true" /> : <IconDeviceFloppy size={20} aria-hidden="true" />}
            {saving ? "Saving…" : editingId ? (dirty ? "Update saved workout" : "Saved") : "Save workout"}
          </button>
          <a
            href={valid ? path : undefined}
            target="_blank"
            rel="noopener"
            aria-disabled={!valid}
            className={`flex h-11 items-center gap-2 rounded-lg border border-ink px-4 text-base hover:bg-white ${
              valid ? "" : "pointer-events-none opacity-40"
            }`}
          >
            <IconExternalLink size={20} aria-hidden="true" />
            Open timer
          </a>
          <button
            type="button"
            onClick={copy}
            disabled={!valid}
            className="flex h-11 items-center gap-2 rounded-lg border border-ink px-4 text-base hover:bg-white disabled:opacity-40"
          >
            {copied ? <IconCheck size={20} aria-hidden="true" /> : <IconCopy size={20} aria-hidden="true" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          {editingId && (
            <button type="button" onClick={startNew} className="px-2 text-sm underline">
              Start a new workout
            </button>
          )}
        </div>
        {saveError && (
          <p role="alert" className="text-sm text-alert">
            {saveError}
          </p>
        )}
      </form>

      <aside className="flex flex-row items-start gap-3 lg:flex-col lg:items-center" aria-label="Preview and QR code">
        <PhonePreview config={config} valid={valid} />
        <div className={`${card} flex w-full flex-col items-center gap-2 p-3`}>
          {valid && qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code for the timer link" width={104} height={104} className="rounded-md" />
          ) : (
            <div className="h-[104px] w-[104px] rounded-md bg-paper" aria-hidden="true" />
          )}
          {isSaved ? (
            <p className="text-sm text-muted">
              Code <span className="font-mono text-ink">{formatCode(editingId)}</span>
            </p>
          ) : (
            <p className="text-center text-xs text-muted">Save to get a short code. This QR works already.</p>
          )}
        </div>
      </aside>

      <section id="saved" className="scroll-mt-4 lg:col-span-2">
        {saved.length === 0 ? (
          <p className="text-sm text-muted">
            <span className="text-ink">Saved workouts:</span> nothing yet. Save one to get a short link and QR code.
          </p>
        ) : (
          <>
            <h2 className="mb-2 text-sm text-muted">Saved workouts</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {saved.map((w) => (
                <li
                  key={w.id}
                  className={`flex flex-col gap-2 rounded-xl border bg-white p-3 ${
                    w.id === editingId ? "border-ink" : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display truncate text-2xl leading-none">{w.config.name || "Untitled workout"}</p>
                    <span className="shrink-0 rounded-md bg-paper px-2 py-0.5 text-xs">
                      {w.config.mode === "fortime" ? "For time" : w.config.mode === "amrap" ? "AMRAP" : "EMOM"}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {describeConfig(w.config)} · by {w.creator} · <span className="font-mono">{formatCode(w.id)}</span>
                  </p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => load(w)} aria-label="Edit" title="Edit" className={iconButton}>
                      <IconPencil size={18} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => copyLink(w.id)} aria-label="Copy link" title="Copy link" className={iconButton}>
                      {copiedId === w.id ? <IconCheck size={18} aria-hidden="true" /> : <IconCopy size={18} aria-hidden="true" />}
                    </button>
                    <a
                      href={`/t?w=${w.id}`}
                      target="_blank"
                      rel="noopener"
                      aria-label="Open timer"
                      title="Open timer"
                      className={iconButton}
                    >
                      <IconExternalLink size={18} aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(w)}
                      aria-label="Delete"
                      title="Delete"
                      className={`${iconButton} ml-auto text-alert hover:border-alert`}
                    >
                      <IconTrash size={18} aria-hidden="true" />
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
