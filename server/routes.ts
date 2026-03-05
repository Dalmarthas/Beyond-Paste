import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const existingFolders = await storage.getFolders();
  if (existingFolders.length === 0) {
    const codex = await storage.createFolder({ name: "Codex", targetApp: "VS Code" });
    const aiPrompts = await storage.createFolder({ name: "AI Prompts", targetApp: null });

    await storage.createEntry({ folderId: codex.id, title: "console.log", content: "console.log();" });
    await storage.createEntry({ folderId: codex.id, title: "Function skeleton", content: "function doSomething() {\n  return true;\n}" });

    await storage.createEntry({ folderId: aiPrompts.id, title: "Refactor", content: "Can you refactor this code to be more concise and readable?" });
    await storage.createEntry({ folderId: aiPrompts.id, title: "Explain", content: "Explain how this code works step by step." });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Call seed at startup
  seedDatabase().catch(console.error);

  // Folders
  app.get(api.folders.list.path, async (req, res) => {
    const foldersList = await storage.getFolders();
    res.json(foldersList);
  });

  app.post(api.folders.create.path, async (req, res) => {
    try {
      const input = api.folders.create.input.parse(req.body);
      const folder = await storage.createFolder(input);
      res.status(201).json(folder);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.folders.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.folders.update.input.parse(req.body);
      const updated = await storage.updateFolder(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.folders.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteFolder(id);
    res.status(204).end();
  });

  // Entries
  app.get(api.entries.list.path, async (req, res) => {
    try {
      const query = api.entries.list.input?.parse(req.query) || {};
      const entriesList = await storage.getEntries(query.folderId);
      res.json(entriesList);
    } catch (err) {
      if (err instanceof z.ZodError) {
         return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.entries.create.path, async (req, res) => {
    try {
      const input = api.entries.create.input.parse(req.body);
      const entry = await storage.createEntry(input);
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.entries.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.entries.update.input.parse(req.body);
      const updated = await storage.updateEntry(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.entries.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteEntry(id);
    res.status(204).end();
  });

  return httpServer;
}
