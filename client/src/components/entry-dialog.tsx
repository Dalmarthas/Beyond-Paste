import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateEntry, useUpdateEntry } from "@/hooks/use-entries";
import { useFolders } from "@/hooks/use-folders";
import { useToast } from "@/hooks/use-toast";
import type { QuickCaptureDraft, Snippet } from "@shared/schema";

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryToEdit?: Snippet;
  defaultFolderId?: number;
  quickCaptureDraft?: QuickCaptureDraft | null;
}

export function EntryDialog({ open, onOpenChange, entryToEdit, defaultFolderId, quickCaptureDraft }: EntryDialogProps) {
  const { data: folders } = useFolders();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (entryToEdit) {
      setTitle(entryToEdit.title);
      setContent(entryToEdit.content);
      setFolderId(entryToEdit.folderId.toString());
      return;
    }

    const initialFolderId = quickCaptureDraft?.matchedFolderId ?? defaultFolderId ?? folders?.[0]?.id;
    setTitle(quickCaptureDraft?.title ?? "");
    setContent(quickCaptureDraft?.content ?? "");
    setFolderId(initialFolderId ? initialFolderId.toString() : "");
  }, [defaultFolderId, entryToEdit, folders, open, quickCaptureDraft]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!folderId || !title.trim() || !content.trim()) {
      return;
    }

    try {
      if (entryToEdit) {
        await updateEntry.mutateAsync({
          id: entryToEdit.id,
          folderId: Number(folderId),
          title: title.trim(),
          content,
        });
        toast({ title: "Snippet updated" });
      } else {
        await createEntry.mutateAsync({
          folderId: Number(folderId),
          title: title.trim(),
          content,
        });
        toast({ title: "Snippet created" });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Snippet save failed",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "destructive",
      });
    }
  }

  const isPending = createEntry.isPending || updateEntry.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{entryToEdit ? "Edit Snippet" : "Add Snippet"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {!entryToEdit && quickCaptureDraft?.focusedApp ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-white/85">
              <div className="font-medium text-primary/90">
                Captured from {quickCaptureDraft.focusedApp.displayName}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {quickCaptureDraft.matchedFolderId
                  ? "The folder linked to this app was selected automatically."
                  : "No folder is linked to this app yet. Choose a folder below, or create one for this app first."}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="entry-folder">Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="entry-folder" className="bg-background/50">
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
            <Label htmlFor="entry-title">Title</Label>
            <Input
              id="entry-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Refactor prompt"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-content">Snippet content</Label>
            <Textarea
              id="entry-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[180px] resize-none bg-background/50 font-mono text-sm"
              placeholder="Paste your reusable phrase or prompt here..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!folderId || !title.trim() || !content.trim() || isPending}>
              {isPending ? "Saving..." : entryToEdit ? "Save Changes" : "Create Snippet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
