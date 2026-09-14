/**
 * shared/ui/baseButton/BaseButton.tsx
 * 
 * Reusable tactile button component styled with newspaper-brutalist aesthetics.
 * 
 * Key educational React concepts:
 * 1. `forwardRef` - Allows parent components to receive a direct ref to the underlying HTML <button>.
 * 2. `useCallback` - Memoizes mouse/touch event handlers so they are not recreated on each render.
 * 3. `useMemo` - Optimizes computed class strings, recalculating only when dependencies change.
 * 4. `cn(...)` - Class merging utility (clsx + tailwind-merge) for clean Tailwind precedence resolution.
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

// Supported button sizes
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Size variant: sm (compact), md (standard), lg (large/prominent) */
  size?: ButtonSize;
  /** Inner content (text, icons) */
  children: ReactNode;
}

// Size class variations
const sizeVariants: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

// Base brutalist classes:
// The .btn-base class is defined globally in src/index.css
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
    // Pressed state for tactile 3D button press physics
    const [isActive, setIsActive] = useState(false);

    // --- Mouse Event Handlers ---
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

    // --- Mobile Touch Event Handlers ---
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

    // Memoize final class concatenation
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
