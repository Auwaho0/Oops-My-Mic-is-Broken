import { memo, useState, useCallback, useEffect } from "react";
import { engine } from "@/audio/engine";
import { useUIStore } from "@/store/uiStore";
import { ru } from "@/shared/i18n/ru";

export function getAwkwardCaption(v: number): string {
  if (v <= 15) return ru.soundboard.captions.silent;
  if (v <= 40) return ru.soundboard.captions.medium;
  if (v <= 70) return ru.soundboard.captions.loud;
  return ru.soundboard.captions.max;
}

export const VolumeControl = memo(() => {
  const initialVolume = useUIStore.getState().awkwardnessLevel ?? 35;
  const [level, setLevel] = useState(initialVolume);

  useEffect(() => {
    engine.setVolume((initialVolume / 100) * 0.9);
  }, [initialVolume]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setLevel(v);
    // Smooth Web Audio API gain adjustment without affecting parent components:
    engine.setVolume((v / 100) * 0.9);
    // Persist to store without triggering parent re-render:
    useUIStore.getState().setAwkwardnessLevel(v);
  }, []);

  const caption = getAwkwardCaption(level);

  return (
    <div className="mt-10 border-[3px] border-ink bg-paper p-5 sm:p-6 shadow-[6px_6px_0_var(--color-ink)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor="awkward"
          className="font-display text-xl sm:text-2xl font-semibold uppercase"
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
      <input
        id="awkward"
        type="range"
        min={0}
        max={100}
        value={level}
        onChange={handleInput}
        className="awkward mt-3 cursor-pointer w-full"
      />
      <p id="awkward-caption" className="mt-2 text-xs sm:text-sm text-ink/70">
        → {caption}
      </p>
    </div>
  );
});

VolumeControl.displayName = "VolumeControl";
