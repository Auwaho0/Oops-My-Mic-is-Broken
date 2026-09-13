import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import type { SoundId } from "@/audio/engine";
import { ru } from "@/shared/i18n/ru";

interface SoundButtonProps {
  id: SoundId;
  label: string;
  sub: string;
  Icon: LucideIcon;
  on: boolean;
  remainingSec?: number;
  durationSec?: number;
  fileUrl?: string;
  isCustom?: boolean;
  onToggle: (id: SoundId, fileUrl?: string) => void;
  onDelete?: (id: string) => void;
}

export const SoundButton = memo(
  ({
    id,
    label,
    sub,
    Icon,
    on,
    remainingSec,
    durationSec,
    fileUrl,
    isCustom,
    onToggle,
    onDelete,
  }: SoundButtonProps) => {
    return (
      <div className="relative group/wrapper">
        <button
          id={`sound-btn-${id}`}
          type="button"
          onClick={() => onToggle(id, fileUrl)}
          aria-pressed={on}
          className={cn(
            "group relative overflow-hidden flex w-full items-center gap-4 border-[3px] border-ink p-4 text-left transition-all cursor-pointer",
            "shadow-[5px_5px_0_var(--color-ink)] hover:-translate-y-1 active:translate-x-1 active:translate-y-1 active:shadow-none",
            on ? "bg-ink text-paper" : "bg-paper hover:bg-paper-dark",
            isCustom && "border-blood"
          )}
        >
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center border-2 transition-colors",
              on
                ? "border-paper/60 bg-blood text-paper"
                : isCustom
                ? "border-blood/60 bg-blood/10 text-blood group-hover:bg-blood group-hover:text-paper"
                : "border-ink bg-paper group-hover:bg-ink group-hover:text-paper"
            )}
          >
            <Icon className="size-6" strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-semibold uppercase leading-tight truncate">
              {label}
            </span>
            <span
              className={cn(
                "block truncate text-xs",
                on ? "text-paper/70" : "text-ink/60"
              )}
            >
              {sub}
            </span>
          </span>
          {on ? (
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span
                className="eq flex h-4 items-end gap-[3px] text-blood"
                aria-label={ru.soundboard.playing}
              >
                <span />
                <span />
                <span />
                <span />
              </span>
              {remainingSec !== undefined && (
                <span className="font-mono text-[11px] font-bold text-blood tracking-wider">
                  {remainingSec}
                  {ru.soundboard.secSuffix}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[10px] tracking-widest text-ink/40 group-hover:text-ink/70">
                {ru.soundboard.off}
              </span>
              {durationSec !== undefined && (
                <span className="font-mono text-[10px] text-ink/40">
                  {durationSec}
                  {ru.soundboard.secSuffix}
                </span>
              )}
            </div>
          )}

          {/* Progress bar representing remaining playback before auto-disable */}
          {on && durationSec !== undefined && remainingSec !== undefined && (
            <span
              className="absolute bottom-0 left-0 h-[3px] bg-blood transition-all duration-1000 ease-linear pointer-events-none"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, (remainingSec / durationSec) * 100)
                )}%`,
              }}
            />
          )}
        </button>

        {isCustom && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            title={ru.soundboard.uploadModal.deleteConfirm}
            className="absolute -top-2 -right-2 z-10 size-6 rounded-full border-2 border-ink bg-blood text-paper flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>
    );
  }
);

SoundButton.displayName = "SoundButton";
