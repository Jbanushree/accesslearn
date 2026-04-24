import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  documentTitle: text("document_title").notNull(),
  action: text("action").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityRow = typeof activityTable.$inferSelect;
export type InsertActivityRow = typeof activityTable.$inferInsert;
