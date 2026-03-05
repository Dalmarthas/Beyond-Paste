use arboard::Clipboard;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::image::Image;
use tauri::menu::MenuBuilder;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
    AppHandle, Builder, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, State,
    WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri_plugin_global_shortcut::{Builder as GlobalShortcutBuilder, GlobalShortcutExt, ShortcutState};

#[cfg(target_os = "windows")]
use windows::core::{BOOL, PWSTR};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM, POINT, RECT};
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST};
#[cfg(target_os = "windows")]
use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION};
#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
    VIRTUAL_KEY, VK_CONTROL, VK_V,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetCursorPos, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW,
    GetWindowThreadProcessId, IsWindowVisible, SetForegroundWindow,
};

const LIBRARY_LABEL: &str = "library";
const PICKER_LABEL: &str = "picker";
const PICKER_OPEN_EVENT: &str = "picker://open";
const MENU_OPEN_LIBRARY_ID: &str = "open-library";
const MENU_QUIT_ID: &str = "quit";
const DEFAULT_HOTKEY: &str = "ctrl+shift+space";
const DEFAULT_FOCUS_DELAY_MS: i64 = 120;
const PICKER_WIDTH: u32 = 520;
const PICKER_HEIGHT: u32 = 600;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FolderRecord {
    id: i64,
    name: String,
    linked_app_executable: Option<String>,
    linked_app_display_name: Option<String>,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnippetRecord {
    id: i64,
    folder_id: i64,
    title: String,
    content: String,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    global_hotkey: String,
    launch_at_login: bool,
    focus_delay_ms: i64,
    restore_clipboard_after_paste: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            global_hotkey: DEFAULT_HOTKEY.to_string(),
            launch_at_login: false,
            focus_delay_ms: DEFAULT_FOCUS_DELAY_MS,
            restore_clipboard_after_paste: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunningApp {
    executable_name: String,
    display_name: String,
    window_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PickerContext {
    matched_folder_id: Option<i64>,
    focused_app: Option<RunningApp>,
    launched_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PickerPayload {
    context: PickerContext,
    folders: Vec<FolderRecord>,
    snippets: Vec<SnippetRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PasteResult {
    success: bool,
    used_manual_fallback: bool,
    clipboard_restored: bool,
    failure_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FolderUpsertInput {
    id: Option<i64>,
    name: String,
    linked_app_executable: Option<String>,
    linked_app_display_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnippetUpsertInput {
    id: Option<i64>,
    folder_id: i64,
    title: String,
    content: String,
}

#[derive(Debug)]
struct PickerSession {
    target_hwnd: isize,
    context: PickerContext,
}

struct AppState {
    db_path: PathBuf,
    picker_session: Mutex<Option<PickerSession>>,
    quitting: AtomicBool,
}

pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = show_library_window(app);
        }))
        .plugin(
            GlobalShortcutBuilder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let _ = open_picker(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
            fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;

            let db_path = app_data_dir.join("beyond-paste.db");
            migrate_database(&db_path)?;

            app.manage(AppState {
                db_path: db_path.clone(),
                picker_session: Mutex::new(None),
                quitting: AtomicBool::new(false),
            });

            create_picker_window(app.handle())?;
            create_tray(app.handle())?;

            let settings = load_settings(&db_path)?;
            register_hotkey(app.handle(), &settings.global_hotkey)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_folders,
            create_folder,
            update_folder,
            delete_folder,
            list_snippets,
            create_snippet,
            update_snippet,
            delete_snippet,
            get_settings,
            update_settings,
            list_running_apps,
            get_picker_payload,
            paste_snippet,
            hide_picker,
        ])
        .on_window_event(handle_window_event)
        .run(tauri::generate_context!())
        .expect("error while running Beyond Paste");
}

fn handle_window_event(window: &tauri::Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let app_handle = window.app_handle();
        let state: State<'_, AppState> = app_handle.state();
        if state.quitting.load(Ordering::SeqCst) {
            return;
        }

        api.prevent_close();
        let _ = window.hide();
    }
}

fn create_tray(app: &AppHandle) -> Result<(), String> {
    let menu = MenuBuilder::new(app)
        .text(MENU_OPEN_LIBRARY_ID, "Open Library")
        .separator()
        .text(MENU_QUIT_ID, "Quit")
        .build()
        .map_err(|error| error.to_string())?;

    let tray_icon = Image::from_bytes(include_bytes!("../icons/tray.png"))
        .map_err(|error| error.to_string())?;

    TrayIconBuilder::new()
        .icon(tray_icon)
        .menu(&menu)
        .tooltip("Beyond Paste")
        .on_menu_event(|app, event| match event.id.as_ref() {
            MENU_OPEN_LIBRARY_ID => {
                let _ = show_library_window(app);
            }
            MENU_QUIT_ID => {
                let state: State<'_, AppState> = app.state();
                state.quitting.store(true, Ordering::SeqCst);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = show_library_window(tray.app_handle());
            }
        })
        .build(app)
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn create_picker_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(existing) = app.get_webview_window(PICKER_LABEL) {
        return Ok(existing);
    }

    WebviewWindowBuilder::new(app, PICKER_LABEL, WebviewUrl::App("index.html".into()))
        .title("Beyond Paste Picker")
        .visible(false)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .inner_size(PICKER_WIDTH as f64, PICKER_HEIGHT as f64)
        .min_inner_size(PICKER_WIDTH as f64, PICKER_HEIGHT as f64)
        .max_inner_size(PICKER_WIDTH as f64, PICKER_HEIGHT as f64)
        .build()
        .map_err(|error| error.to_string())
}

fn show_library_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(LIBRARY_LABEL)
        .ok_or_else(|| "Library window is unavailable.".to_string())?;

    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

fn open_picker(app: &AppHandle) -> Result<(), String> {
    let state: State<'_, AppState> = app.state();
    let window = create_picker_window(app)?;
    let (target_hwnd, focused_app) = get_foreground_app();
    let folders = list_folders_from_db(&state.db_path)?;
    let matched_folder_id = focused_app.as_ref().and_then(|running_app| {
        folders.iter().find_map(|folder| {
            folder
                .linked_app_executable
                .as_ref()
                .filter(|linked| linked.eq_ignore_ascii_case(&running_app.executable_name))
                .map(|_| folder.id)
        })
    });

    let context = PickerContext {
        matched_folder_id,
        focused_app,
        launched_at: current_timestamp_ms(),
    };

    {
        let mut session = state
            .picker_session
            .lock()
            .map_err(|_| "Failed to lock picker state.".to_string())?;
        *session = Some(PickerSession {
            target_hwnd,
            context: context.clone(),
        });
    }

    let cursor = get_cursor_position();
    position_popup(&window, cursor.0, cursor.1)?;
    let _ = window.show();
    let _ = window.set_focus();
    app.emit_to(PICKER_LABEL, PICKER_OPEN_EVENT, context)
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn position_popup(window: &WebviewWindow, cursor_x: i32, cursor_y: i32) -> Result<(), String> {
    let (x, y) = clamp_popup_position(cursor_x, cursor_y, PICKER_WIDTH as i32, PICKER_HEIGHT as i32);
    window
        .set_size(Size::Physical(PhysicalSize::new(PICKER_WIDTH, PICKER_HEIGHT)))
        .map_err(|error| error.to_string())?;
    window
        .set_position(Position::Physical(PhysicalPosition::new(x, y)))
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn migrate_database(db_path: &Path) -> Result<(), String> {
    let connection = open_connection(db_path)?;
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                linked_app_executable TEXT,
                linked_app_display_name TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                global_hotkey TEXT NOT NULL,
                launch_at_login INTEGER NOT NULL DEFAULT 0,
                focus_delay_ms INTEGER NOT NULL DEFAULT 120,
                restore_clipboard_after_paste INTEGER NOT NULL DEFAULT 1
            );
            ",
        )
        .map_err(|error| error.to_string())?;

    connection
        .execute(
            "INSERT INTO app_settings (id, global_hotkey, launch_at_login, focus_delay_ms, restore_clipboard_after_paste)
             VALUES (1, ?1, 0, ?2, 1)
             ON CONFLICT(id) DO NOTHING",
            params![DEFAULT_HOTKEY, DEFAULT_FOCUS_DELAY_MS],
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn open_connection(db_path: &Path) -> Result<Connection, String> {
    let connection = Connection::open(db_path).map_err(|error| error.to_string())?;
    connection
        .pragma_update(None, "foreign_keys", true)
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn normalize_folder_input(input: FolderUpsertInput) -> Result<FolderUpsertInput, String> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("Folder name is required.".to_string());
    }

    let linked_app_executable = normalize_optional_text(input.linked_app_executable);
    let linked_app_display_name = normalize_optional_text(input.linked_app_display_name).or_else(|| {
        linked_app_executable
            .as_ref()
            .map(|executable| executable.trim_end_matches(".exe").to_string())
    });

    Ok(FolderUpsertInput {
        id: input.id,
        name,
        linked_app_executable,
        linked_app_display_name,
    })
}

fn normalize_snippet_input(input: SnippetUpsertInput) -> Result<SnippetUpsertInput, String> {
    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err("Snippet title is required.".to_string());
    }

    if input.content.trim().is_empty() {
        return Err("Snippet content is required.".to_string());
    }

    Ok(SnippetUpsertInput {
        id: input.id,
        folder_id: input.folder_id,
        title,
        content: input.content,
    })
}

fn map_folder(row: &rusqlite::Row<'_>) -> rusqlite::Result<FolderRecord> {
    Ok(FolderRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        linked_app_executable: row.get(2)?,
        linked_app_display_name: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn map_snippet(row: &rusqlite::Row<'_>) -> rusqlite::Result<SnippetRecord> {
    Ok(SnippetRecord {
        id: row.get(0)?,
        folder_id: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn list_folders_from_db(db_path: &Path) -> Result<Vec<FolderRecord>, String> {
    let connection = open_connection(db_path)?;
    let mut statement = connection
        .prepare(
            "SELECT id, name, linked_app_executable, linked_app_display_name, created_at, updated_at
             FROM folders
             ORDER BY lower(name) ASC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], map_folder)
        .map_err(|error| error.to_string())?;

    let mut folders = Vec::new();
    for folder in rows {
        folders.push(folder.map_err(|error| error.to_string())?);
    }

    Ok(folders)
}

fn list_snippets_from_db(db_path: &Path, folder_id: Option<i64>) -> Result<Vec<SnippetRecord>, String> {
    let connection = open_connection(db_path)?;
    let sql = if folder_id.is_some() {
        "SELECT id, folder_id, title, content, created_at, updated_at FROM snippets WHERE folder_id = ?1 ORDER BY lower(title) ASC"
    } else {
        "SELECT id, folder_id, title, content, created_at, updated_at FROM snippets ORDER BY lower(title) ASC"
    };

    let mut statement = connection.prepare(sql).map_err(|error| error.to_string())?;
    let mut snippets = Vec::new();

    if let Some(folder_id) = folder_id {
        let rows = statement
            .query_map(params![folder_id], map_snippet)
            .map_err(|error| error.to_string())?;
        for snippet in rows {
            snippets.push(snippet.map_err(|error| error.to_string())?);
        }
    } else {
        let rows = statement
            .query_map([], map_snippet)
            .map_err(|error| error.to_string())?;
        for snippet in rows {
            snippets.push(snippet.map_err(|error| error.to_string())?);
        }
    }

    Ok(snippets)
}

fn load_settings(db_path: &Path) -> Result<AppSettings, String> {
    let connection = open_connection(db_path)?;
    let settings = connection
        .query_row(
            "SELECT global_hotkey, launch_at_login, focus_delay_ms, restore_clipboard_after_paste
             FROM app_settings
             WHERE id = 1",
            [],
            |row| {
                Ok(AppSettings {
                    global_hotkey: row.get(0)?,
                    launch_at_login: row.get::<_, i64>(1)? != 0,
                    focus_delay_ms: row.get(2)?,
                    restore_clipboard_after_paste: row.get::<_, i64>(3)? != 0,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;

    Ok(settings.unwrap_or_default())
}

fn save_settings(db_path: &Path, settings: &AppSettings) -> Result<(), String> {
    let connection = open_connection(db_path)?;
    connection
        .execute(
            "UPDATE app_settings
             SET global_hotkey = ?1,
                 launch_at_login = ?2,
                 focus_delay_ms = ?3,
                 restore_clipboard_after_paste = ?4
             WHERE id = 1",
            params![
                settings.global_hotkey,
                if settings.launch_at_login { 1 } else { 0 },
                settings.focus_delay_ms,
                if settings.restore_clipboard_after_paste { 1 } else { 0 }
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn current_timestamp_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[tauri::command]
fn list_folders(state: State<'_, AppState>) -> Result<Vec<FolderRecord>, String> {
    list_folders_from_db(&state.db_path)
}

#[tauri::command]
fn create_folder(state: State<'_, AppState>, input: FolderUpsertInput) -> Result<FolderRecord, String> {
    let input = normalize_folder_input(input)?;
    let connection = open_connection(&state.db_path)?;
    let now = current_timestamp_ms();

    connection
        .execute(
            "INSERT INTO folders (name, linked_app_executable, linked_app_display_name, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?4)",
            params![input.name, input.linked_app_executable, input.linked_app_display_name, now],
        )
        .map_err(|error| error.to_string())?;

    let id = connection.last_insert_rowid();
    connection
        .query_row(
            "SELECT id, name, linked_app_executable, linked_app_display_name, created_at, updated_at
             FROM folders WHERE id = ?1",
            params![id],
            map_folder,
        )
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn update_folder(state: State<'_, AppState>, input: FolderUpsertInput) -> Result<FolderRecord, String> {
    let input = normalize_folder_input(input)?;
    let id = input.id.ok_or_else(|| "Folder id is required.".to_string())?;
    let connection = open_connection(&state.db_path)?;
    let now = current_timestamp_ms();

    connection
        .execute(
            "UPDATE folders
             SET name = ?1,
                 linked_app_executable = ?2,
                 linked_app_display_name = ?3,
                 updated_at = ?4
             WHERE id = ?5",
            params![input.name, input.linked_app_executable, input.linked_app_display_name, now, id],
        )
        .map_err(|error| error.to_string())?;

    connection
        .query_row(
            "SELECT id, name, linked_app_executable, linked_app_display_name, created_at, updated_at
             FROM folders WHERE id = ?1",
            params![id],
            map_folder,
        )
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_folder(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let connection = open_connection(&state.db_path)?;
    connection
        .execute("DELETE FROM folders WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_snippets(state: State<'_, AppState>, folder_id: Option<i64>) -> Result<Vec<SnippetRecord>, String> {
    list_snippets_from_db(&state.db_path, folder_id)
}

#[tauri::command]
fn create_snippet(state: State<'_, AppState>, input: SnippetUpsertInput) -> Result<SnippetRecord, String> {
    let input = normalize_snippet_input(input)?;
    let connection = open_connection(&state.db_path)?;
    let now = current_timestamp_ms();

    connection
        .execute(
            "INSERT INTO snippets (folder_id, title, content, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?4)",
            params![input.folder_id, input.title, input.content, now],
        )
        .map_err(|error| error.to_string())?;

    let id = connection.last_insert_rowid();
    connection
        .query_row(
            "SELECT id, folder_id, title, content, created_at, updated_at
             FROM snippets WHERE id = ?1",
            params![id],
            map_snippet,
        )
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn update_snippet(state: State<'_, AppState>, input: SnippetUpsertInput) -> Result<SnippetRecord, String> {
    let input = normalize_snippet_input(input)?;
    let id = input.id.ok_or_else(|| "Snippet id is required.".to_string())?;
    let connection = open_connection(&state.db_path)?;
    let now = current_timestamp_ms();

    connection
        .execute(
            "UPDATE snippets
             SET folder_id = ?1,
                 title = ?2,
                 content = ?3,
                 updated_at = ?4
             WHERE id = ?5",
            params![input.folder_id, input.title, input.content, now, id],
        )
        .map_err(|error| error.to_string())?;

    connection
        .query_row(
            "SELECT id, folder_id, title, content, created_at, updated_at
             FROM snippets WHERE id = ?1",
            params![id],
            map_snippet,
        )
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn delete_snippet(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let connection = open_connection(&state.db_path)?;
    connection
        .execute("DELETE FROM snippets WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    load_settings(&state.db_path)
}

#[tauri::command]
fn update_settings(state: State<'_, AppState>, app: AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
    if settings.global_hotkey.trim().is_empty() {
        return Err("Hotkey is required.".to_string());
    }

    if settings.focus_delay_ms < 0 || settings.focus_delay_ms > 2000 {
        return Err("Focus delay must be between 0 and 2000 ms.".to_string());
    }

    register_hotkey(&app, &settings.global_hotkey)?;
    save_settings(&state.db_path, &settings)?;
    Ok(settings)
}

#[tauri::command]
fn list_running_apps() -> Result<Vec<RunningApp>, String> {
    running_apps()
}

#[tauri::command]
fn get_picker_payload(state: State<'_, AppState>) -> Result<PickerPayload, String> {
    let session = state
        .picker_session
        .lock()
        .map_err(|_| "Failed to lock picker state.".to_string())?;

    Ok(PickerPayload {
        context: session.as_ref().map(|item| item.context.clone()).unwrap_or_default(),
        folders: list_folders_from_db(&state.db_path)?,
        snippets: list_snippets_from_db(&state.db_path, None)?,
    })
}

#[tauri::command]
fn hide_picker(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(PICKER_LABEL) {
        let _ = window.hide();
    }
    Ok(())
}

#[tauri::command]
fn paste_snippet(state: State<'_, AppState>, app: AppHandle, content: String) -> Result<PasteResult, String> {
    let settings = load_settings(&state.db_path)?;
    let target_hwnd = {
        let session = state
            .picker_session
            .lock()
            .map_err(|_| "Failed to lock picker state.".to_string())?;
        session.as_ref().map(|item| item.target_hwnd).unwrap_or_default()
    };

    if let Some(window) = app.get_webview_window(PICKER_LABEL) {
        let _ = window.hide();
    }

    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;
    let previous_text = clipboard.get_text().ok();
    clipboard.set_text(content).map_err(|error| error.to_string())?;

    if target_hwnd == 0 {
        return Ok(PasteResult {
            success: false,
            used_manual_fallback: true,
            clipboard_restored: false,
            failure_reason: Some("The original target window is no longer available. Paste manually.".to_string()),
        });
    }

    if !restore_focus_to_window(target_hwnd) {
        return Ok(PasteResult {
            success: false,
            used_manual_fallback: true,
            clipboard_restored: false,
            failure_reason: Some("Could not return focus to the previous application. Paste manually.".to_string()),
        });
    }

    thread::sleep(Duration::from_millis(settings.focus_delay_ms as u64));

    if !send_paste_shortcut() {
        return Ok(PasteResult {
            success: false,
            used_manual_fallback: true,
            clipboard_restored: false,
            failure_reason: Some("Could not send the paste shortcut. Paste manually.".to_string()),
        });
    }

    thread::sleep(Duration::from_millis(80));

    let clipboard_restored = if settings.restore_clipboard_after_paste {
        if let Some(previous_text) = previous_text {
            Clipboard::new()
                .and_then(|mut value| value.set_text(previous_text))
                .is_ok()
        } else {
            false
        }
    } else {
        false
    };

    Ok(PasteResult {
        success: true,
        used_manual_fallback: false,
        clipboard_restored,
        failure_reason: None,
    })
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| error.to_string())?;
    app.global_shortcut()
        .register(hotkey)
        .map_err(|error| format!("Failed to register hotkey '{hotkey}': {error}"))?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn get_foreground_app() -> (isize, Option<RunningApp>) {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return (0, None);
        }

        let app = running_app_from_hwnd(hwnd);
        (hwnd.0 as isize, app)
    }
}

#[cfg(not(target_os = "windows"))]
fn get_foreground_app() -> (isize, Option<RunningApp>) {
    (0, None)
}

#[cfg(target_os = "windows")]
fn get_cursor_position() -> (i32, i32) {
    unsafe {
        let mut point = POINT::default();
        if GetCursorPos(&mut point).is_ok() {
            (point.x, point.y)
        } else {
            (300, 300)
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn get_cursor_position() -> (i32, i32) {
    (300, 300)
}

#[cfg(target_os = "windows")]
fn clamp_popup_position(cursor_x: i32, cursor_y: i32, width: i32, height: i32) -> (i32, i32) {
    unsafe {
        let monitor = MonitorFromPoint(POINT { x: cursor_x, y: cursor_y }, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };

        if GetMonitorInfoW(monitor, &mut info as *mut MONITORINFO).as_bool() {
            clamp_to_rect(cursor_x, cursor_y, width, height, info.rcWork)
        } else {
            (cursor_x, cursor_y)
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn clamp_popup_position(cursor_x: i32, cursor_y: i32, _width: i32, _height: i32) -> (i32, i32) {
    (cursor_x, cursor_y)
}

#[cfg(target_os = "windows")]
fn clamp_to_rect(cursor_x: i32, cursor_y: i32, width: i32, height: i32, rect: RECT) -> (i32, i32) {
    let margin = 12;
    let preferred_x = cursor_x + 16;
    let preferred_y = cursor_y + 20;
    let max_x = rect.right - width - margin;
    let max_y = rect.bottom - height - margin;
    let min_x = rect.left + margin;
    let min_y = rect.top + margin;

    (
        preferred_x.clamp(min_x, max_x.max(min_x)),
        preferred_y.clamp(min_y, max_y.max(min_y)),
    )
}

#[cfg(target_os = "windows")]
fn running_apps() -> Result<Vec<RunningApp>, String> {
    unsafe extern "system" fn callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        if !IsWindowVisible(hwnd).as_bool() {
            return BOOL(1);
        }

        let apps = &mut *(lparam.0 as *mut Vec<RunningApp>);
        if let Some(app) = running_app_from_hwnd(hwnd) {
            if app.window_title.as_deref().unwrap_or_default().is_empty() {
                return BOOL(1);
            }
            apps.push(app);
        }

        BOOL(1)
    }

    let mut collected = Vec::<RunningApp>::new();
    unsafe {
        let parameter = LPARAM((&mut collected as *mut Vec<RunningApp>) as isize);
        let _ = EnumWindows(Some(callback), parameter);
    }

    let mut by_executable = BTreeMap::<String, RunningApp>::new();
    for app in collected {
        by_executable
            .entry(app.executable_name.to_ascii_lowercase())
            .and_modify(|existing| {
                if existing.window_title.is_none() && app.window_title.is_some() {
                    *existing = app.clone();
                }
            })
            .or_insert(app);
    }

    Ok(by_executable.into_values().collect())
}

#[cfg(not(target_os = "windows"))]
fn running_apps() -> Result<Vec<RunningApp>, String> {
    Ok(Vec::new())
}

#[cfg(target_os = "windows")]
unsafe fn running_app_from_hwnd(hwnd: HWND) -> Option<RunningApp> {
    let executable_name = executable_name_for_window(hwnd)?;
    let window_title = window_title_for_window(hwnd);
    let display_name = executable_name.trim_end_matches(".exe").to_string();

    Some(RunningApp {
        executable_name,
        display_name,
        window_title,
    })
}

#[cfg(target_os = "windows")]
unsafe fn executable_name_for_window(hwnd: HWND) -> Option<String> {
    let mut process_id = 0u32;
    GetWindowThreadProcessId(hwnd, Some(&mut process_id));
    if process_id == 0 {
        return None;
    }

    let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id).ok()?;
    let mut buffer = vec![0u16; 260];
    let mut length = buffer.len() as u32;
    let success = QueryFullProcessImageNameW(process, windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0), PWSTR(buffer.as_mut_ptr()), &mut length).is_ok();
    let _ = CloseHandle(process);

    if !success {
        return None;
    }

    let path = String::from_utf16_lossy(&buffer[..length as usize]);
    Path::new(&path)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
}

#[cfg(target_os = "windows")]
unsafe fn window_title_for_window(hwnd: HWND) -> Option<String> {
    let length = GetWindowTextLengthW(hwnd);
    if length <= 0 {
        return None;
    }

    let mut buffer = vec![0u16; length as usize + 1];
    let read = GetWindowTextW(hwnd, &mut buffer);
    if read <= 0 {
        return None;
    }

    Some(String::from_utf16_lossy(&buffer[..read as usize]))
}

#[cfg(target_os = "windows")]
fn restore_focus_to_window(target_hwnd: isize) -> bool {
    unsafe { SetForegroundWindow(HWND(target_hwnd as *mut _)).as_bool() }
}

#[cfg(not(target_os = "windows"))]
fn restore_focus_to_window(_target_hwnd: isize) -> bool {
    false
}

#[cfg(target_os = "windows")]
fn send_paste_shortcut() -> bool {
    unsafe {
        let key_down_control = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(VK_CONTROL.0 as u16),
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        let key_down_v = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(VK_V.0 as u16),
                    wScan: 0,
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        let key_up_v = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(VK_V.0 as u16),
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        let key_up_control = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(VK_CONTROL.0 as u16),
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };

        let mut inputs = [key_down_control, key_down_v, key_up_v, key_up_control];
        SendInput(&mut inputs, std::mem::size_of::<INPUT>() as i32) == inputs.len() as u32
    }
}

#[cfg(not(target_os = "windows"))]
fn send_paste_shortcut() -> bool {
    false
}





