import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: ReturnType<typeof create> | undefined;

function create(url: string) {
  return drizzle(neon(url), { schema });
}

/** Lazy so a missing DATABASE_URL fails with a clear message at request time, not at build time. */
export function getDb() {
  // Vercel's Neon integration can expose the pooled string under a prefixed name, so accept the common ones.
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return (db ??= create(url));
}

export { schema };
