# PRD: Beyond Paste Windows MVP, Revised After Research

Last updated: 2026-03-05

## Summary

- Build a lightweight Windows tray app for plain-text snippets organized into folders.
- The app has 2 surfaces:
  1. A library/settings window for managing folders, snippets, app links, and preferences.
  2. A popup launcher opened by one global hotkey.
- When the hotkey is pressed, the app checks the currently focused Windows app and shows the linked folder if one exists; otherwise it shows all folders.
- Selecting a snippet should:
  1. Save the current clipboard,
  2. Put the snippet into the clipboard,
  3. Hide the popup,
  4. Return focus to the previously active app,
  5. Send `Ctrl+V`,
  6. Restore the previous clipboard on success.
- If focus restore or paste fails, keep the snippet in the clipboard and show a small "Copied, paste manually" notice.

## Key Changes

- Recommended desktop stack remains `Tauri 2 + React/Vite + SQLite`, with a small custom Rust/Win32 layer for:
  - active-window detection,
  - cursor position,
  - focus restore,
  - paste simulation.
- Global hotkey:
  - Default to `Ctrl+Shift+Space`.
  - Do not use `Alt+Space` as the default.
  - Do not use `Win` combinations or `F12`.
- Popup positioning:
  - Open near the mouse cursor in v1.
  - Keep fully on-screen.
  - Do not attempt caret-anchored positioning in v1.
- App matching:
  - One linked app per folder for MVP.
  - Match by executable name first, with friendly display name shown in settings.
  - If match lookup fails or app is unsupported, show all folders.
- Paste behavior:
  - Use clipboard-based paste only in v1.
  - No key-by-key text injection in v1.
  - Add a small configurable focus delay before sending paste.
- Reliability constraints to document in-product:
  - Elevated/admin target apps may reject paste from a non-elevated Beyond Paste process.
  - Some protected, virtualized, or non-standard text fields may not accept external paste reliably.
  - The app must be single-instance and keep hotkey registration owned by the background process, not by the library window.

## Interfaces / Data

- `Folder`
  - `id`
  - `name`
  - `linkedAppExecutable | null`
  - `linkedAppDisplayName | null`
  - `createdAt`
  - `updatedAt`
- `Snippet`
  - `id`
  - `folderId`
  - `title`
  - `content`
  - `createdAt`
  - `updatedAt`
- `AppSettings`
  - `globalHotkey`
  - `launchAtLogin`
  - `focusDelayMs`
  - `restoreClipboardAfterPaste`
- `FocusedAppInfo`
  - `windowHandle`
  - `executableName`
  - `windowTitle`
- `PasteAttemptResult`
  - `success`
  - `usedManualFallback`
  - `failureReason | null`

## Runtime Behavior

- Hotkey press flow:
  1. Capture the foreground window handle and focused app executable.
  2. Capture mouse cursor position.
  3. Resolve the folder scope from the app link.
  4. Open the popup near the mouse cursor with search focused.
- Selection flow:
  1. Buffer existing clipboard contents.
  2. Copy selected snippet to clipboard.
  3. Close popup.
  4. Attempt to restore focus to the captured target window.
  5. Wait `focusDelayMs`.
  6. Send `Ctrl+V`.
  7. If successful and `restoreClipboardAfterPaste=true`, restore the old clipboard.
  8. If unsuccessful, keep the snippet in clipboard and notify the user.
- Tray behavior:
  - Tray menu: `Open Library`, `Quit`.
  - Closing the library window does not quit the app.
- Library window behavior:
  - Manage folders and snippets.
  - Pick linked app from currently running apps, with manual executable entry fallback.
  - Set hotkey and launch-at-login.
- Out of scope for this MVP:
  - macOS implementation
  - cloud sync
  - export/import
  - variables/placeholders
  - rich text
  - mouse-button trigger
  - multi-hotkey routing
  - caret-anchored popup placement

## Test Plan

