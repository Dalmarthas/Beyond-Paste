import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { TauriEvent } from "@tauri-apps/api/event";
import { BrandLogo } from "@/components/brand-logo";
import { getPickerPayload, hidePicker, pasteSnippet } from "@/lib/desktop";
import { desktopEvents } from "@shared/routes";
import type { PickerPayload, Snippet } from "@shared/schema";

function getSurfaceWindow() {
  try {
    return getCurrentWebviewWindow();
  } catch {
    return null;
  }
}

export default function PickerPage() {
  const [payload, setPayload] = useState<PickerPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let mounted = true;
    const pickerWindow = getSurfaceWindow();
    const cleanup: Array<() => void> = [];

    async function refresh() {
      const nextPayload = await getPickerPayload();
      if (!mounted) {
        return;
      }
      setPayload(nextPayload);
      setSelectedIndex(0);
    }

    void refresh();

    async function bind() {
      if (!pickerWindow) {
        return;
      }

      cleanup.push(
        await pickerWindow.listen(desktopEvents.pickerOpen, () => {
          void refresh();
        }),
      );
      cleanup.push(
        await pickerWindow.listen(TauriEvent.WINDOW_BLUR, () => {
          void hidePicker();
        }),
      );
      cleanup.push(
        await pickerWindow.listen(TauriEvent.WINDOW_CLOSE_REQUESTED, () => {
          void hidePicker();
        }),
      );
    }

    void bind();

    return () => {
      mounted = false;
      for (const unlisten of cleanup) {
        unlisten();
      }
    };
  }, []);

  const visibleSnippets = useMemo(() => {
    if (!payload || payload.context.matchedFolderId === null) {
      return [] as Array<Snippet & { folderName: string }>;
    }

    const folderNames = new Map(payload.folders.map((folder) => [folder.id, folder.name]));
    return payload.snippets
      .filter((snippet) => snippet.folderId === payload.context.matchedFolderId)
      .map((snippet) => ({
        ...snippet,
        folderName: folderNames.get(snippet.folderId) ?? "",
      }));
  }, [payload]);

  useEffect(() => {
    if (selectedIndex < 0 || selectedIndex >= visibleSnippets.length) {
      return;
    }

    buttonRefs.current[selectedIndex]?.focus();
  }, [selectedIndex, visibleSnippets]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void hidePicker();
        return;
      }

      if (visibleSnippets.length === 0 || isSubmitting) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % visibleSnippets.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + visibleSnippets.length) % visibleSnippets.length);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void handleSelect(visibleSnippets[selectedIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, selectedIndex, visibleSnippets]);

  async function handleSelect(snippet: Snippet) {
    setIsSubmitting(true);
    try {
      await pasteSnippet(snippet.content);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-transparent">
      <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-white/6 bg-[#030712]/95 shadow-[0_24px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 border-b border-white/5 px-2.5 py-1.5">
          <BrandLogo className="h-4 shrink-0" />
          <div className="font-display text-[9px] font-semibold uppercase tracking-[0.2em] text-white/78">Beyond Paste</div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-1.5 py-1.5">
          {visibleSnippets.length > 0 ? (
            <div className="space-y-1">
              {visibleSnippets.map((snippet, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={snippet.id}
                    ref={(element) => {
                      buttonRefs.current[index] = element;
                    }}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => void handleSelect(snippet)}
                    disabled={isSubmitting}
                    className={[
                      "w-full rounded-lg border px-2.5 py-2 text-left outline-none transition-all",
                      isSelected
                        ? "border-primary/35 bg-white/[0.09] shadow-[0_0_0_1px_rgba(59,130,246,0.12)]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <div className="truncate text-[11px] font-semibold leading-4 text-white/90">{snippet.title}</div>
                    <div className="mt-0.5 line-clamp-1 whitespace-pre-wrap text-[9px] leading-3 text-muted-foreground/95">
                      {snippet.content}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[10px] text-muted-foreground">
              No entries are linked to the current app.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}