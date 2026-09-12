import { useCallback, useEffect, useMemo, useState } from "react";

import { engine, type SoundId } from "@/audio/engine";
import Reveal from "@/shared/ui/reveal/Reveal";
import { GroupSection } from "@/features/soundboard/GroupSection";
import { VolumeControl } from "@/features/soundboard/VolumeControl";
import { useUIStore } from "@/store/uiStore";
import { ru } from "@/shared/i18n/ru";
import { GROUPS } from "./data/data";

function awkwardCaption(v: number): string {
  if (v <= 15) return ru.soundboard.captions.silent;
  if (v <= 40) return ru.soundboard.captions.medium;
  if (v <= 70) return ru.soundboard.captions.loud;
  return ru.soundboard.captions.max;
}

export default function Soundboard() {
  const [active, setActive] = useState<Set<SoundId>>(() => new Set());
  const volume = useUIStore((s) => s.awkwardnessLevel);
  const setVolumeStore = useUIStore((s) => s.setAwkwardnessLevel);

  const toggle = useCallback((id: SoundId) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        engine.stop(id);
      } else {
        next.add(id);
        engine.start(id);
      }
      return next;
    });
  }, []);

  const stopAll = useCallback(() => {
    engine.stopAll();
    setActive(new Set());
  }, []);

  const onVolume = useCallback((v: number) => {
    setVolumeStore(v);
    engine.setVolume((v / 100) * 0.9);
  }, [setVolumeStore]);

  useEffect(() => {
    engine.setVolume((volume / 100) * 0.9);
    return () => {
      engine.stopAll();
    };
  }, []);

  const caption = useMemo(() => awkwardCaption(volume), [volume]);

  return (
    <section id="sounds" className="bg-amber-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-6">
        <Reveal>
          <p className="text-sm text-blood font-medium tracking-widest">
            {ru.soundboard.moduleBadge}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display font-bold uppercase leading-[0.9] text-[clamp(2.4rem,7vw,5.5rem)]">
              {ru.soundboard.heading} <span className="text-blood">{ru.soundboard.headingAccent}</span>
            </h2>
            {active.size > 0 && (
              <button
                type="button"
                onClick={stopAll}
                className="cursor-pointer border-2 border-blood bg-blood px-4 py-2 font-display text-sm font-semibold uppercase text-paper transition-all hover:bg-ink hover:border-ink hover:text-paper shadow-[3px_3px_0_var(--color-ink)]"
              >
                [ {ru.soundboard.stopAll} ({active.size}) ]
              </button>
            )}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/80">
            {ru.soundboard.description}
          </p>
        </Reveal>

        <Reveal delay={80}>
          <VolumeControl volume={volume} caption={caption} onChange={onVolume} />
        </Reveal>

        <div className="mt-12 space-y-12">
          {GROUPS.map((g, gi) => (
            <Reveal key={g.title} delay={gi * 60}>
              <GroupSection group={g} active={active} onToggle={toggle} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}