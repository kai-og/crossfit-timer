import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * First line of defence for the coach area: anonymous visitors get a real 307 to /login before anything renders.
 * The page and API routes still check the session themselves, so this is never the only guard.
 */
export const proxy = auth((req) => {
  if (!req.auth) return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
});

export const config = { matcher: ["/coach/:path*"] };
