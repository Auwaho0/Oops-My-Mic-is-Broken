/**
 * widgets/soundboard/Soundboard.tsx
 * 
 * Background noise soundboard (Web Audio API Soundboard).
 * 
 * Key architectural concepts for learning React and Frontend engineering:
 * 1. TanStack Query (`useSounds`) - Reactive fetching of user-uploaded sounds from the API.
 * 2. `useMemo` for combining data sets - Merges static procedural synthesized sounds (drill, dog, doorbell)
 *    with dynamic user sounds stored in MinIO/S3.
 * 3. Auto-disabling countdown timer (`useEffect` + `setInterval`) - Each sound plays for a predetermined
 *    duration (e.g. 10s), then automatically shuts down and toggles off the button.
 * 4. Resource cleanup (`cleanup function` in `useEffect`) - Navigating away or unmounting cleanly silences
 *    all audio oscillators and nodes to avoid audio leaks.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Music, Plus, Timer } from "lucide-react";
import { toast } from "sonner";
import { engine, type SoundId } from "@/audio/engine";
import Reveal from "@/shared/ui/reveal/Reveal";
import { GroupSection, type Group, type SoundItem } from "@/features/soundboard/GroupSection";
import { VolumeControl } from "@/features/soundboard/VolumeControl";
import { SoundUploadModal } from "@/features/soundboard/ui/SoundUploadModal";
import { useDeleteSound, useSounds } from "@/features/soundboard/model/useSounds";
import { useCurrentUser } from "@/features/auth/model/useAuth";
import { useAuthUIStore } from "@/store/authStore";
import type { SoundCategory } from "@/entities/sound/types";
import { ru } from "@/shared/i18n/ru";
import { GROUPS as STATIC_GROUPS } from "./data/data";

export default function Soundboard() {
  // Active playing sounds state: dictionary { [soundId]: { remainingSec, durationSec } }
  const [active, setActive] = useState<Record<string, { remainingSec: number; durationSec: number }>>({});
  
  // Custom sound upload modal visibility state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Category target for new sound uploads (defaults to 'other')
  const [targetCategory, setTargetCategory] = useState<SoundCategory>("other");

  // Auth & API queries
  const { data: user } = useCurrentUser();
  const openAuthModal = useAuthUIStore((s) => s.openAuthModal);
  const { data: userSoundsData, isLoading: isSoundsLoading } = useSounds();
  const deleteSoundMutation = useDeleteSound();

  // Combine static synthesized sounds and user custom sounds from the API
  const combinedGroups: Group[] = useMemo(() => {
    const customSounds = userSoundsData?.items || [];

    return STATIC_GROUPS.map((g) => {
      // Filter user sounds belonging to this category
      const categoryCustoms = customSounds.filter((cs) => cs.category === g.id);
      const customItems: SoundItem[] = categoryCustoms.map((cs) => ({
        id: cs.id,
        label: cs.title,
        sub: `[авторское алиби • ${Math.round(cs.duration_sec)}с]`,
        Icon: Music,
        durationSec: Math.round(cs.duration_sec) || 10,
        fileUrl: cs.file_url,
        isCustom: true,
      }));

      return {
        ...g,
        items: [...g.items, ...customItems],
      };
    });
  }, [userSoundsData?.items]);

  // Fast O(1) lookup map for sound durations and file URLs
  const soundDurations = useMemo(() => {
    const map = new Map<SoundId, { duration: number; fileUrl?: string }>();
    for (const g of combinedGroups) {
      for (const item of g.items) {
        map.set(item.id, {
          duration: item.durationSec || 10,
          fileUrl: item.fileUrl,
        });
      }
    }
    return map;
  }, [combinedGroups]);

  // Toggle playback for a specific sound item (ON / OFF)
  const toggle = useCallback(
    (id: SoundId, fileUrl?: string) => {
      setActive((prev) => {
        const next = { ...prev };
        if (next[id]) {
          // If already playing, stop it immediately
          delete next[id];
          engine.stop(id);
        } else {
          // If stopped, start playback via Web Audio API and initialize countdown
          const info = soundDurations.get(id);
          const dur = info?.duration ?? 10;
          const soundUrl = fileUrl || info?.fileUrl;
          next[id] = { remainingSec: dur, durationSec: dur };
          engine.start(id, soundUrl);
        }
        return next;
      });
    },
    [soundDurations]
  );

  // Panic button: immediately silences all active sound generators
  const stopAll = useCallback(() => {
    engine.stopAll();
    setActive({});
  }, []);

  // Open upload modal with target category (requires authentication)
  const handleOpenUpload = useCallback(
    (category: SoundCategory) => {
      if (!user) {
        openAuthModal("login");
        return;
      }
      setTargetCategory(category);
      setUploadModalOpen(true);
    },
    [user, openAuthModal]
  );

  // Remove custom uploaded sound
  const handleDeleteSound = useCallback(
    async (soundId: string) => {
      if (!window.confirm(ru.soundboard.uploadModal.deleteConfirm)) return;
      try {
        if (active[soundId]) {
          engine.stop(soundId);
          setActive((prev) => {
            const next = { ...prev };
            delete next[soundId];
            return next;
          });
        }
        await deleteSoundMutation.mutateAsync(soundId);
        toast.success(ru.soundboard.uploadModal.deleteSuccess);
      } catch {
        toast.error("Не удалось удалить звук.");
      }
    },
    [active, deleteSoundMutation]
  );

  // Boolean flag indicating if any sound is currently active
  const hasActiveSounds = Object.keys(active).length > 0;

  // Countdown timer tick: runs once every 1s only when sounds are playing
  useEffect(() => {
    if (!hasActiveSounds) return;

    const interval = window.setInterval(() => {
      setActive((prev) => {
        const next: Record<string, { remainingSec: number; durationSec: number }> = {};
        let changed = false;

        for (const [id, info] of Object.entries(prev)) {
          if (info.remainingSec <= 1) {
            // Duration expired: stop sound and remove from active list (auto-disable)
            engine.stop(id);
            changed = true;
          } else {
            // Decrement remaining seconds
            next[id] = { ...info, remainingSec: info.remainingSec - 1 };
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 1000);

    // Clean up interval on dependency change or unmount
    return () => clearInterval(interval);
  }, [hasActiveSounds]);

  // Silence all active sounds on component unmount
  useEffect(() => {
    return () => {
      engine.stopAll();
    };
  }, []);

  const activeCount = Object.keys(active).length;

  return (
    <section id="sounds" className="bg-paper border-t-2 border-ink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <Reveal>
          {/* Module Header: badge and auto-disable notice */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-blood font-medium tracking-widest font-mono">
              {ru.soundboard.moduleBadge}
            </p>
            <div className="flex items-center gap-1.5 border border-ink/30 bg-paper px-2.5 py-1 text-[11px] font-mono text-ink/70">
              <Timer className="size-3.5 text-blood shrink-0" />
              <span>{ru.soundboard.autoDisableHint}</span>
            </div>
          </div>

          {/* Section title and action buttons */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display font-bold uppercase leading-[0.9] text-[clamp(2.4rem,7vw,5.5rem)]">
              {ru.soundboard.heading} <span className="text-blood">{ru.soundboard.headingAccent}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {/* Custom sound upload trigger button */}
              <button
                type="button"
                onClick={() => handleOpenUpload("other")}
                className="cursor-pointer inline-flex items-center gap-2 border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-semibold uppercase text-ink transition-all hover:border-blood hover:text-blood shadow-[3px_3px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--color-ink)]"
              >
                <Plus className="size-4 text-blood" />
                <span>{ru.soundboard.uploadButton}</span>
              </button>

              {/* Panic button: kill all active sounds */}
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={stopAll}
                  className="cursor-pointer border-2 border-blood bg-blood px-4 py-2 font-display text-sm font-semibold uppercase text-paper transition-all hover:bg-ink hover:border-ink hover:text-paper shadow-[3px_3px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5"
                >
                  [ {ru.soundboard.stopAll} ({activeCount}) ]
                </button>
              )}
            </div>
          </div>
          
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/80">
            {ru.soundboard.description}
          </p>
        </Reveal>

        {/* Awkwardness Level Volume Slider */}
        <Reveal delay={80}>
          <VolumeControl />
        </Reveal>

        {/* Sound categories grid */}
        <div className="mt-12 space-y-12">
          {combinedGroups.map((g, gi) => (
            <Reveal key={g.title} delay={gi * 60}>
              <GroupSection
                group={g}
                active={active}
                onToggle={toggle}
                onOpenUpload={handleOpenUpload}
                onDeleteSound={handleDeleteSound}
                isLoading={isSoundsLoading}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {/* Sound upload modal */}
      <SoundUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        defaultCategory={targetCategory}
      />
    </section>
  );
}
