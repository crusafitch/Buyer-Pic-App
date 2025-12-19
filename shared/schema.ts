import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const overlays = pgTable("overlays", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  photoUrl: text("photo_url").notNull(),
  overlayId: varchar("overlay_id").references(() => overlays.id),
  caption: text("caption"),
  status: text("status").notNull().default("pending"),
  clientId: varchar("client_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertOverlaySchema = createInsertSchema(overlays).pick({
  name: true,
  imageUrl: true,
  isActive: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  photoUrl: true,
  overlayId: true,
  caption: true,
  clientId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertOverlay = z.infer<typeof insertOverlaySchema>;
export type Overlay = typeof overlays.$inferSelect;

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
