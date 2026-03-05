import { useEffect, useMemo, useState } from "react";
import { AppWindow, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeleteFolder, useCreateFolder, useUpdateFolder } from "@/hooks/use-folders";
import { useRunningApps } from "@/hooks/use-running-apps";
import { useToast } from "@/hooks/use-toast";
import type { Folder } from "@shared/schema";

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderToEdit?: Folder;
  onSuccess?: () => void;
}

export function FolderDialog({ open, onOpenChange, folderToEdit, onSuccess }: FolderDialogProps) {
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const runningApps = useRunningApps();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [linkedExecutable, setLinkedExecutable] = useState("");
  const [linkedDisplayName, setLinkedDisplayName] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(folderToEdit?.name ?? "");
    setLinkedExecutable(folderToEdit?.linkedAppExecutable ?? "");
    setLinkedDisplayName(folderToEdit?.linkedAppDisplayName ?? "");
    void runningApps.refetch();
  }, [folderToEdit, open]);

  const selectedApp = useMemo(() => {
    return runningApps.data?.find((app) => app.executableName === linkedExecutable) ?? null;
  }, [linkedExecutable, runningApps.data]);

  const isPending = createFolder.isPending || updateFolder.isPending || deleteFolder.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    const executable = linkedExecutable.trim() || null;
    const displayName = executable
      ? linkedDisplayName.trim() || selectedApp?.displayName || executable.replace(/\.exe$/i, "")
      : null;

    try {
      if (folderToEdit) {
        await updateFolder.mutateAsync({
          id: folderToEdit.id,
          name: name.trim(),
          linkedAppExecutable: executable,
          linkedAppDisplayName: displayName,
        });
        toast({ title: "Folder updated" });
      } else {
        await createFolder.mutateAsync({
          name: name.trim(),
          linkedAppExecutable: executable,
          linkedAppDisplayName: displayName,
        });
        toast({ title: "Folder created" });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Folder save failed",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    if (!folderToEdit) {
      return;
    }

    if (!confirm(`Delete folder "${folderToEdit.name}" and all snippets inside it?`)) {
      return;
    }

    try {
      await deleteFolder.mutateAsync(folderToEdit.id);
      toast({ title: "Folder deleted" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Folder delete failed",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{folderToEdit ? "Edit Folder" : "Create Folder"}</DialogTitle>
          <DialogDescription>
            Link a folder to a Windows app by executable name so the picker can scope itself automatically.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Codex prompts"
              className="bg-background/50"
              autoFocus
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Pick from running apps</Label>
                <p className="text-xs text-muted-foreground">This fills in the executable name for you.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => void runningApps.refetch()}>
                <RefreshCw className={`h-4 w-4 ${runningApps.isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <Select
              value={selectedApp?.executableName ?? "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setLinkedExecutable("");
                  setLinkedDisplayName("");
                  return;
                }
                const app = runningApps.data?.find((item) => item.executableName === value);
                if (app) {
                  setLinkedExecutable(app.executableName);
                  setLinkedDisplayName(app.displayName);
                }
              }}
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="No linked app" />
              </SelectTrigger>
              <SelectContent className="glass-panel max-h-72">
                <SelectItem value="none">No linked app</SelectItem>
                {runningApps.data?.map((app) => (
                  <SelectItem key={app.executableName} value={app.executableName}>
                    <div className="flex flex-col">
                      <span>{app.displayName}</span>
                      <span className="text-xs text-muted-foreground">{app.executableName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-executable">Executable match</Label>
            <Input
              id="folder-executable"
              value={linkedExecutable}
              onChange={(event) => setLinkedExecutable(event.target.value)}
              placeholder="Code.exe"
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">Use the executable name shown in Task Manager, for example `Code.exe` or `Cursor.exe`.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-display-name">Display name</Label>
            <div className="relative">
              <AppWindow className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="folder-display-name"
                value={linkedDisplayName}
                onChange={(event) => setLinkedDisplayName(event.target.value)}
                placeholder="VS Code"
                className="bg-background/50 pl-10"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {folderToEdit ? (
              <Button type="button" variant="destructive" size="icon" onClick={handleDelete} disabled={isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isPending}>
                {isPending ? "Saving..." : folderToEdit ? "Save Changes" : "Create Folder"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
