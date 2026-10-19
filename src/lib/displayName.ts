export const NAME_MAX = 40;

/** Clean a typed display name: trimmed, inner whitespace collapsed, no control characters. Null if unusable. */
export function cleanDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= NAME_MAX ? name : null;
}
