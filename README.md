# Beyond Paste

Windows-first desktop snippet launcher built with React, Vite, Tauri, and local SQLite.

## What it does

- Organizes reusable prompts, commands, and phrases into folders.
- Lets each folder be linked to a Windows executable such as `Code.exe` or `Cursor.exe`.
- Runs in the tray and opens a small picker window with a global hotkey.
- Copies the selected snippet, restores focus to the previous app, and sends `Ctrl+V`.
- Falls back to manual paste when Windows focus or input rules block automatic paste.

## Development

Install dependencies:

```powershell
npm install
```

Run the frontend only:

```powershell
npm run dev
```

Run the desktop app in Tauri dev mode:

```powershell
npm run tauri:dev
```

Check TypeScript:

```powershell
npm run check
```

Build the frontend bundle:

```powershell
npm run build
```

Build the Windows desktop packages:

```powershell
npm run tauri:build -- --debug
```

## Output

The Windows build artifacts are written under:

- `src-tauri/target/debug/beyond-paste.exe`
- `src-tauri/target/debug/bundle/msi/`
- `src-tauri/target/debug/bundle/nsis/`

## Product docs

- PRD: `docs/prd/beyond-paste-windows-mvp.md`
