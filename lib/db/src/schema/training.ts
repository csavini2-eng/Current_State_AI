import { pgTable, text, jsonb, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const trainingWorkspaces = pgTable("training_workspaces", {
  ownerId: text("owner_id").primaryKey(),
  state: jsonb("state").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertTrainingWorkspaceSchema = createInsertSchema(trainingWorkspaces);
export type TrainingWorkspaceRecord = typeof trainingWorkspaces.$inferSelect;

export const handlerShares = pgTable("handler_shares", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => trainingWorkspaces.ownerId, { onDelete: "cascade" }),
  assignmentId: text("assignment_id").notNull(),
  handlerName: text("handler_name").notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertHandlerShareSchema = createInsertSchema(handlerShares);
export type HandlerShareRecord = typeof handlerShares.$inferSelect;

export const trainingMedia = pgTable("training_media", {
  objectPath: text("object_path").primaryKey(),
  ownerId: text("owner_id").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertTrainingMediaSchema = createInsertSchema(trainingMedia);
export type TrainingMediaRecord = typeof trainingMedia.$inferSelect;
