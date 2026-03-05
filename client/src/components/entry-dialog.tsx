import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFolders } from "@/hooks/use-folders";
import { useCreateEntry, useUpdateEntry } from "@/hooks/use-entries";
import type { Entry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryToEdit?: Entry;
  defaultFolderId?: number;
}

export function EntryDialog({ open, onOpenChange, entryToEdit, defaultFolderId }: EntryDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState<string>("");

  const { data: folders } = useFolders();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const { toast } = useToast();

  useEffect(() => {
    if (entryToEdit) {
      setTitle(entryToEdit.title);
      setContent(entryToEdit.content);
      setFolderId(entryToEdit.folderId.toString());
    } else {
      setTitle("");
      setContent("");
      setFolderId(defaultFolderId ? defaultFolderId.toString() : "");
    }
  }, [entryToEdit, defaultFolderId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !folderId) return;

    try {
      if (entryToEdit) {
        await updateEntry.mutateAsync({
          id: entryToEdit.id,
          title,
          content,
          folderId: parseInt(folderId, 10),
        });
        toast({ title: "Entry updated" });
      } else {
        await createEntry.mutateAsync({
          title,
          content,
          folderId: parseInt(folderId, 10),
        });
        toast({ title: "Entry created" });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isPending = createEntry.isPending || updateEntry.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{entryToEdit ? "Edit Phrase" : "Add New Phrase"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="folderId">Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent className="glass-panel">
                {folders?.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id.toString()}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Title / Shortcut</Label>
            <Input
              id="title"
              placeholder="e.g. Connect DB"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background/50 focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Snippet Content</Label>
            <Textarea
              id="content"
              placeholder="Paste your code or phrase here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] font-mono text-sm bg-background/50 focus-visible:ring-primary/50 resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !title.trim() || !content.trim() || !folderId}
              className="bg-primary/90 hover:bg-primary text-primary-foreground hover-elevate active-elevate-2 shadow-lg shadow-primary/20"
            >
              {isPending ? "Saving..." : entryToEdit ? "Save Changes" : "Create Phrase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
