import { pgTable, serial, text, integer, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  token: uuid("token").notNull().unique().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // 6-char friend code
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scoresTable = pgTable("scores", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => playersTable.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  distanceMeters: real("distance_meters").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  playedAt: timestamp("played_at").notNull().defaultNow(),
});
