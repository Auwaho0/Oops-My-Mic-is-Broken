// src/components/StatusDisplay.tsx
import { memo, useMemo } from "react";
import { Button } from "@/shared/ui/baseButton/BaseButton";
import { ru } from "@/shared/i18n/ru";

const STATUS_CONFIGS = [
  { text: ru.statuses[0], dot: "--color-blood", ring: "shadow-[0_0_0_3px_rgba(200,30,20,0.25)]", blink: true },
  { text: ru.statuses[1], dot: "--color-ink", ring: "", blink: false },
  { text: ru.statuses[2], dot: "--color-warn", ring: "", blink: true },
  { text: ru.statuses[3], dot: "--color-ok", ring: "", blink: true },
];

const BUTTON_STYLES = {
  "--btn-bg": "#e9e4d6",
  "--btn-bg-hover": "#e9e4d6",
  "--btn-bg-active": "#e9e4d6",
} as React.CSSProperties;

const BUTTON_BASE_CLASSES =
  "cursor-pointer group inline-flex flex-wrap justify-normal items-center gap-x-4 gap-y-2 border-[3px] border-ink px-5 sm:px-7 py-3.5 sm:py-4";

interface StatusDisplayProps {
  status: number;
  onClick: () => void;
}

export const STATUS_COUNT = STATUS_CONFIGS.length;

export const StatusDisplay = memo(({ status, onClick }: StatusDisplayProps) => {
  const s = useMemo(() => STATUS_CONFIGS[status % STATUS_CONFIGS.length], [status]);

  const dotStyles = useMemo(() => {
    return {
      backgroundColor: `var(${s.dot})`,
    } as React.CSSProperties;
  }, [s.dot]);

  return (
    <div className="mt-4 sm:mt-10">
      <Button
        type="button"
        style={BUTTON_STYLES}
        onClick={onClick}
        className={BUTTON_BASE_CLASSES}
        title={ru.app.statusHint}
      >
        <span className="font-display text-[16px] sm:text-[30px] font-semibold uppercase">{ru.app.statusPrefix}</span>
        <div className="flex justify-center items-center gap-2">
          <span className="relative w-3 h-3 sm:w-5.5 sm:h-5.5">
            <span className="blink" style={dotStyles} />
            {s.blink ? <span className="anim-blink" style={dotStyles} /> : ""}
          </span>
          <span className="font-display text-[16px] sm:text-[30px] font-semibold uppercase tracking-wide">
            {s.text}
          </span>
        </div>
      </Button>
      <p className="mt-2 text-xs text-ink/60">{ru.app.statusHint}</p>
    </div>
  );
});

StatusDisplay.displayName = "StatusDisplay";