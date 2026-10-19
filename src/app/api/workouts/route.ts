import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { serviceError } from "@/lib/api";
import { getCoachName } from "@/lib/coach";
import { newId } from "@/lib/id";
import { getCoachEmail } from "@/lib/session";
import { parseConfig } from "@/lib/timer/share";
import { listWorkouts } from "@/lib/workoutQueries";

const noStore = { "Cache-Control": "no-store" };

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
    const [row] = await getDb()
      .insert(schema.workouts)
      .values({ id: newId(), name: config.name, config, createdBy: email })
      .returning();
    return NextResponse.json({ workout: row }, { status: 201, headers: noStore });
  } catch (e) {
    return serviceError("POST /api/workouts", e);
  }
}
