"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { validateConfig } from "@/lib/timer/engine";
import { describeConfig, encodeConfig } from "@/lib/timer/share";
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

export function CoachForm() {
  const [form, setForm] = useState<Form>(INITIAL);
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
  const path = valid ? `/t?c=${encodeConfig(config)}` : "";
  const url = origin && path ? origin + path : "";

  useEffect(() => {
    let cancelled = false;
    if (!url) return;
    QRCode.toDataURL(url, { margin: 1, width: 280 }).then((data) => {
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

  const qr = qrState.url === url ? qrState.data : "";
  const mode = MODES.find((m) => m.id === form.mode)!;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
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

      <aside className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div>
          <p className="text-sm text-zinc-500">Preview</p>
          <p className="text-xl font-semibold">{config.name || "Untitled workout"}</p>
          <p className="text-zinc-600 dark:text-zinc-400">{valid ? describeConfig(config) : "Fix the errors to continue"}</p>
        </div>

        {valid && qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code for the timer link" width={280} height={280} className="self-center rounded-lg bg-white" />
        )}

        <div className="flex flex-col gap-2">
          <a
            href={valid ? path : undefined}
            target="_blank"
            rel="noopener"
            aria-disabled={!valid}
            className={`rounded-xl px-4 py-3 text-center text-lg font-semibold text-white ${
              valid ? "bg-emerald-600 hover:bg-emerald-700" : "pointer-events-none bg-zinc-400"
            }`}
          >
            Open timer
          </a>
          <button
            type="button"
            onClick={copy}
            disabled={!valid}
            className="rounded-xl border border-zinc-300 px-4 py-3 font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <p className="text-xs text-zinc-500">Scan the QR code with the phone on the rig, then tap START.</p>
        </div>
      </aside>
    </div>
  );
}
