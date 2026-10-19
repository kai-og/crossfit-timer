import { connection, NextResponse } from "next/server";

/** The version of the code the server is running, so an open app can tell when it is out of date. */
export async function GET() {
  await connection();
  return NextResponse.json(
    { build: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
