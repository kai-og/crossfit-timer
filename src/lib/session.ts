import { auth } from "@/auth";
import { ALLOWED_DOMAIN } from "@/lib/auth-domain";

/** Returns the signed-in coach's email, or null. Re-checks the domain even though sign-in already enforces it. */
export async function getCoachEmail(): Promise<string | null> {
  const email = (await auth())?.user?.email?.toLowerCase();
  return email?.endsWith(`@${ALLOWED_DOMAIN}`) ? email : null;
}
