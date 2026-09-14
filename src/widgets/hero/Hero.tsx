/**
 * widgets/hero/Hero.tsx
 * 
 * Hero section for the CallSaver application.
 * 
 * Key educational React & Architecture concepts:
 * 1. Zustand selectors (`useUIStore((s) => s.statusIndex)`) - Subscribes the component
 *    only to the specific slice of global state, preventing unnecessary re-renders.
 * 2. `useCallback` - Memoizes the click handler for cycling microphone status indicators.
 * 3. Responsive fluid typography with CSS `clamp(...)` - Seamlessly scales display text from mobile to 4K displays.
 * 4. Custom animations (.anim-strike, .blink) defined in src/index.css.
 */

import { useCallback, useMemo } from "react";
import {
  StatusDisplay,
  STATUS_COUNT,
} from "@/features/hero/ui/StatusDisplay";
import { useUIStore } from "@/store/uiStore";
import { ru } from "@/shared/i18n/ru";

export default function Hero() {
  // Retrieve current status index and setter from Zustand store
  const status = useUIStore((s) => s.statusIndex);
  const setStatus = useUIStore((s) => s.setStatusIndex);

  // Cycle through available status states: 0 -> 1 -> 2 -> ... -> 0
  const handleStatus = useCallback(() => {
    setStatus((status + 1) % STATUS_COUNT);
  }, [status, setStatus]);

  // Formatted date string (computed once upon mount)
  const dataNow = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <section id="top" className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-16 pb-12">
      {/* Decorative stamp in top-right corner */}
      <div className="absolute right-4 sm:right-8 top-10 sm:top-14 rotate-6 border-2 border-blood px-4 py-2 text-blood pointer-events-none hidden sm:block">
        <p className="font-mono font-bold text-[18px] leading-tight text-center whitespace-pre-line">
          {ru.app.verifiedBadge}
        </p>
      </div>

      {/* Editorial brutalist headline */}
      <h1 className="font-display font-bold uppercase tracking-[-0.01em] leading-[0.86] text-[clamp(3.4rem,12.5vw,11.5rem)]">
        <span className="block">Ой.</span>
        <span className="block">У тебя микрофон</span>
        <span className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="relative inline-block">
            сломан.
            {/* Animated strikethrough SVG/CSS rule */}
            <span className="anim-strike absolute left-[-2%] right-[-3%] top-[54%] h-[0.075em] bg-ink -rotate-1 pointer-events-none" />
          </span>
          <span className="font-serif italic font-medium normal-case tracking-normal leading-none text-[clamp(1.5rem,4.6vw,3.9rem)] pb-[0.08em]">
            {ru.app.subtitle}
          </span>
        </span>
      </h1>

      {/* Interactive status badge (clickable to cycle states) */}
      <StatusDisplay status={status} onClick={handleStatus} />

      <p className="mt-8 text-xs sm:text-sm text-ink/80">
        v0.3 — {dataNow} — unsaved draft — собрано за 4 минуты до дедлайна
      </p>
    </section>
  );
}
