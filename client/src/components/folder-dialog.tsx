import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateFolder, useUpdateFolder, useDeleteFolder } from "@/hooks/use-folders";
import type { Folder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Laptop, Globe, MessageSquare, Terminal as TerminalIcon, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMMON_APPS = [
  { name: "VS Code", icon: TerminalIcon },
  { name: "Chrome", icon: Globe },
  { name: "Slack", icon: MessageSquare },
  { name: "Terminal", icon: Laptop },
  { name: "ChatGPT", icon: Sparkles },
];

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderToEdit?: Folder;
  onSuccess?: () => void;
}

export function FolderDialog({ open, onOpenChange, folderToEdit, onSuccess }: FolderDialogProps) {
  const [name, setName] = useState("");
  const [targetApp, setTargetApp] = useState("");
  
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const { toast } = useToast();

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      setTargetApp(folderToEdit.targetApp || "none");
    } else {
      setName("");
      setTargetApp("none");
    }
  }, [folderToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const appValue = targetApp === "none" ? null : targetApp;
      if (folderToEdit) {
        await updateFolder.mutateAsync({ 
          id: folderToEdit.id, 
          name, 
          targetApp: appValue
        });
        toast({ title: "Folder updated" });
      } else {
        await createFolder.mutateAsync({ 
          name, 
          targetApp: appValue
        });
        toast({ title: "Folder created" });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!folderToEdit) return;
    if (!confirm("Are you sure you want to delete this folder and all its entries?")) return;
    
    try {
      await deleteFolder.mutateAsync(folderToEdit.id);
      toast({ title: "Folder deleted" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isPending = createFolder.isPending || updateFolder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{folderToEdit ? "Edit Folder" : "Create New Folder"}</DialogTitle>
          <DialogDescription>
            Organize your quick-access phrases. You can tie a folder to a specific app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              placeholder="e.g. Codex Prompts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 focus-visible:ring-primary/50"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetApp">Target App</Label>
            <Select value={targetApp} onValueChange={setTargetApp}>
              <SelectTrigger className="bg-background/50 focus:ring-primary/50">
                <SelectValue placeholder="Select an application" />
              </SelectTrigger>
              <SelectContent className="glass-panel">
                <SelectItem value="none">No specific app</SelectItem>
                {COMMON_APPS.map((app) => (
                  <SelectItem key={app.name} value={app.name}>
                    <div className="flex items-center gap-2">
                      <app.icon className="h-4 w-4 text-muted-foreground" />
                      {app.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Hotkeys will auto-select this folder when the app is focused.
            </p>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            {folderToEdit ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={deleteFolder.isPending}
                className="hover-elevate active-elevate-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <div /> // Spacer
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending || !name.trim()}
                className="bg-primary/90 hover:bg-primary text-primary-foreground hover-elevate active-elevate-2 shadow-lg shadow-primary/20"
              >
                {isPending ? "Saving..." : folderToEdit ? "Save Changes" : "Create Folder"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
