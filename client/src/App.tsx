import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import Dashboard from "@/pages/dashboard";
import PickerPage from "@/pages/picker";

type SurfaceMode = "library" | "picker";

function detectSurfaceMode(): SurfaceMode {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return "library";
  }

  try {
    return getCurrentWebviewWindow().label === "picker" ? "picker" : "library";
  } catch {
    return "library";
  }
}

function SurfaceRouter() {
  const [surface] = useState<SurfaceMode>(detectSurfaceMode);

  useEffect(() => {
    document.body.dataset.surface = surface;
    return () => {
      delete document.body.dataset.surface;
    };
  }, [surface]);

  const content = useMemo(() => {
    return surface === "picker" ? <PickerPage /> : <Dashboard />;
  }, [surface]);

  return (
    <div
      data-surface={surface}
      className={surface === "picker" ? "dark h-screen bg-transparent text-foreground" : "dark min-h-screen bg-background text-foreground"}
    >
      {content}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SurfaceRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;