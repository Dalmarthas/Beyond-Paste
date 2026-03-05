import { useState } from "react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useFolders } from "@/hooks/use-folders";
import { useEntries } from "@/hooks/use-entries";
import { Folder, Search, Plus, Settings2, Command as CmdIcon, Hash, MoreVertical } from "lucide-react";
import { FolderDialog } from "@/components/folder-dialog";
import { EntryDialog } from "@/components/entry-dialog";
import { EntryCard } from "@/components/entry-card";
import { CommandPalette } from "@/components/command-palette";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Folder as FolderType, Entry } from "@shared/schema";
import { AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  
  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FolderType | undefined>(undefined);
  
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Entry | undefined>(undefined);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { data: folders, isLoading: foldersLoading } = useFolders();
  const { data: entries, isLoading: entriesLoading } = useEntries(selectedFolderId || undefined);

  const activeFolder = folders?.find(f => f.id === selectedFolderId);

  const openNewFolder = () => {
    setFolderToEdit(undefined);
    setFolderDialogOpen(true);
  };

  const openEditFolder = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToEdit(folder);
    setFolderDialogOpen(true);
  };

  const openNewEntry = () => {
    setEntryToEdit(undefined);
    setEntryDialogOpen(true);
  };

  const openEditEntry = (entry: Entry) => {
    setEntryToEdit(entry);
    setEntryDialogOpen(true);
  };

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-background": "var(--card)",
    "--sidebar-border": "rgba(255,255,255,0.05)"
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full overflow-hidden">
        {/* SIDEBAR */}
        <Sidebar className="border-r border-white/5 backdrop-blur-md bg-black/20">
          <SidebarHeader className="p-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <CommandIcon className="h-4 w-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-glow tracking-wide">QuickPaste</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Collections
              </SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={selectedFolderId === null}
                    onClick={() => setSelectedFolderId(null)}
                    className="hover-elevate transition-all"
                  >
                    <Hash className="h-4 w-4" />
                    <span>All Phrases</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {folders?.map((folder) => (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton
                      isActive={selectedFolderId === folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="group flex justify-between items-center hover-elevate transition-all"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Folder className="h-4 w-4 text-primary/80" />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel">
                          <DropdownMenuItem onClick={(e) => openEditFolder(folder, e as any)}>
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
          
          <SidebarFooter className="p-4 border-t border-white/5 gap-2">
            <Button 
              variant="outline" 
              className="w-full justify-start glass-card hover:bg-white/10"
              onClick={openNewFolder}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
            <Button 
              variant="default" 
              className="w-full justify-between bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 hover-elevate"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <span className="flex items-center"><Search className="mr-2 h-4 w-4" /> Spotlight Mode</span>
              <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 font-mono text-[10px] font-medium text-primary">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* MAIN CONTENT */}
        <div className="flex flex-col flex-1 min-w-0 bg-transparent relative">
          {/* Subtle top glare */}
          <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <header className="flex items-center justify-between px-8 py-6 border-b border-white/5 relative z-10 backdrop-blur-sm">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                {activeFolder ? activeFolder.name : "All Phrases"}
              </h1>
              {activeFolder?.targetApp && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Settings2 className="h-3 w-3" /> Targeted to: <span className="font-medium text-primary/80">{activeFolder.targetApp}</span>
                </p>
              )}
            </div>
            <Button 
              onClick={openNewEntry}
              className="bg-white text-black hover:bg-white/90 hover-elevate active-elevate-2 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.15)] rounded-xl px-6"
            >
              <Plus className="mr-2 h-4 w-4" /> New Phrase
            </Button>
          </header>

          <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
            {foldersLoading || entriesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-[200px] rounded-2xl bg-white/5 animate-pulse border border-white/10" />
                ))}
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {entries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} onEdit={openEditEntry} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 shadow-inner border border-white/10">
                  <CmdIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-2">No phrases yet</h3>
                <p className="text-muted-foreground mb-8">
                  {selectedFolderId 
                    ? "This folder is empty. Add some text snippets or commands you use frequently."
                    : "Create a folder and add some phrases to get started."}
                </p>
                <Button 
                  onClick={openNewEntry} 
                  variant="outline"
                  className="glass-card hover:bg-white/10 h-12 px-8 rounded-xl"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add your first phrase
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Dialogs */}
      <FolderDialog 
        open={folderDialogOpen} 
        onOpenChange={setFolderDialogOpen} 
        folderToEdit={folderToEdit} 
        onSuccess={() => {
          // If deleted active folder, reset selection
          if (folderToEdit && !folders?.find(f => f.id === folderToEdit.id)) {
            setSelectedFolderId(null);
          }
        }}
      />
      <EntryDialog 
        open={entryDialogOpen} 
        onOpenChange={setEntryDialogOpen} 
        entryToEdit={entryToEdit}
        defaultFolderId={selectedFolderId || undefined}
      />
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
    </SidebarProvider>
  );
}

// Temporary alias for lucide icon to avoid naming conflict
const CommandIcon = CmdIcon;
