export const ALLOWED_DOMAIN = "yaqbot.com";

interface GoogleProfile {
  email?: string | null;
  email_verified?: boolean | null;
}

/**
 * Who counts as a coach: a Google account whose email Google has verified and that ends in @yaqbot.com.
 * Checked on the server after sign-in. The `hd` hint on Google's chooser is only a UX nicety and is never trusted.
 */
export function isCoach(profile: GoogleProfile | null | undefined): boolean {
  const email = profile?.email?.trim().toLowerCase();
  if (!email || profile?.email_verified !== true) return false;
  const at = email.lastIndexOf("@");
  return at > 0 && email.slice(at + 1) === ALLOWED_DOMAIN;
}
