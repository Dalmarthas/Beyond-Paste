import { useState } from "react";
import { Copy, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Entry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useDeleteEntry } from "@/hooks/use-entries";
import { motion } from "framer-motion";

interface EntryCardProps {
  entry: Entry;
  onEdit: (entry: Entry) => void;
}

export function EntryCard({ entry, onEdit }: EntryCardProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const deleteEntry = useDeleteEntry();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.content);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: `"${entry.title}" is ready to paste.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${entry.title}"?`)) {
      await deleteEntry.mutateAsync(entry.id);
      toast({ title: "Entry deleted" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col p-5 rounded-2xl glass-card cursor-pointer overflow-hidden"
      onClick={handleCopy}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex justify-between items-start mb-3 z-10">
        <h3 className="font-display font-semibold text-lg text-foreground/90 truncate pr-4">
          {entry.title}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background/80"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive bg-background/50 hover:bg-background/80"
            onClick={handleDelete}
            disabled={deleteEntry.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative z-10">
        <div className="bg-background/40 rounded-lg p-3 border border-white/5 max-h-[100px] overflow-hidden relative">
          <pre className="text-xs font-mono text-muted-foreground/80 whitespace-pre-wrap line-clamp-3">
            {entry.content}
          </pre>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground z-10">
        <span>Click anywhere to copy</span>
        <div className={`flex items-center gap-1.5 transition-colors ${copied ? 'text-green-400' : 'text-primary/70'}`}>
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </div>
      </div>
    </motion.div>
  );
}
