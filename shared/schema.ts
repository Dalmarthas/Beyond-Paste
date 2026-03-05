import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetApp: text("target_app"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id").references(() => folders.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const foldersRelations = relations(folders, ({ many }) => ({
  entries: many(entries),
}));

export const entriesRelations = relations(entries, ({ one }) => ({
  folder: one(folders, {
    fields: [entries.folderId],
    references: [folders.id],
  }),
}));

export const insertFolderSchema = createInsertSchema(folders).omit({ id: true, createdAt: true });
export const insertEntrySchema = createInsertSchema(entries).omit({ id: true, createdAt: true });

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = z.infer<typeof insertEntrySchema>;

export type CreateFolderRequest = InsertFolder;
export type UpdateFolderRequest = Partial<InsertFolder>;
export type CreateEntryRequest = InsertEntry;
export type UpdateEntryRequest = Partial<InsertEntry>;
