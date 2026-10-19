"use client";

import { IconCheck, IconCopy, IconExternalLink, IconPencil, IconQrcode, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SavedWorkout } from "@/lib/savedWorkout";
import { describeConfig } from "@/lib/timer/share";
import { formatCode } from "@/lib/workoutRef";
import { ConfirmDialog } from "./ConfirmDialog";
import { QrDialog } from "./QrDialog";

const iconButton =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink hover:border-ink hover:bg-paper";

const MODE_LABEL = { fortime: "For time", amrap: "AMRAP", emom: "EMOM" } as const;

/** All saved workouts, with the actions a coach needs: edit, copy the link, show the QR code, open, delete. */
export function SavedList({ saved }: { saved: SavedWorkout[] }) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<SavedWorkout | null>(null);
  const [deleting, setDeleting] = useState<SavedWorkout | null>(null);
  const [error, setError] = useState("");

  const linkFor = (id: string) => `${window.location.origin}/t?w=${id}`;

  const copyLink = async (id: string) => {
    await navigator.clipboard.writeText(linkFor(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const confirmDelete = async () => {
    const w = deleting;
    setDeleting(null);
    if (!w) return;
    const res = await fetch(`/api/workouts/${w.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) return setError("Could not delete. Try again.");
    setError("");
    router.refresh();
  };

  if (saved.length === 0) {
    return (
      <p className="text-muted">
        Nothing saved yet.{" "}
        <a href="/coach" className="text-ink underline">
          Set up a workout
        </a>{" "}
        and save it to get a short code and QR code.
      </p>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-sm text-alert">
          {error}
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {saved.map((w) => (
          <li key={w.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display truncate text-3xl leading-none">{w.config.name || "Untitled workout"}</p>
              <span className="shrink-0 rounded-md bg-paper px-2 py-0.5 text-xs">{MODE_LABEL[w.config.mode]}</span>
            </div>
            <p className="text-sm text-muted">
              {describeConfig(w.config)} · by {w.creator}
            </p>
            <p className="text-sm">
              Code <span className="font-display text-2xl align-middle">{formatCode(w.id)}</span>
            </p>
            <div className="mt-1 flex gap-1.5">
              <button
                type="button"
                onClick={() => router.push(`/coach?edit=${w.id}`)}
                aria-label="Edit"
                title="Edit"
                className={iconButton}
              >
                <IconPencil size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setQrFor(w)} aria-label="Show QR code" title="Show QR code" className={iconButton}>
                <IconQrcode size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => copyLink(w.id)} aria-label="Copy link" title="Copy link" className={iconButton}>
                {copiedId === w.id ? <IconCheck size={18} aria-hidden="true" /> : <IconCopy size={18} aria-hidden="true" />}
              </button>
              <a href={`/t?w=${w.id}`} target="_blank" rel="noopener" aria-label="Open timer" title="Open timer" className={iconButton}>
                <IconExternalLink size={18} aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => setDeleting(w)}
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

      <QrDialog
        open={qrFor !== null}
        title={qrFor?.config.name || (qrFor ? describeConfig(qrFor.config) : "")}
        id={qrFor?.id ?? ""}
        url={qrFor ? linkFor(qrFor.id) : ""}
        onClose={() => setQrFor(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        tone="light"
        danger
        title="Delete this workout?"
        message={
          deleting
            ? `“${deleting.config.name || describeConfig(deleting.config)}” will be removed. Its code and QR code will stop working.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
