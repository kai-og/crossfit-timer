const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 10 random base62 characters (about 59 bits): short enough for a QR code, too long to guess. */
export function newId(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // 256 is not a multiple of 62; the tiny modulo bias is irrelevant for an unguessable-link id.
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export const ID_PATTERN = /^[0-9a-zA-Z]{10}$/;
