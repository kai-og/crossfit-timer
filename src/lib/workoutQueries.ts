import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Saved workouts newest first, each with the name its coach chose (null if they have not set one). */
export async function listWorkouts(limit?: number) {
  const query = getDb()
    .select({
      id: schema.workouts.id,
      config: schema.workouts.config,
      createdBy: schema.workouts.createdBy,
      creatorName: schema.coaches.displayName,
    })
    .from(schema.workouts)
    .leftJoin(schema.coaches, eq(schema.workouts.createdBy, schema.coaches.email))
    .orderBy(desc(schema.workouts.updatedAt));
  return limit ? query.limit(limit) : query;
}

export async function getWorkout(id: string) {
  const [row] = await getDb()
    .select({
      id: schema.workouts.id,
      config: schema.workouts.config,
      creatorName: schema.coaches.displayName,
    })
    .from(schema.workouts)
    .leftJoin(schema.coaches, eq(schema.workouts.createdBy, schema.coaches.email))
    .where(eq(schema.workouts.id, id));
  return row;
}
