import { useMemo, useState } from "react";
import {
  Folder as FolderIcon,
  Hash,
  MoreVertical,
  Plus,
  Settings2,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/brand-logo";
import { EntryCard } from "@/components/entry-card";
import { EntryDialog } from "@/components/entry-dialog";
import { FolderDialog } from "@/components/folder-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { useEntries } from "@/hooks/use-entries";
import { useFolders } from "@/hooks/use-folders";
import { useSettings } from "@/hooks/use-settings";
import type { Folder, Snippet } from "@shared/schema";

function formatHotkeyLabel(hotkey: string) {
  return hotkey
    .split("+")
    .map((part) => (part === "ctrl" ? "Ctrl" : part === "alt" ? "Alt" : part === "shift" ? "Shift" : part === "space" ? "Space" : part.toUpperCase()))
    .join(" + ");
}

export default function Dashboard() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | undefined>(undefined);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Snippet | undefined>(undefined);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const folders = useFolders();
  const entries = useEntries(selectedFolderId ?? undefined);
  const settings = useSettings();

  const activeFolder = useMemo(
    () => folders.data?.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders.data, selectedFolderId],
  );

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-background": "var(--card)",
    "--sidebar-border": "rgba(255,255,255,0.05)",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar className="border-r border-white/5 bg-black/20 backdrop-blur-md">
          <SidebarHeader className="flex items-center justify-between border-b border-white/5 p-4">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-11" />
              <div>
                <div className="font-display text-lg font-bold tracking-wide text-glow">Beyond Paste</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSettingsDialogOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Folders
              </SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedFolderId === null} onClick={() => setSelectedFolderId(null)}>
                    <Hash className="h-4 w-4" />
                    <span>All Snippets</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {folders.data?.map((folder) => (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton
                      isActive={selectedFolderId === folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="group flex items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FolderIcon className="h-4 w-4 text-primary/80" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel">
                          <DropdownMenuItem
                            onClick={(event) => {
                              event.stopPropagation();
                              setFolderToEdit(folder);
                              setFolderDialogOpen(true);
                            }}
                          >
                            Edit Folder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="gap-2 border-t border-white/5 p-4">
            <Button
              variant="outline"
              className="glass-card w-full justify-start"
              onClick={() => {
                setFolderToEdit(undefined);
                setFolderDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-3 text-xs text-white/85">
              <div className="mb-1 flex items-center gap-2 font-medium text-primary/90">
                <Keyboard className="h-3.5 w-3.5" /> Quick open
              </div>
              <div>{settings.data ? formatHotkeyLabel(settings.data.globalHotkey) : "Loading..."}</div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-[420px] bg-gradient-to-b from-primary/10 to-transparent" />

          <header className="relative z-10 flex items-start justify-between gap-4 border-b border-white/5 px-8 py-6 backdrop-blur-sm">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">{activeFolder?.name ?? "All Snippets"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeFolder?.linkedAppExecutable
                  ? `Linked to ${activeFolder.linkedAppDisplayName ?? activeFolder.linkedAppExecutable} (${activeFolder.linkedAppExecutable})`
                  : "Library management window for your reusable prompts, commands, and phrases."}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="glass-card" onClick={() => setSettingsDialogOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button
                onClick={() => {
                  setEntryToEdit(undefined);
                  setEntryDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Snippet
              </Button>
            </div>
          </header>

          <main className="relative z-10 flex-1 overflow-y-auto p-8">
            {folders.isLoading || entries.isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
                ))}
              </div>
            ) : entries.data && entries.data.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence>
                  {entries.data.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={(value) => {
                        setEntryToEdit(value);
                        setEntryDialogOpen(true);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/10 px-8 py-12 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <Sparkles className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="mb-2 text-2xl font-display font-bold">No snippets yet</h2>
                <p className="mb-8 text-muted-foreground">
                  {selectedFolderId
                    ? "This folder is empty. Add prompts or reusable text so it shows up in the popup picker."
                    : "Create a folder and add your first snippet to start building the library."}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="glass-card"
                    onClick={() => {
                      setFolderToEdit(undefined);
                      setFolderDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Folder
                  </Button>
                  <Button
                    onClick={() => {
                      setEntryToEdit(undefined);
                      setEntryDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Snippet
                  </Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folderToEdit={folderToEdit}
        onSuccess={() => {
          if (folderToEdit?.id === selectedFolderId) {
            setSelectedFolderId(null);
          }
        }}
      />
      <EntryDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        entryToEdit={entryToEdit}
        defaultFolderId={selectedFolderId ?? undefined}
      />
      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
    </SidebarProvider>
  );
}
