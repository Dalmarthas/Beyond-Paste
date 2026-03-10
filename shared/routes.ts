export const desktopCommands = {
  listFolders: "list_folders",
  createFolder: "create_folder",
  updateFolder: "update_folder",
  deleteFolder: "delete_folder",
  listSnippets: "list_snippets",
  createSnippet: "create_snippet",
  updateSnippet: "update_snippet",
  deleteSnippet: "delete_snippet",
  getSettings: "get_settings",
  updateSettings: "update_settings",
  listRunningApps: "list_running_apps",
  getPickerPayload: "get_picker_payload",
  prepareQuickCaptureFromClipboard: "prepare_quick_capture_from_clipboard",
  takeQuickCaptureDraft: "take_quick_capture_draft",
  pasteSnippet: "paste_snippet",
  hidePicker: "hide_picker",
} as const;

export const desktopEvents = {
  pickerOpen: "picker://open",
  quickCaptureReady: "quick-capture://ready",
} as const;
