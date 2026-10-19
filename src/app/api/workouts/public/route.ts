import { connection, NextResponse } from "next/server";
import { serviceError } from "@/lib/api";
import { parseConfig } from "@/lib/timer/share";
import { listWorkouts } from "@/lib/workoutQueries";

const LIMIT = 100;

/**
 * Public, read-only list for the phone's "saved workouts" picker.
 * Exposes the id, the workout settings and the creator's chosen display name. Never an email address.
 */
export async function GET() {
  // Always evaluated per request, never prerendered at build time.
  await connection();
  try {
    const rows = await listWorkouts(LIMIT);
    const workouts = rows.flatMap((r) => {
      const config = parseConfig(r.config);
      return config ? [{ id: r.id, config, creator: r.creatorName ?? undefined }] : [];
    });
    return NextResponse.json({ workouts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return serviceError("GET /api/workouts/public", e);
  }
}
