import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { SoundButton } from "./SoundButton";
import { SoundCardSkeleton } from "@/shared/ui/Skeleton";
import type { SoundId } from "@/audio/engine";
import { ru } from "@/shared/i18n/ru";

export interface SoundItem {
  id: SoundId;
  label: string;
  sub: string;
  Icon: LucideIcon;
  durationSec?: number;
  fileUrl?: string;
  isCustom?: boolean;
}

export interface Group {
  id: "renovation" | "family" | "tech" | "other";
  title: string;
  note: string;
  items: SoundItem[];
}

interface GroupSectionProps {
  group: Group;
  active: Record<string, { remainingSec: number; durationSec: number }>;
  onToggle: (id: SoundId, fileUrl?: string) => void;
  onOpenUpload?: (category: "renovation" | "family" | "tech" | "other") => void;
  onDeleteSound?: (id: string) => void;
  isLoading?: boolean;
}

export const GroupSection = memo(
  ({ group, active, onToggle, onOpenUpload, onDeleteSound, isLoading }: GroupSectionProps) => {
    return (
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b-2 border-ink pb-2">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="font-display text-2xl sm:text-3xl font-semibold uppercase">
              {group.title}
            </h3>
            <span className="text-xs text-ink/60">{group.note}</span>
          </div>

          {onOpenUpload && (
            <button
              type="button"
              onClick={() => onOpenUpload(group.id)}
              className="inline-flex items-center gap-1.5 border border-ink/40 bg-paper px-2.5 py-1 text-xs font-mono font-semibold uppercase text-ink hover:border-blood hover:text-blood transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{ru.soundboard.uploadButton}</span>
            </button>
          )}
        </div>

        {isLoading && group.items.length === 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SoundCardSkeleton />
            <SoundCardSkeleton />
            <SoundCardSkeleton />
          </div>
        ) : group.items.length === 0 ? (
          <div className="mt-5 border-2 border-dashed border-ink/40 bg-paper/60 p-6 text-center">
            <p className="font-display text-base font-semibold uppercase text-ink/80">
              {ru.soundboard.otherEmptyTitle}
            </p>
            <p className="mt-1 text-xs text-ink/60 max-w-md mx-auto">
              {ru.soundboard.otherEmptySub}
            </p>
            {onOpenUpload && (
              <button
                type="button"
                onClick={() => onOpenUpload(group.id)}
                className="mt-3 inline-flex items-center gap-2 border-2 border-blood bg-blood px-4 py-2 font-display text-xs font-bold uppercase text-paper hover:bg-ink hover:border-ink transition-colors cursor-pointer"
              >
                <Plus className="size-4" />
                <span>{ru.soundboard.uploadButton}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(
              ({
                id,
                label,
                sub,
                Icon,
                durationSec = 10,
                fileUrl,
                isCustom,
              }) => {
                const activeInfo = active[id];
                return (
                  <SoundButton
                    key={id}
                    id={id}
                    label={label}
                    sub={sub}
                    Icon={Icon}
                    on={Boolean(activeInfo)}
                    remainingSec={activeInfo?.remainingSec}
                    durationSec={durationSec}
                    fileUrl={fileUrl}
                    isCustom={isCustom}
                    onToggle={onToggle}
                    onDelete={onDeleteSound}
                  />
                );
              }
            )}
          </div>
        )}
      </div>
    );
  }
);

GroupSection.displayName = "GroupSection";
