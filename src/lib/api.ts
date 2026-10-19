import { NextResponse } from "next/server";

/** Log the real error (visible in Vercel's runtime logs) and answer with a JSON 503 instead of an empty 500. */
export function serviceError(where: string, error: unknown) {
  console.error(`[api] ${where} failed:`, error);
  return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
