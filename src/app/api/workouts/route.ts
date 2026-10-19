import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { serviceError } from "@/lib/api";
import { getCoachName } from "@/lib/coach";
import { newId } from "@/lib/id";
import { getCoachEmail } from "@/lib/session";
import { parseConfig } from "@/lib/timer/share";
import { listWorkouts } from "@/lib/workoutQueries";

const noStore = { "Cache-Control": "no-store" };

/** Postgres unique_violation (23505), also when wrapped by the driver or the query builder. */
function isUniqueViolation(e: unknown): boolean {
  for (let err = e as { code?: string; cause?: unknown } | undefined, depth = 0; err && depth < 4; depth++) {
    if (err.code === "23505") return true;
    err = err.cause as typeof err;
  }
  return false;
}

/** List saved workouts. Coaches only. */
export async function GET() {
  if (!(await getCoachEmail())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ workouts: await listWorkouts() }, { headers: noStore });
  } catch (e) {
    return serviceError("GET /api/workouts", e);
  }
}

/** Save a new workout. Coaches only. */
export async function POST(request: Request) {
  const email = await getCoachEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = parseConfig(await request.json().catch(() => null));
  if (!config) return NextResponse.json({ error: "Invalid workout" }, { status: 400 });

  try {
    // Every workout shows its creator's name, so a coach must have chosen one first.
    if (!(await getCoachName(email))) {
      return NextResponse.json({ error: "Choose your name first" }, { status: 403, headers: noStore });
    }
    // Codes are short, so two workouts can very rarely draw the same one: try again with a new code.
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const [row] = await getDb()
          .insert(schema.workouts)
          .values({ id: newId(), name: config.name, config, createdBy: email })
          .returning();
        return NextResponse.json({ workout: row }, { status: 201, headers: noStore });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
    throw new Error("could not find a free workout code");
  } catch (e) {
    return serviceError("POST /api/workouts", e);
  }
}
