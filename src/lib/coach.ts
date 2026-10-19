import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { cleanDisplayName } from "./displayName";

/** The name a coach chose, or null if they have not been through the welcome step yet. */
export async function getCoachName(email: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ name: schema.coaches.displayName })
    .from(schema.coaches)
    .where(eq(schema.coaches.email, email));
  return row?.name ?? null;
}

/** Create or update a coach's display name. Returns the cleaned name, or null if the input was not usable. */
export async function saveCoachName(email: string, input: unknown): Promise<string | null> {
  const displayName = cleanDisplayName(input);
  if (!displayName) return null;
  await getDb()
    .insert(schema.coaches)
    .values({ email, displayName })
    .onConflictDoUpdate({ target: schema.coaches.email, set: { displayName, updatedAt: new Date() } });
  return displayName;
}
