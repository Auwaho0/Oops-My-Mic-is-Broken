/**
 * shared/ui/baseButton/BaseButton.tsx
 * 
 * Универсальный компонент кнопки в газетно-бруталистском стиле.
 * 
 * Ключевые концепции для изучения React:
 * 1. `forwardRef` — позволяет родительскому компоненту получить прямую ссылку (ref) на нативный HTML-элемент <button>.
 * 2. `useCallback` — мемоизирует функции обработчиков событий, чтобы они не создавались заново при каждом рендере.
 * 3. `useMemo` — оптимизирует вычисление классов Tailwind и пересчитывает их только при изменении входных пропсов.
 * 4. `cn(...)` — утилита объединения классов (clsx + tailwind-merge) для корректного разрешения конфликтов Tailwind.
 */

import {
  forwardRef,
  type ButtonHTMLAttributes,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { cn } from '@/utils/cn';

// Допустимые размеры кнопки
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Размер кнопки: sm (мелкий), md (стандартный), lg (крупный) */
  size?: ButtonSize;
  /** Дочерние элементы (текст, иконки) */
  children: ReactNode;
}

// Варианты стилей в зависимости от размера
const sizeVariants: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

// Базовые Tailwind-классы для газетного стиля:
// Класс .btn-base описан глобально в src/index.css
const baseStyles =
  'btn-base inline-flex items-center justify-center font-bold tracking-tight cursor-pointer select-none transition-all disabled:opacity-50 disabled:cursor-not-allowed';

export const Button = forwardRef<HTMLButtonElement, BaseButtonProps>(
  (
    {
      size = 'md',
      className,
      children,
      onMouseDown,
      onMouseUp,
      onMouseLeave,
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      ...props
    },
    ref
  ) => {
    // Состояние активного нажатия (для имитации физического вдавливания кнопки)
    const [isActive, setIsActive] = useState(false);

    // --- Обработчики нажатий мыши ---
    const handleMouseDown = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        setIsActive(true);
        onMouseDown?.(e);
      },
      [onMouseDown]
    );

    const handleMouseUp = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        setIsActive(false);
        onMouseUp?.(e);
      },
      [onMouseUp]
    );

    const handleMouseLeave = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        setIsActive(false);
        onMouseLeave?.(e);
      },
      [onMouseLeave]
    );

    // --- Обработчики касаний на мобильных устройствах (Touch Events) ---
    const handleTouchStart = useCallback(
      (e: TouchEvent<HTMLButtonElement>) => {
        setIsActive(true);
        onTouchStart?.(e);
      },
      [onTouchStart]
    );

    const handleTouchEnd = useCallback(
      (e: TouchEvent<HTMLButtonElement>) => {
        setIsActive(false);
        onTouchEnd?.(e);
      },
      [onTouchEnd]
    );

    const handleTouchCancel = useCallback(
      (e: TouchEvent<HTMLButtonElement>) => {
        setIsActive(false);
        onTouchCancel?.(e);
      },
      [onTouchCancel]
    );

    // Мемоизация итоговой строки классов
    const classes = useMemo(
      () => cn(baseStyles, sizeVariants[size], isActive && 'btn-base--active', className),
      [size, isActive, className]
    );

    return (
      <button
        ref={ref}
        className={classes}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
