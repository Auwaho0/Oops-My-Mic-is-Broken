import { useState, useEffect } from "react";
import { WifiOff, Radio } from "lucide-react";
import { useOnlineStatus } from "./useOnlineStatus";
import { ru } from "@/shared/i18n/ru";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showRestored) return null;

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 border-2 border-ink bg-emerald-100 px-3.5 py-2 font-mono text-xs font-bold text-ink shadow-[4px_4px_0_var(--color-ink)] animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <Radio className="size-4 text-emerald-700 animate-pulse shrink-0" />
        <span>// CONNECTION RESTORED: ONLINE SYNC ACTIVE</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 left-4 z-50 flex max-w-sm items-center gap-3 border-2 border-blood bg-paper px-3.5 py-2.5 font-mono text-xs text-ink shadow-[4px_4px_0_var(--color-ink)] animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="grid size-8 shrink-0 place-items-center border border-blood bg-blood/10 text-blood">
        <WifiOff className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="font-display font-bold uppercase text-blood text-[11px] leading-tight">
          // {ru.pwa.offline.title}
        </p>
        <p className="mt-0.5 text-[11px] text-ink/80 leading-snug">
          {ru.pwa.offline.message}
        </p>
      </div>
    </div>
  );
}
