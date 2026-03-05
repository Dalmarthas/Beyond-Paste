import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateFolder, useUpdateFolder, useDeleteFolder } from "@/hooks/use-folders";
import type { Folder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

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
      setTargetApp(folderToEdit.targetApp || "");
    } else {
      setName("");
      setTargetApp("");
    }
  }, [folderToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (folderToEdit) {
        await updateFolder.mutateAsync({ 
          id: folderToEdit.id, 
          name, 
          targetApp: targetApp.trim() || undefined 
        });
        toast({ title: "Folder updated" });
      } else {
        await createFolder.mutateAsync({ 
          name, 
          targetApp: targetApp.trim() || undefined 
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
            <Label htmlFor="targetApp">Target App (Optional)</Label>
            <Input
              id="targetApp"
              placeholder="e.g. VS Code, Chrome"
              value={targetApp}
              onChange={(e) => setTargetApp(e.target.value)}
              className="bg-background/50 focus-visible:ring-primary/50"
            />
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
