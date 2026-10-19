// Lowercase letters and digits without look-alikes (no 0/o, 1/l/i), so a code can be read out loud or typed on a phone.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** 10 random characters (about 49 bits): short enough to type, too many combinations to guess. */
export function newId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // 256 is not a multiple of 31; the tiny modulo bias is irrelevant for an unguessable-link id.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Accepts any 10 letters/digits, so ids created before the friendlier alphabet keep working. */
export const ID_PATTERN = /^[0-9a-zA-Z]{10}$/;
