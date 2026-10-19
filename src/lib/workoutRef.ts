import { ID_PATTERN } from "./id";
import { decodeConfig } from "./timer/share";

export type WorkoutRef = { kind: "saved"; id: string } | { kind: "inline"; encoded: string };

/**
 * Turn whatever a person gives us into a workout reference: a scanned QR (a full timer link), a pasted link,
 * or a typed code like "k7m2p-9xq4r". Returns null for anything else.
 */
export function parseWorkoutRef(input: string): WorkoutRef | null {
  const text = input.trim();
  if (!text) return null;

  // A timer link. Only the query values are used, so the origin and any extra text are ignored.
  const saved = text.match(/[?&]w=([0-9a-zA-Z]{10}|[0-9a-zA-Z]{4})(?![0-9a-zA-Z])/);
  if (saved) return { kind: "saved", id: saved[1] };
  const inline = text.match(/[?&]c=([A-Za-z0-9_-]+)/);
  if (inline) return decodeConfig(inline[1]) ? { kind: "inline", encoded: inline[1] } : null;

  // A bare code, possibly typed with a space or dash in the middle.
  const code = text.replace(/[\s-]/g, "");
  return ID_PATTERN.test(code) ? { kind: "saved", id: code } : null;
}

/** Display form of an id: short codes as they are, long ones in two groups of five. */
export function formatCode(id: string): string {
  return id.length === 10 ? `${id.slice(0, 5)}-${id.slice(5)}` : id;
}

/** Link that opens the timer for a reference, on this site. */
export function refHref(ref: WorkoutRef): string {
  return ref.kind === "saved" ? `/t?w=${ref.id}` : `/t?c=${ref.encoded}`;
}
