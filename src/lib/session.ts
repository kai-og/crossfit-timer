import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/auth-domain";

/** Returns the signed-in coach's email, or null. Re-checks the rule even though sign-in already enforces it. */
export async function getCoachEmail(): Promise<string | null> {
  const email = (await auth())?.user?.email?.toLowerCase();
  return email && isAllowedEmail(email) ? email : null;
}
