import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEntries } from "@/hooks/use-entries";
import { useFolders } from "@/hooks/use-folders";
import { Terminal, Folder as FolderIcon, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { data: entries } = useEntries();
  const { data: folders } = useFolders();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Keyboard shortcut listener (Cmd+K or Ctrl+K to toggle)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = async (content: string, id: number, title: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast({
        title: "Copied!",
        description: `"${title}" has been copied to clipboard.`,
      });
      setTimeout(() => {
        setCopiedId(null);
        onOpenChange(false);
      }, 500);
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Heavy blur backdrop to mimic Spotlight/Raycast */}
      <DialogContent className="p-0 overflow-hidden bg-background/60 backdrop-blur-2xl border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border sm:max-w-[600px] [&>button]:hidden">
        <Command className="bg-transparent text-foreground">
          <CommandInput 
            placeholder="Search phrases, commands, prompts..." 
            className="h-14 text-lg border-b border-white/5"
            autoFocus
          />
          <CommandList className="max-h-[400px] custom-scrollbar">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No phrases found.
            </CommandEmpty>
            
            {folders?.map((folder) => {
              const folderEntries = entries?.filter(e => e.folderId === folder.id);
              if (!folderEntries || folderEntries.length === 0) return null;

              return (
                <CommandGroup 
                  key={folder.id} 
                  heading={
                    <div className="flex items-center gap-2 text-primary/70 font-medium px-2">
                      <FolderIcon className="h-3.5 w-3.5" />
                      {folder.name}
                    </div>
                  }
                  className="py-2"
                >
                  {folderEntries.map((entry) => (
                    <CommandItem
                      key={entry.id}
                      value={`${folder.name} ${entry.title} ${entry.content}`}
                      onSelect={() => handleSelect(entry.content, entry.id, entry.title)}
                      className="flex flex-col items-start px-4 py-3 cursor-pointer aria-selected:bg-white/10 aria-selected:text-white group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-muted-foreground group-aria-selected:text-primary transition-colors" />
                          <span className="font-semibold">{entry.title}</span>
                        </div>
                        {copiedId === entry.id ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <span className="text-xs text-muted-foreground opacity-0 group-aria-selected:opacity-100 transition-opacity">
                            ↵ to copy
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 line-clamp-1 font-mono w-full pr-8">
                        {entry.content}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