- Folder CRUD and snippet CRUD persist across restart.
- Popup opens from tray-running app even when library window is closed.
- Default hotkey registers successfully on Windows and survives normal window open/close flows.
- When a linked app is focused, popup shows that folder first.
- When no linked app matches, popup shows all folders.
- Popup opens near the mouse cursor and stays visible at screen edges and on multi-monitor setups.
- Keyboard-only flow works: hotkey, search, arrows, enter, paste.
- Mouse click selection works.
- Multiline plain text pastes exactly as stored.
- Successful paste restores previous clipboard.
- Failed paste leaves snippet in clipboard and shows manual-paste guidance.
- Elevated/admin target app failure is handled gracefully.
- If another window steals focus during paste, the app does not lose the snippet.
- Tray `Open Library` and `Quit` behave correctly.
- App enforces single-instance behavior.

## Assumptions and Defaults

- Windows-only MVP.
- Plain text only.
- One global hotkey.
- One linked app per folder.
- Mouse-cursor popup placement in v1.
- Clipboard restore is on by default after successful auto-paste.
- Manual paste fallback is part of MVP because Windows focus and privilege rules can prevent guaranteed auto-paste in every app.

## Research Notes

- The overall concept is validated by existing products such as Alfred and PhraseExpress.
- The revised behavior decisions came from implementation limits and usage patterns found in official Windows documentation and community discussions:
  - clipboard-based paste is the practical v1 insertion method,
  - mouse-cursor popup placement is safer than caret-anchored placement,
  - clipboard restore should happen only after successful paste,
  - privilege and focus restrictions must be treated as expected edge cases, not rare bugs.

## Sources

- [PhraseExpress Program Restriction](https://www.phraseexpress.com/doc/edit/program-restriction/)
- [PhraseExpress Phrase Menu](https://www.phraseexpress.com/doc/settings/phrase-menu/)
- [PhraseExpress Support FAQ](https://www.phraseexpress.com/support/faq/)
- [Alfred Snippets](https://www.alfredapp.com/help/features/snippets/)
- [Alfred Advanced Snippet Expansion](https://www.alfredapp.com/help/features/snippets/advanced/)
- [Alfred Hotkey Trigger / Related Apps](https://www.alfredapp.com/help/workflows/triggers/hotkey/)
- [Stack Overflow: clipboard listeners cannot detect paste](https://stackoverflow.com/questions/46699066/clipboard-viewer-doesnt-get-paste-notification)
- [Stack Overflow: popup menu at arbitrary screen coordinates](https://stackoverflow.com/questions/9344268/show-a-popup-menu-in-another-applications-window)
- [Stack Overflow: tray/minimize can affect hotkey registration tied to window handles](https://stackoverflow.com/questions/22296966/c-sharp-global-hotkeys-wont-work-in-first-minimize-to-tray-but-after-showing-an)
- [Microsoft RegisterHotKey](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey)
- [Microsoft SetForegroundWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow)
- [Microsoft SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)
- [Microsoft GetGUIThreadInfo](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getguithreadinfo)
- [Tauri Global Shortcut](https://v2.tauri.app/plugin/global-shortcut/)
- [Tauri Positioner](https://v2.tauri.app/plugin/positioner/)
- [Tauri SQL](https://v2.tauri.app/plugin/sql/)
- [Tauri Autostart](https://v2.tauri.app/plugin/autostart/)
- [Reddit: Alfred snippet window and focus limitation](https://www.reddit.com/r/Alfred/comments/wliz2a/new_to_alfred_i_love_the_text_snippets_but_i_am/)
- [Reddit: Raycast clipboard shortcut losing focus due to shortcut conflicts](https://www.reddit.com/r/raycastapp/comments/y1f8mt/losing_focus_on_windows_input_after_using/)
- [Reddit: Raycast `Alt+Space` unreliability on Windows](https://www.reddit.com/r/raycastapp/comments/1rlopno/raycast_hotkey_alt_space_and_snippet_expansion/)
