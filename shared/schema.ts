import { z } from "zod";

export const folderSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  linkedAppExecutable: z.string().nullable(),
  linkedAppDisplayName: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const snippetSchema = z.object({
  id: z.number().int(),
  folderId: z.number().int(),
  title: z.string().min(1),
  content: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const settingsSchema = z.object({
  globalHotkey: z.string().min(1),
  launchAtLogin: z.boolean(),
  focusDelayMs: z.number().int().min(0).max(2000),
  restoreClipboardAfterPaste: z.boolean(),
});

export const runningAppSchema = z.object({
  executableName: z.string().min(1),
  displayName: z.string().min(1),
  windowTitle: z.string().nullable(),
});

export const pickerContextSchema = z.object({
  matchedFolderId: z.number().int().nullable(),
  focusedApp: runningAppSchema.nullable(),
  launchedAt: z.number().int(),
});

export const pickerPayloadSchema = z.object({
  context: pickerContextSchema,
  folders: z.array(folderSchema),
  snippets: z.array(snippetSchema),
});

export const quickCaptureDraftSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  matchedFolderId: z.number().int().nullable(),
  focusedApp: runningAppSchema.nullable(),
});

export const pasteResultSchema = z.object({
  success: z.boolean(),
  usedManualFallback: z.boolean(),
  clipboardRestored: z.boolean(),
  failureReason: z.string().nullable(),
});

export const createFolderInputSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required."),
  linkedAppExecutable: z.string().trim().min(1).nullable().optional(),
  linkedAppDisplayName: z.string().trim().min(1).nullable().optional(),
});

export const updateFolderInputSchema = createFolderInputSchema.extend({
  id: z.number().int(),
});

export const createSnippetInputSchema = z.object({
  folderId: z.number().int(),
  title: z.string().trim().min(1, "Snippet title is required."),
  content: z.string().min(1, "Snippet content is required."),
});

export const updateSnippetInputSchema = createSnippetInputSchema.extend({
  id: z.number().int(),
});

export const updateSettingsInputSchema = settingsSchema;

export const pasteSnippetInputSchema = z.object({
  content: z.string(),
});

export type Folder = z.infer<typeof folderSchema>;
export type Snippet = z.infer<typeof snippetSchema>;
export type AppSettings = z.infer<typeof settingsSchema>;
export type RunningApp = z.infer<typeof runningAppSchema>;
export type PickerContext = z.infer<typeof pickerContextSchema>;
export type PickerPayload = z.infer<typeof pickerPayloadSchema>;
export type QuickCaptureDraft = z.infer<typeof quickCaptureDraftSchema>;
export type PasteResult = z.infer<typeof pasteResultSchema>;
export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderInputSchema>;
export type CreateSnippetInput = z.infer<typeof createSnippetInputSchema>;
export type UpdateSnippetInput = z.infer<typeof updateSnippetInputSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;
export type PasteSnippetInput = z.infer<typeof pasteSnippetInputSchema>;
