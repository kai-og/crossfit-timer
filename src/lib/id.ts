// Lowercase letters and digits without look-alikes (no 0/o, 1/l/i), so a code can be read out loud or typed on a phone.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export const CODE_LENGTH = 4;

/**
 * A short workout code: 4 characters, about 920,000 combinations. Short enough to type at a glance. It is a
 * convenience, not a secret (the phone's saved-workouts list is public), so callers must handle the rare collision.
 */
export function newId(length = CODE_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // 256 is not a multiple of 31; the tiny modulo bias is irrelevant for a short code.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Current 4-character codes, plus the 10-character ids created earlier, which keep working. */
export const ID_PATTERN = /^(?:[0-9a-zA-Z]{4}|[0-9a-zA-Z]{10})$/;
