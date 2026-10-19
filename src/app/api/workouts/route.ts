import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { newId } from "@/lib/id";
import { getCoachEmail } from "@/lib/session";
import { parseConfig } from "@/lib/timer/share";

const noStore = { "Cache-Control": "no-store" };

/** List saved workouts. Coaches only. */
export async function GET() {
  if (!(await getCoachEmail())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await getDb().select().from(schema.workouts).orderBy(desc(schema.workouts.updatedAt));
  return NextResponse.json({ workouts: rows }, { headers: noStore });
}

/** Save a new workout. Coaches only. */
export async function POST(request: Request) {
  const email = await getCoachEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = parseConfig(await request.json().catch(() => null));
  if (!config) return NextResponse.json({ error: "Invalid workout" }, { status: 400 });

  const [row] = await getDb()
    .insert(schema.workouts)
    .values({ id: newId(), name: config.name, config, createdBy: email })
    .returning();
  return NextResponse.json({ workout: row }, { status: 201, headers: noStore });
}
