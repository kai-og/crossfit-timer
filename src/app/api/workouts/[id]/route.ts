import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { ID_PATTERN } from "@/lib/id";
import { getCoachEmail } from "@/lib/session";
import { parseConfig } from "@/lib/timer/share";

type Ctx = { params: Promise<{ id: string }> };

const noStore = { "Cache-Control": "no-store" };
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });

/** Public: the phone timer loads a workout by its unguessable id. Only the config is exposed, never the author. */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFound();
  const [row] = await getDb().select().from(schema.workouts).where(eq(schema.workouts.id, id));
  if (!row) return notFound();
  const config = parseConfig(row.config);
  if (!config) return notFound();
  return NextResponse.json({ id: row.id, config }, { headers: noStore });
}

/** Update a saved workout. Coaches only. */
export async function PUT(request: Request, { params }: Ctx) {
  if (!(await getCoachEmail())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFound();

  const config = parseConfig(await request.json().catch(() => null));
  if (!config) return NextResponse.json({ error: "Invalid workout" }, { status: 400 });

  const [row] = await getDb()
    .update(schema.workouts)
    .set({ name: config.name, config, updatedAt: new Date() })
    .where(eq(schema.workouts.id, id))
    .returning();
  return row ? NextResponse.json({ workout: row }, { headers: noStore }) : notFound();
}

/** Delete a saved workout. Coaches only. */
export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await getCoachEmail())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return notFound();
  const rows = await getDb().delete(schema.workouts).where(eq(schema.workouts.id, id)).returning({ id: schema.workouts.id });
  return rows.length ? new NextResponse(null, { status: 204 }) : notFound();
}
