import { useEffect, useMemo, useState } from "react";
import { Keyboard, Save, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

const HOTKEY_KEYS = [
  { value: "space", label: "Space" },
  { value: "tab", label: "Tab" },
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((value) => ({ value: value.toLowerCase(), label: value })),
  ..."0123456789".split("").map((value) => ({ value, label: value })),
];

function parseHotkey(hotkey: string) {
  const parts = hotkey.split("+").map((part) => part.trim().toLowerCase());
  return {
    ctrl: parts.includes("ctrl") || parts.includes("control"),
    alt: parts.includes("alt"),
    shift: parts.includes("shift"),
    key: parts.find((part) => !["ctrl", "control", "alt", "shift"].includes(part)) ?? "space",
  };
}

function formatHotkey(ctrl: boolean, alt: boolean, shift: boolean, key: string) {
  return [ctrl ? "ctrl" : null, alt ? "alt" : null, shift ? "shift" : null, key]
    .filter(Boolean)
    .join("+");
}

function formatHotkeyLabel(hotkey: string) {
  return hotkey
    .split("+")
    .map((part) => (part === "ctrl" ? "Ctrl" : part === "alt" ? "Alt" : part === "shift" ? "Shift" : part === "space" ? "Space" : part.toUpperCase()))
    .join(" + ");
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [ctrl, setCtrl] = useState(true);
  const [alt, setAlt] = useState(false);
  const [shift, setShift] = useState(true);
  const [key, setKey] = useState("space");
  const [focusDelayMs, setFocusDelayMs] = useState("120");
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [restoreClipboard, setRestoreClipboard] = useState(true);

  useEffect(() => {
    if (!settings || !open) {
      return;
    }

    const parsed = parseHotkey(settings.globalHotkey);
    setCtrl(parsed.ctrl);
    setAlt(parsed.alt);
    setShift(parsed.shift);
    setKey(parsed.key);
    setFocusDelayMs(settings.focusDelayMs.toString());
    setLaunchAtLogin(settings.launchAtLogin);
    setRestoreClipboard(settings.restoreClipboardAfterPaste);
  }, [open, settings]);

  const hotkey = useMemo(() => formatHotkey(ctrl, alt, shift, key), [alt, ctrl, key, shift]);
  const canSave = (ctrl || alt || shift) && key.length > 0;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    try {
      await updateSettings.mutateAsync({
        globalHotkey: hotkey,
        focusDelayMs: Number(focusDelayMs),
        launchAtLogin,
        restoreClipboardAfterPaste: restoreClipboard,
      });
      toast({
        title: "Settings saved",
        description: `Hotkey set to ${formatHotkeyLabel(hotkey)}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to save settings",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure the global shortcut, focus delay, clipboard restore, and startup behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <Keyboard className="h-4 w-4 text-primary" /> Global Hotkey
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                  <Label htmlFor="hotkey-ctrl">Ctrl</Label>
                  <Switch id="hotkey-ctrl" checked={ctrl} onCheckedChange={setCtrl} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                  <Label htmlFor="hotkey-alt">Alt</Label>
                  <Switch id="hotkey-alt" checked={alt} onCheckedChange={setAlt} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                  <Label htmlFor="hotkey-shift">Shift</Label>
                  <Switch id="hotkey-shift" checked={shift} onCheckedChange={setShift} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Main key</Label>
                  <Select value={key} onValueChange={setKey}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Choose a key" />
                    </SelectTrigger>
                    <SelectContent className="glass-panel max-h-72">
                      {HOTKEY_KEYS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary-foreground/90">
                  Active shortcut: <span className="font-semibold text-white">{formatHotkeyLabel(hotkey)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <TimerReset className="h-4 w-4 text-primary" /> Paste Behavior
            </div>
            <div className="space-y-2">
              <Label htmlFor="focus-delay">Focus delay before paste (ms)</Label>
              <Input
                id="focus-delay"
                inputMode="numeric"
                value={focusDelayMs}
                onChange={(event) => setFocusDelayMs(event.target.value.replace(/[^0-9]/g, ""))}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                This small delay gives Windows time to return focus before the app sends Ctrl+V.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
              <div>
                <Label htmlFor="restore-clipboard">Restore clipboard after successful paste</Label>
                <p className="text-xs text-muted-foreground">Keeps the selected snippet only if the auto-paste flow fails.</p>
              </div>
              <Switch id="restore-clipboard" checked={restoreClipboard} onCheckedChange={setRestoreClipboard} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
              <div>
                <Label htmlFor="launch-login">Launch at login</Label>
                <p className="text-xs text-muted-foreground">Starts Beyond Paste in the background when Windows starts.</p>
              </div>
              <Switch id="launch-login" checked={launchAtLogin} onCheckedChange={setLaunchAtLogin} />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || updateSettings.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
