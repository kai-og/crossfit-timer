export const ALLOWED_DOMAIN = "yaqbot.com";

interface GoogleProfile {
  email?: string | null;
  email_verified?: boolean | null;
}

/**
 * Exact extra emails allowed to sign in, from EXTRA_COACH_EMAILS (comma separated). Empty by default.
 * A testing aid so the real Google flow can be exercised with an account outside the domain; leave it unset
 * in production. Exact addresses only, never domains or patterns.
 */
export function extraCoachEmails(env: string | undefined = process.env.EXTRA_COACH_EMAILS): string[] {
  return (env ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

/** True for any @yaqbot.com address (exactly that domain, not subdomains or look-alikes) or an extra address. */
export function isAllowedEmail(email: string | null | undefined, extra: string[] = extraCoachEmails()): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  if (extra.includes(normalized)) return true;
  const at = normalized.lastIndexOf("@");
  return at > 0 && normalized.slice(at + 1) === ALLOWED_DOMAIN;
}

/**
 * Who counts as a coach: a Google account whose email Google has verified and that is allowed above.
 * Checked on the server after sign-in. The `hd` hint on Google's chooser is only a UX nicety and is never trusted.
 */
export function isCoach(profile: GoogleProfile | null | undefined, extra?: string[]): boolean {
  if (profile?.email_verified !== true) return false;
  return isAllowedEmail(profile.email, extra);
}
