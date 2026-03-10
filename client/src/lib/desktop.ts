import { invoke } from "@tauri-apps/api/core";
import { disable as disableAutostart, enable as enableAutostart } from "@tauri-apps/plugin-autostart";
import {
  createFolderInputSchema,
  createSnippetInputSchema,
  folderSchema,
  pasteResultSchema,
  pickerPayloadSchema,
  quickCaptureDraftSchema,
  runningAppSchema,
  settingsSchema,
  snippetSchema,
  updateFolderInputSchema,
  updateSnippetInputSchema,
  updateSettingsInputSchema,
  type AppSettings,
  type CreateFolderInput,
  type CreateSnippetInput,
  type Folder,
  type PasteResult,
  type PickerPayload,
  type QuickCaptureDraft,
  type RunningApp,
  type Snippet,
  type UpdateFolderInput,
  type UpdateSettingsInput,
  type UpdateSnippetInput,
} from "@shared/schema";
import { desktopCommands } from "@shared/routes";

const STORAGE_KEYS = {
  folders: "beyond-paste.folders",
  snippets: "beyond-paste.snippets",
  settings: "beyond-paste.settings",
} as const;

const browserDefaultSettings: AppSettings = {
  globalHotkey: "ctrl+shift+space",
  launchAtLogin: false,
  focusDelayMs: 120,
  restoreClipboardAfterPaste: true,
};

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function now() {
  return Date.now();
}

function suggestQuickCaptureTitle(content: string) {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "New snippet";
  }

  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
}

function parseFolder(data: unknown) {
  return folderSchema.parse(data);
}

function parseSnippet(data: unknown) {
  return snippetSchema.parse(data);
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  return invoke<T>(command, args);
}

function listBrowserFolders() {
  return readJson<Folder[]>(STORAGE_KEYS.folders, []).map(parseFolder);
}

function listBrowserSnippets() {
  return readJson<Snippet[]>(STORAGE_KEYS.snippets, []).map(parseSnippet);
}

function getBrowserSettings() {
  return settingsSchema.parse(readJson(STORAGE_KEYS.settings, browserDefaultSettings));
}

export async function listFolders() {
  if (isTauriRuntime()) {
    const folders = await invokeCommand<unknown[]>(desktopCommands.listFolders);
    return folders.map(parseFolder);
  }

  return listBrowserFolders();
}

