/**
 * features/soundboard/VolumeControl.tsx
 * 
 * Component for the "Awkwardness Level" slider (sound volume controller).
 * 
 * Key architectural concepts for learning React and Web Audio API:
 * 1. `memo` (React.memo) - Higher-Order Component (HOC). It memoizes rendering
 *    and only re-renders when props actually change.
 * 2. State isolation: adjusting the slider updates `level` locally via `setLevel(v)`.
 *    This updates the percentage label ("35%") and descriptive caption ("Tolerable")
 *    WITHOUT forcing the extensive list of sound buttons in Soundboard to re-render!
 * 3. Web Audio API GainNode: `engine.setVolume(...)` instantly adjusts hardware
 *    gain on the browser's audio graph without latency.
 * 4. Zustand persistence: the value is persisted in LocalStorage to restore settings on return.
 */

import { memo, useState, useCallback, useEffect, type ChangeEvent } from "react";
import { engine } from "@/audio/engine";
import { useUIStore } from "@/store/uiStore";
import { ru } from "@/shared/i18n/ru";

/**
 * Helper to determine the contextual caption for an awkwardness volume level
 * @param v - slider value from 0 to 100
 */
export function getAwkwardCaption(v: number): string {
  if (v <= 15) return ru.soundboard.captions.silent; // Quiet / subtle background
  if (v <= 40) return ru.soundboard.captions.medium; // Noticeable but plausible
  if (v <= 70) return ru.soundboard.captions.loud;   // Obvious disturbance
  return ru.soundboard.captions.max;                 // Full-blown chaos
}

export const VolumeControl = memo(() => {
  // Read persisted awkwardness volume from Zustand store (defaults to 35%)
  const initialVolume = useUIStore.getState().awkwardnessLevel ?? 35;
  const [level, setLevel] = useState<number>(initialVolume);

  // On mount, synchronize audio engine gain node with persisted volume
  useEffect(() => {
    engine.setVolume((initialVolume / 100) * 0.9);
  }, [initialVolume]);

  // Handler for range input thumb dragging
  const handleInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setLevel(v);

    // 1. Smoothly adjust Web Audio API GainNode (from 0.0 to 0.9 gain)
    engine.setVolume((v / 100) * 0.9);

    // 2. Persist to Zustand store (synced with LocalStorage)
    useUIStore.getState().setAwkwardnessLevel(v);
  }, []);

  // Compute text label corresponding to the current percentage
  const caption = getAwkwardCaption(level);

  return (
    <div className="mt-10 border-[3px] border-ink bg-paper p-5 sm:p-6 shadow-[6px_6px_0_var(--color-ink)]">
      {/* Slider Header: title and percentage counter */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor="awkward"
          className="font-display text-xl sm:text-2xl font-semibold uppercase tracking-wide text-ink"
        >
          {ru.soundboard.awkwardLevel}
        </label>
        <span
          id="awkward-percentage"
          className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-blood"
        >
          {level}%
        </span>
      </div>

      {/* Native HTML5 range input styled via src/index.css */}
      <input
        id="awkward"
        type="range"
        min={0}
        max={100}
        value={level}
        onChange={handleInput}
        className="awkward mt-3 cursor-pointer w-full"
      />

      {/* Descriptive caption for current noise level */}
      <p id="awkward-caption" className="mt-2 text-xs sm:text-sm text-ink/70 font-mono">
        → {caption}
      </p>
    </div>
  );
});

VolumeControl.displayName = "VolumeControl";
