/**
 * widgets/soundboard/Soundboard.tsx
 * 
 * Звуковая дека фоновых шумов (Web Audio API Soundboard).
 * 
 * Ключевые концепции для изучения React и Frontend-архитектуры:
 * 1. TanStack Query (`useSounds`) — реактивное получение списка пользовательских звуков с сервера.
 * 2. `useMemo` для объединения данных — комбинирует статические процедурные звуки (дрель, собака, звонок)
 *    с динамическими звуками пользователя, загруженными в MinIO/S3.
 * 3. Автоотключение звука по таймеру (`useEffect` + `setInterval`) — каждый звук играет фиксированное
 *    время (например, 10 секунд), после чего кнопка автоматически выключается.
 * 4. Очистка ресурсов (`cleanup function` в `useEffect`) — при уходе со страницы или размонтировании
 *    компонента все аудио-осцилляторы корректно глушатся, предотвращая зависшие звуки.
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
  // Состояние активных воспроизводимых звуков: словарь { [soundId]: { remainingSec, durationSec } }
  const [active, setActive] = useState<Record<string, { remainingSec: number; durationSec: number }>>({});
  
  // Состояние открытия модального окна загрузки собственного звука
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Категория, в которую пользователь хочет загрузить файл (по умолчанию 'other')
  const [targetCategory, setTargetCategory] = useState<SoundCategory>("other");

  // Хуки аутентификации и сервера
  const { data: user } = useCurrentUser();
  const openAuthModal = useAuthUIStore((s) => s.openAuthModal);
  const { data: userSoundsData, isLoading: isSoundsLoading } = useSounds();
  const deleteSoundMutation = useDeleteSound();

  // Объединяем статические синтезируемые звуки и пользовательские звуки из API
  const combinedGroups: Group[] = useMemo(() => {
    const customSounds = userSoundsData?.items || [];

    return STATIC_GROUPS.map((g) => {
      // Фильтруем звуки пользователя по текущей категории
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

  // Быстрый поиск длительности звука по его ID (O(1) через Map)
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

  // Переключение воспроизведения конкретного звука (ВКЛ / ВЫКЛ)
  const toggle = useCallback(
    (id: SoundId, fileUrl?: string) => {
      setActive((prev) => {
        const next = { ...prev };
        if (next[id]) {
          // Если звук уже играет — останавливаем его
          delete next[id];
          engine.stop(id);
        } else {
          // Если звук не играет — запускаем в Web Audio API и ставим таймер
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

  // Мгновенная остановка всех играющих звуков (кнопка паники)
  const stopAll = useCallback(() => {
    engine.stopAll();
    setActive({});
  }, []);

  // Открытие диалога загрузки своего звука (с проверкой авторизации)
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

  // Удаление авторского звука
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

  // Флаг наличия хотя бы одного играющего звука
  const hasActiveSounds = Object.keys(active).length > 0;

  // Таймер обратного отсчета: срабатывает раз в 1 секунду только если есть активные звуки
  useEffect(() => {
    if (!hasActiveSounds) return;

    const interval = window.setInterval(() => {
      setActive((prev) => {
        const next: Record<string, { remainingSec: number; durationSec: number }> = {};
        let changed = false;

        for (const [id, info] of Object.entries(prev)) {
          if (info.remainingSec <= 1) {
            // Время истекло: останавливаем звук и удаляем из активных (автоотключение)
            engine.stop(id);
            changed = true;
          } else {
            // Уменьшаем секунды
            next[id] = { ...info, remainingSec: info.remainingSec - 1 };
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 1000);

    // Очистка интервала при изменении активности
    return () => clearInterval(interval);
  }, [hasActiveSounds]);

  // Глушим звуки при размонтировании всего компонента
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
          {/* Верхняя панель модуля: бейдж и подсказка про таймер */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-blood font-medium tracking-widest font-mono">
              {ru.soundboard.moduleBadge}
            </p>
            <div className="flex items-center gap-1.5 border border-ink/30 bg-paper px-2.5 py-1 text-[11px] font-mono text-ink/70">
              <Timer className="size-3.5 text-blood shrink-0" />
              <span>{ru.soundboard.autoDisableHint}</span>
            </div>
          </div>

          {/* Заголовок секции и кнопки действий */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display font-bold uppercase leading-[0.9] text-[clamp(2.4rem,7vw,5.5rem)]">
              {ru.soundboard.heading} <span className="text-blood">{ru.soundboard.headingAccent}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {/* Кнопка загрузки своего звука */}
              <button
                type="button"
                onClick={() => handleOpenUpload("other")}
                className="cursor-pointer inline-flex items-center gap-2 border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-semibold uppercase text-ink transition-all hover:border-blood hover:text-blood shadow-[3px_3px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--color-ink)]"
              >
                <Plus className="size-4 text-blood" />
                <span>{ru.soundboard.uploadButton}</span>
              </button>

              {/* Кнопка паники: выключить все звуки сразу */}
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

        {/* Слайдер «Уровень неловкости» */}
        <Reveal delay={80}>
          <VolumeControl />
        </Reveal>

        {/* Категории звуков с кнопками */}
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

      {/* Модальное окно загрузки звука */}
      <SoundUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        defaultCategory={targetCategory}
      />
    </section>
  );
}
