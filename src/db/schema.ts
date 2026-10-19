import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { WorkoutConfig } from "@/lib/timer/types";

export const workouts = pgTable("workouts", {
  /** Short random id used in the public timer link. Unguessable, not derived from content. */
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  config: jsonb("config").$type<WorkoutConfig>().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkoutRow = typeof workouts.$inferSelect;