export async function createFolder(input: CreateFolderInput) {
  const parsed = createFolderInputSchema.parse(input);
  if (isTauriRuntime()) {
    return parseFolder(await invokeCommand(desktopCommands.createFolder, { input: parsed }));
  }

  const folders = listBrowserFolders();
  const record: Folder = {
    id: folders.length > 0 ? Math.max(...folders.map((folder) => folder.id)) + 1 : 1,
    name: parsed.name,
    linkedAppExecutable: parsed.linkedAppExecutable ?? null,
    linkedAppDisplayName: parsed.linkedAppDisplayName ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  folders.push(record);
  writeJson(STORAGE_KEYS.folders, folders);
  return record;
}

export async function updateFolder(input: UpdateFolderInput) {
  const parsed = updateFolderInputSchema.parse(input);
  if (isTauriRuntime()) {
    return parseFolder(await invokeCommand(desktopCommands.updateFolder, { input: parsed }));
  }

  const folders = listBrowserFolders();
  const index = folders.findIndex((folder) => folder.id === parsed.id);
  if (index < 0) {
    throw new Error("Folder not found.");
  }

  const existing = folders[index];
  const updated: Folder = {
    ...existing,
    name: parsed.name,
    linkedAppExecutable: parsed.linkedAppExecutable ?? null,
    linkedAppDisplayName: parsed.linkedAppDisplayName ?? null,
    updatedAt: now(),
  };
  folders[index] = updated;
  writeJson(STORAGE_KEYS.folders, folders);
  return updated;
}

export async function deleteFolder(id: number) {
  if (isTauriRuntime()) {
    await invokeCommand(desktopCommands.deleteFolder, { id });
    return;
  }

  writeJson(
    STORAGE_KEYS.folders,
    listBrowserFolders().filter((folder) => folder.id !== id),
  );
  writeJson(
    STORAGE_KEYS.snippets,
    listBrowserSnippets().filter((snippet) => snippet.folderId !== id),
  );
}

export async function listSnippets(folderId?: number) {
  if (isTauriRuntime()) {
    const snippets = await invokeCommand<unknown[]>(desktopCommands.listSnippets, {
      folderId: folderId ?? null,
    });
    return snippets.map(parseSnippet);
  }

  return listBrowserSnippets().filter((snippet) => (folderId ? snippet.folderId === folderId : true));
}

export async function createSnippet(input: CreateSnippetInput) {
  const parsed = createSnippetInputSchema.parse(input);
  if (isTauriRuntime()) {
    return parseSnippet(await invokeCommand(desktopCommands.createSnippet, { input: parsed }));
  }

  const snippets = listBrowserSnippets();
  const record: Snippet = {
    id: snippets.length > 0 ? Math.max(...snippets.map((snippet) => snippet.id)) + 1 : 1,
    folderId: parsed.folderId,
    title: parsed.title,
    content: parsed.content,
    createdAt: now(),
    updatedAt: now(),
  };
  snippets.push(record);
  writeJson(STORAGE_KEYS.snippets, snippets);
  return record;
}

export async function updateSnippet(input: UpdateSnippetInput) {
  const parsed = updateSnippetInputSchema.parse(input);
  if (isTauriRuntime()) {
    return parseSnippet(await invokeCommand(desktopCommands.updateSnippet, { input: parsed }));
  }

  const snippets = listBrowserSnippets();
  const index = snippets.findIndex((snippet) => snippet.id === parsed.id);
  if (index < 0) {
    throw new Error("Snippet not found.");
  }

  const existing = snippets[index];
  const updated: Snippet = {
    ...existing,
    folderId: parsed.folderId,
    title: parsed.title,
    content: parsed.content,
    updatedAt: now(),
  };
  snippets[index] = updated;
  writeJson(STORAGE_KEYS.snippets, snippets);
  return updated;
}

export async function deleteSnippet(id: number) {
  if (isTauriRuntime()) {
    await invokeCommand(desktopCommands.deleteSnippet, { id });
    return;
  }

  writeJson(
    STORAGE_KEYS.snippets,
    listBrowserSnippets().filter((snippet) => snippet.id !== id),
  );
}

export async function getSettings() {
  if (isTauriRuntime()) {
    return settingsSchema.parse(await invokeCommand(desktopCommands.getSettings));
  }

  return getBrowserSettings();
}

export async function updateSettings(input: UpdateSettingsInput) {
  const parsed = updateSettingsInputSchema.parse(input);
  if (isTauriRuntime()) {
    const settings = settingsSchema.parse(
      await invokeCommand(desktopCommands.updateSettings, { settings: parsed }),
    );
    if (settings.launchAtLogin) {
      await enableAutostart();
    } else {
      await disableAutostart();
    }
    return settings;
  }

  writeJson(STORAGE_KEYS.settings, parsed);
  return parsed;
}

export async function listRunningApps() {
  if (isTauriRuntime()) {
    const apps = await invokeCommand<unknown[]>(desktopCommands.listRunningApps);
    return apps.map((app) => runningAppSchema.parse(app));
  }

  return [
    { executableName: "Code.exe", displayName: "VS Code", windowTitle: "Beyond Paste" },
    { executableName: "Cursor.exe", displayName: "Cursor", windowTitle: "AI Workspace" },
    { executableName: "Slack.exe", displayName: "Slack", windowTitle: "Team Chat" },
  ];
}

export async function getPickerPayload() {
  if (isTauriRuntime()) {
    return pickerPayloadSchema.parse(await invokeCommand(desktopCommands.getPickerPayload));
  }

  return {
    context: {
      matchedFolderId: null,
      focusedApp: null,
      launchedAt: now(),
    },
    folders: listBrowserFolders(),
    snippets: listBrowserSnippets(),
  } satisfies PickerPayload;
}

export async function prepareQuickCaptureFromClipboard() {
  if (isTauriRuntime()) {
    await invokeCommand(desktopCommands.prepareQuickCaptureFromClipboard);
  }
}

export async function takeQuickCaptureDraft() {
  if (isTauriRuntime()) {
    const draft = await invokeCommand<unknown | null>(desktopCommands.takeQuickCaptureDraft);
    return draft === null ? null : quickCaptureDraftSchema.parse(draft);
  }

  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return null;
  }

  const content = await navigator.clipboard.readText();
  if (!content.trim()) {
    return null;
  }

  return {
    title: suggestQuickCaptureTitle(content),
    content,
    matchedFolderId: null,
    focusedApp: null,
  } satisfies QuickCaptureDraft;
}

export async function pasteSnippet(content: string) {
  if (isTauriRuntime()) {
    return pasteResultSchema.parse(await invokeCommand(desktopCommands.pasteSnippet, { content }));
  }

  await navigator.clipboard.writeText(content);
  return {
    success: false,
    usedManualFallback: true,
    clipboardRestored: false,
    failureReason: "Snippet copied. Paste manually in the target app.",
  } satisfies PasteResult;
}

export async function hidePicker() {
  if (isTauriRuntime()) {
    await invokeCommand(desktopCommands.hidePicker);
  }
}
