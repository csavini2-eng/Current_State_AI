import { pgTable, text, jsonb, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const guestShares = pgTable('guest_assignment_shares', {
  id: text('id').primaryKey(),
  managementHash: text('management_hash').notNull().unique(),
  handlerHash: text('handler_hash').notNull().unique(),
  snapshot: jsonb('snapshot').notNull(),
  active: boolean('active').notNull().default(false),
  revoked: boolean('revoked').notNull().default(false),
  revision: integer('revision').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const guestShareMedia = pgTable('guest_assignment_media', {
  id: text('id').primaryKey(),
  shareId: text('share_id').notNull().references(() => guestShares.id, { onDelete: 'cascade' }),
  objectPath: text('object_path').notNull().unique(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  confirmed: boolean('confirmed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const guestPracticeEntries = pgTable('guest_practice_entries', {
  id: text('id').notNull(),
  shareId: text('share_id').notNull().references(() => guestShares.id, { onDelete: 'cascade' }),
  milestoneId: text('milestone_id').notNull(),
  entry: jsonb('entry').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.shareId, table.id] })]);
export const insertGuestShareSchema = createInsertSchema(guestShares);
export const insertGuestMediaSchema = createInsertSchema(guestShareMedia);
export const insertGuestPracticeSchema = createInsertSchema(guestPracticeEntries);
