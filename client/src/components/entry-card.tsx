import { useState } from "react";
import { CheckCircle2, Copy, Edit2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useDeleteEntry } from "@/hooks/use-entries";
import { useToast } from "@/hooks/use-toast";
import type { Snippet } from "@shared/schema";

interface EntryCardProps {
  entry: Snippet;
  onEdit: (entry: Snippet) => void;
}

export function EntryCard({ entry, onEdit }: EntryCardProps) {
  const [copied, setCopied] = useState(false);
  const deleteEntry = useDeleteEntry();
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(entry.content);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: `"${entry.title}" is ready to paste.`,
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  async function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();
    if (!confirm(`Delete snippet "${entry.title}"?`)) {
      return;
    }

    await deleteEntry.mutateAsync(entry.id);
    toast({ title: "Snippet deleted" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg transition-all duration-300 hover:border-white/20 hover:bg-white/10"
      onClick={handleCopy}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <h3 className="truncate pr-4 font-display text-lg font-semibold text-foreground/90">{entry.title}</h3>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/50 text-muted-foreground hover:bg-background/80 hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(entry);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/50 text-muted-foreground hover:bg-background/80 hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteEntry.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative z-10 flex-1 rounded-lg border border-white/5 bg-background/40 p-3">
        <pre className="line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground/90">{entry.content}</pre>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Click to copy</span>
        <div className={`flex items-center gap-1.5 ${copied ? "text-emerald-400" : "text-primary/70"}`}>
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </div>
      </div>
    </motion.div>
  );
}
