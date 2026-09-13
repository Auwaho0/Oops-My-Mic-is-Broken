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
  const [active, setActive] = useState<Record<string, { remainingSec: number; durationSec: number }>>({});
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<SoundCategory>("other");

  const { data: user } = useCurrentUser();
  const openAuthModal = useAuthUIStore((s) => s.openAuthModal);
  const { data: userSoundsData, isLoading: isSoundsLoading } = useSounds();
  const deleteSoundMutation = useDeleteSound();

  // Merge static procedural sound items with user-uploaded sounds per category (§3.1, §4)
  const combinedGroups: Group[] = useMemo(() => {
    const customSounds = userSoundsData?.items || [];

    return STATIC_GROUPS.map((g) => {
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

  const toggle = useCallback(
    (id: SoundId, fileUrl?: string) => {
      setActive((prev) => {
        const next = { ...prev };
        if (next[id]) {
          delete next[id];
          engine.stop(id);
        } else {
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

  const stopAll = useCallback(() => {
    engine.stopAll();
    setActive({});
  }, []);

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

  // Countdown timer for active sounds with automatic disabling
  useEffect(() => {
    const activeIds = Object.keys(active);
    if (activeIds.length === 0) return;

    const interval = window.setInterval(() => {
      setActive((prev) => {
        const next: Record<string, { remainingSec: number; durationSec: number }> = {};
        let changed = false;

        for (const [id, info] of Object.entries(prev)) {
          if (info.remainingSec <= 1) {
            // Auto-disable time reached: stop audio engine and remove from active
            engine.stop(id);
            changed = true;
          } else {
            next[id] = { ...info, remainingSec: info.remainingSec - 1 };
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [Object.keys(active).length > 0]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      engine.stopAll();
    };
  }, []);

  const activeCount = Object.keys(active).length;

  return (
    <section id="sounds" className="bg-amber-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-6">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-blood font-medium tracking-widest">
              {ru.soundboard.moduleBadge}
            </p>
            <div className="flex items-center gap-1.5 border border-ink/30 bg-paper px-2.5 py-1 text-[11px] font-mono text-ink/70">
              <Timer className="size-3.5 text-blood shrink-0" />
              <span>{ru.soundboard.autoDisableHint}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display font-bold uppercase leading-[0.9] text-[clamp(2.4rem,7vw,5.5rem)]">
              {ru.soundboard.heading} <span className="text-blood">{ru.soundboard.headingAccent}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenUpload("other")}
                className="cursor-pointer inline-flex items-center gap-2 border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-semibold uppercase text-ink transition-all hover:border-blood hover:text-blood shadow-[3px_3px_0_var(--color-ink)]"
              >
                <Plus className="size-4 text-blood" />
                <span>{ru.soundboard.uploadButton}</span>
              </button>

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={stopAll}
                  className="cursor-pointer border-2 border-blood bg-blood px-4 py-2 font-display text-sm font-semibold uppercase text-paper transition-all hover:bg-ink hover:border-ink hover:text-paper shadow-[3px_3px_0_var(--color-ink)]"
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

        <Reveal delay={80}>
          <VolumeControl />
        </Reveal>

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

      <SoundUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        defaultCategory={targetCategory}
      />
    </section>
  );
}
