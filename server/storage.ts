import { db } from "./db";
import {
  folders, entries,
  type Folder, type InsertFolder, type UpdateFolderRequest,
  type Entry, type InsertEntry, type UpdateEntryRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getFolders(): Promise<Folder[]>;
  getFolder(id: number): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: number, updates: UpdateFolderRequest): Promise<Folder>;
  deleteFolder(id: number): Promise<void>;

  getEntries(folderId?: number): Promise<Entry[]>;
  getEntry(id: number): Promise<Entry | undefined>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  updateEntry(id: number, updates: UpdateEntryRequest): Promise<Entry>;
  deleteEntry(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getFolders(): Promise<Folder[]> {
    return await db.select().from(folders);
  }

  async getFolder(id: number): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder;
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const [newFolder] = await db.insert(folders).values(folder).returning();
    return newFolder;
  }

  async updateFolder(id: number, updates: UpdateFolderRequest): Promise<Folder> {
    const [updated] = await db.update(folders).set(updates).where(eq(folders.id, id)).returning();
    return updated;
  }

  async deleteFolder(id: number): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }

  async getEntries(folderId?: number): Promise<Entry[]> {
    if (folderId !== undefined) {
      return await db.select().from(entries).where(eq(entries.folderId, folderId));
    }
    return await db.select().from(entries);
  }

  async getEntry(id: number): Promise<Entry | undefined> {
    const [entry] = await db.select().from(entries).where(eq(entries.id, id));
    return entry;
  }

  async createEntry(entry: InsertEntry): Promise<Entry> {
    const [newEntry] = await db.insert(entries).values(entry).returning();
    return newEntry;
  }

  async updateEntry(id: number, updates: UpdateEntryRequest): Promise<Entry> {
    const [updated] = await db.update(entries).set(updates).where(eq(entries.id, id)).returning();
    return updated;
  }

  async deleteEntry(id: number): Promise<void> {
    await db.delete(entries).where(eq(entries.id, id));
  }
}

export const storage = new DatabaseStorage();
