"use client";

import {
  IconCheck,
  IconCopy,
  IconDeviceFloppy,
  IconExternalLink,
  IconFlame,
  IconInfinity,
  IconQrcode,
  IconRepeat,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { SavedWorkout } from "@/lib/savedWorkout";
import { validateConfig } from "@/lib/timer/engine";
import { describeConfig, encodeConfig } from "@/lib/timer/share";
import type { Mode, WorkoutConfig } from "@/lib/timer/types";
import { formatCode } from "@/lib/workoutRef";
import { QrDialog } from "./QrDialog";

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

interface JustSaved {
  id: string;
  title: string;
  updated: boolean;
}

/** Set up a workout. Pass `initial` to edit a saved one; saving always returns to a blank form for the next one. */
export function CoachForm({ initial }: { initial?: SavedWorkout }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => (initial ? fromConfig(initial.config) : INITIAL));
  const [editingId, setEditingId] = useState<string | null>(initial?.id ?? null);
  const [savedJson, setSavedJson] = useState(() => (initial ? JSON.stringify(toConfig(fromConfig(initial.config))) : ""));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [justSaved, setJustSaved] = useState<JustSaved | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [qrState, setQrState] = useState({ url: "", data: "" });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const config = useMemo(() => toConfig(form), [form]);
  const errors = useMemo(() => validateConfig(config), [config]);
  const valid = errors.length === 0;
  const dirty = JSON.stringify(config) !== savedJson;
  // The QR code always reflects what is on screen: a link carrying the whole workout. The short code comes with saving.
  const path = valid ? `/t?c=${encodeConfig(config)}` : "";
  const url = origin && path ? origin + path : "";

  useEffect(() => {
    let cancelled = false;
    if (!url) return;
    QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: "#14161a", light: "#ffffff" } }).then((data) => {
      if (!cancelled) setQrState({ url, data });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
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
      setJustSaved({ id: workout.id, title: config.name || describeConfig(config), updated: editingId !== null });
      // Straight on to the next workout.
      setForm(INITIAL);
      setEditingId(null);
      setSavedJson("");
      if (initial) router.replace("/coach");
      router.refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const qr = qrState.url === url ? qrState.data : "";
  const mode = MODES.find((m) => m.id === form.mode)!;
  const saveLabel = saving ? "Saving…" : editingId ? "Update workout" : "Save workout";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_256px]">
      <form className="flex min-w-0 flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        {justSaved && (
          <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-ink bg-lime px-4 py-3 text-ink">
            <IconCheck size={20} aria-hidden="true" />
            <p className="min-w-0 flex-1">
              {justSaved.updated ? "Updated" : "Saved"} <span className="font-medium">“{justSaved.title}”</span>. Code{" "}
              <span className="font-display text-2xl align-middle">{formatCode(justSaved.id)}</span>
            </p>
            <div className="flex items-center gap-2 text-sm">
              <button type="button" onClick={() => setShowQr(true)} className="flex h-8 items-center gap-1.5 rounded-md border border-ink px-2.5 hover:bg-white/50">
                <IconQrcode size={16} aria-hidden="true" />
                Show QR
              </button>
              <button
                type="button"
                onClick={() => copy(`${origin}/t?w=${justSaved.id}`)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-ink px-2.5 hover:bg-white/50"
              >
                <IconCopy size={16} aria-hidden="true" />
                {copied ? "Copied" : "Copy link"}
              </button>
              <a href="/coach/saved" className="underline">
                Saved workouts
              </a>
              <button type="button" onClick={() => setJustSaved(null)} aria-label="Dismiss" className="p-1">
                <IconX size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {editingId && (
          <p className="text-sm text-muted">
            Editing a saved workout.{" "}
            <a href="/coach" className="text-ink underline">
              Cancel
            </a>
          </p>
        )}

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
            disabled={!valid || saving || (editingId !== null && !dirty)}
            className="flex h-11 items-center gap-2 rounded-lg bg-ink px-5 text-base font-medium text-white hover:bg-black disabled:opacity-50"
          >
            <IconDeviceFloppy size={20} aria-hidden="true" />
            {saveLabel}
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
        </div>
        {saveError && (
          <p role="alert" className="text-sm text-alert">
            {saveError}
          </p>
        )}
      </form>

      <aside className={`${card} flex h-fit flex-col items-center gap-2 p-3`} aria-label="QR code">
        {valid && qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code for the timer link" width={232} height={232} className="h-auto w-full max-w-[232px] rounded-md" />
        ) : (
          <div className="aspect-square w-full max-w-[232px] rounded-md bg-paper" aria-hidden="true" />
        )}
        <p className="text-center text-xs text-muted">Scan to try it now. Save the workout to get a short code.</p>
      </aside>

      <QrDialog
        open={showQr && justSaved !== null}
        title={justSaved?.title ?? ""}
        id={justSaved?.id ?? ""}
        url={justSaved ? `${origin}/t?w=${justSaved.id}` : ""}
        onClose={() => setShowQr(false)}
      />
    </div>
  );
}
