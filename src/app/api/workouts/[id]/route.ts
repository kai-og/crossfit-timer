import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { serviceError } from "@/lib/api";
import { ID_PATTERN } from "@/lib/id";
import { getCoachEmail } from "@/lib/session";
import { getWorkout } from "@/lib/workoutQueries";
import { parseConfig } from "@/lib/timer/share";

type Ctx = { params: Promise<{ id: string }> };

const noStore = { "Cache-Control": "no-store" };
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });

/** Public: the phone timer loads a workout by its id. Exposes the settings and the creator's display name, never an email. */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFound();
  try {
    const row = await getWorkout(id);
    if (!row) return notFound();
    const config = parseConfig(row.config);
    if (!config) return notFound();
    return NextResponse.json({ id: row.id, config, creator: row.creatorName ?? undefined }, { headers: noStore });
  } catch (e) {
    return serviceError("GET /api/workouts/[id]", e);
  }
}

/** Update a saved workout. Coaches only. */
export async function PUT(request: Request, { params }: Ctx) {
  if (!(await getCoachEmail())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFound();

  const config = parseConfig(await request.json().catch(() => null));
  if (!config) return NextResponse.json({ error: "Invalid workout" }, { status: 400 });

  try {
    const [row] = await getDb()
      .update(schema.workouts)
      .set({ name: config.name, config, updatedAt: new Date() })
      .where(eq(schema.workouts.id, id))
      .returning();
    return row ? NextResponse.json({ workout: row }, { headers: noStore }) : notFound();
  } catch (e) {
    return serviceError("PUT /api/workouts/[id]", e);
  }
}

/** Delete a saved workout. Coaches only. */
export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await getCoachEmail())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFound();
  try {
    const rows = await getDb()
      .delete(schema.workouts)
      .where(eq(schema.workouts.id, id))
      .returning({ id: schema.workouts.id });
    return rows.length ? new NextResponse(null, { status: 204 }) : notFound();
  } catch (e) {
    return serviceError("DELETE /api/workouts/[id]", e);
  }
}
