/**
 * features/soundboard/VolumeControl.tsx
 * 
 * Компонент слайдера «Уровень неловкости» (громкость звуков).
 * 
 * Ключевые концепции для изучения React и Web Audio API:
 * 1. `memo` (React.memo) — компонент высшего порядка (HOC). Он запоминает результат
 *    рендеринга и повторно рендерит компонент ТОЛЬКО если изменились его пропсы.
 * 2. Изоляция состояния: изменяя ползунок, мы вызываем `setLevel(v)` локально.
 *    Это обновляет проценты (например, "35%") и подпись ("Терпимо"),
 *    НЕ заставляя перерисовываться весь огромный список кнопок в Soundboard!
 * 3. Web Audio API GainNode: вызов `engine.setVolume(...)` моментально меняет
 *    коэффициент усиления звуковой карты браузера без задержек.
 * 4. Сохранение в Zustand: уровень сохраняется в LocalStorage для восстановления при следующем визите.
 */

import { memo, useState, useCallback, useEffect, type ChangeEvent } from "react";
import { engine } from "@/audio/engine";
import { useUIStore } from "@/store/uiStore";
import { ru } from "@/shared/i18n/ru";

/**
 * Вспомогательная функция для получения текстовой подписи к уровню громкости
 * @param v - значение от 0 до 100
 */
export function getAwkwardCaption(v: number): string {
  if (v <= 15) return ru.soundboard.captions.silent; // Бесшумно / лёгкий фон
  if (v <= 40) return ru.soundboard.captions.medium; // Заметно, но правдоподобно
  if (v <= 70) return ru.soundboard.captions.loud;   // Очевидный шум
  return ru.soundboard.captions.max;                 // Максимальный хаос
}

export const VolumeControl = memo(() => {
  // Получаем сохранённое значение громкости из хранилища Zustand (по умолчанию 35%)
  const initialVolume = useUIStore.getState().awkwardnessLevel ?? 35;
  const [level, setLevel] = useState<number>(initialVolume);

  // При первом монтировании компонента синхронизируем громкость аудио-движка
  useEffect(() => {
    engine.setVolume((initialVolume / 100) * 0.9);
  }, [initialVolume]);

  // Обработчик перемещения ползунка range
  const handleInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setLevel(v);

    // 1. Плавно меняем громкость в Web Audio API GainNode (от 0.0 до 0.9)
    engine.setVolume((v / 100) * 0.9);

    // 2. Записываем в Zustand-хранилище (сохраняется в LocalStorage)
    useUIStore.getState().setAwkwardnessLevel(v);
  }, []);

  // Вычисляем текстовую подпись под слайдером
  const caption = getAwkwardCaption(level);

  return (
    <div className="mt-10 border-[3px] border-ink bg-paper p-5 sm:p-6 shadow-[6px_6px_0_var(--color-ink)]">
      {/* Шапка слайдера: название и текущий процент */}
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

      {/* Нативный HTML5 range-инпут со стилизацией в src/index.css */}
      <input
        id="awkward"
        type="range"
        min={0}
        max={100}
        value={level}
        onChange={handleInput}
        className="awkward mt-3 cursor-pointer w-full"
      />

      {/* Текстовая расшифровка уровня шума */}
      <p id="awkward-caption" className="mt-2 text-xs sm:text-sm text-ink/70 font-mono">
        → {caption}
      </p>
    </div>
  );
});

VolumeControl.displayName = "VolumeControl";
