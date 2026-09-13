import { useState, useRef, useCallback } from "react";
import { Upload, X, Music, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useUploadSound } from "@/features/soundboard/model/useSounds";
import { useCurrentUser } from "@/features/auth/model/useAuth";
import { useAuthUIStore } from "@/store/authStore";
import type { SoundCategory } from "@/entities/sound/types";
import { ru } from "@/shared/i18n/ru";

interface SoundUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: SoundCategory;
}

export function SoundUploadModal({
  isOpen,
  onClose,
  defaultCategory = "other",
}: SoundUploadModalProps) {
  const { data: user } = useCurrentUser();
  const openAuthModal = useAuthUIStore((s) => s.openAuthModal);
  const uploadSoundMutation = useUploadSound();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SoundCategory>(defaultCategory);
  const [duration, setDuration] = useState(10);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setError(null);
    if (f.size > 5 * 1024 * 1024) {
      setError("Размер файла превышает 5 МБ.");
      return;
    }
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "wav", "ogg", "m4a"].includes(ext || "")) {
      setError("Поддерживаются только форматы MP3, WAV, OGG, M4A.");
      return;
    }

    // Try detecting duration via temporary audio object
    try {
      const url = URL.createObjectURL(f);
      const tempAudio = new Audio(url);
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          setDuration(Math.min(30, Math.max(1, Math.round(tempAudio.duration))));
        }
        URL.revokeObjectURL(url);
      };
    } catch {
      // Ignore fallback
    }

    setFile(f);
    if (!title) {
      const baseName = f.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName.slice(0, 50));
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("login");
      return;
    }
    if (!file) {
      setError("Выберите аудиофайл для загрузки.");
      return;
    }
    if (!title.trim() || title.length < 2) {
      setError("Укажите понятное название звука (от 2 до 100 символов).");
      return;
    }

    setError(null);
    try {
      await uploadSoundMutation.mutateAsync({
        file,
        title: title.trim(),
        category,
        estimatedDuration: duration,
      });
      toast.success(ru.soundboard.uploadModal.uploadSuccess);
      onClose();
      // Reset form
      setFile(null);
      setTitle("");
      setDuration(10);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Ошибка при загрузке аудиофайла. Проверьте формат и размер.";
      setError(msg);
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg border-2 border-ink bg-paper p-6 shadow-[8px_8px_0_var(--color-ink)] max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть модальное окно"
          className="absolute right-4 top-4 border border-ink/40 p-1 text-ink/70 hover:border-blood hover:text-blood transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        <div className="border-b border-ink/20 pb-3">
          <p className="font-mono text-xs text-blood tracking-widest uppercase">
            // МОДУЛЬ ЗАГРУЗКИ — S3/MINIO
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold uppercase">
            {ru.soundboard.uploadModal.title}
          </h3>
          <p className="mt-1 text-xs text-ink/70">
            {ru.soundboard.uploadModal.subtitle}
          </p>
        </div>

        {!user ? (
          <div className="mt-6 border-2 border-dashed border-blood/50 bg-blood/5 p-6 text-center">
            <AlertCircle className="size-8 text-blood mx-auto mb-2" />
            <p className="font-display font-semibold text-sm uppercase text-ink">
              {ru.soundboard.uploadModal.loginRequired}
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal("login");
              }}
              className="mt-4 inline-flex items-center gap-2 border-2 border-blood bg-blood px-4 py-2 font-display text-xs font-bold uppercase text-paper hover:bg-ink hover:border-ink transition-colors cursor-pointer"
            >
              Войти в систему
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="border border-blood bg-blood/10 p-3 text-xs text-blood font-mono">
                {error}
              </div>
            )}

            <div>
              <label className="block font-mono text-xs font-bold uppercase text-ink/80 mb-1">
                {ru.soundboard.uploadModal.titleLabel}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={ru.soundboard.uploadModal.titlePlaceholder}
                className="w-full border-2 border-ink bg-amber-50/50 px-3 py-2 text-sm font-sans placeholder:text-ink/40 focus:outline-hidden focus:border-blood"
                maxLength={100}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-ink/80 mb-1">
                  {ru.soundboard.uploadModal.categoryLabel}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SoundCategory)}
                  className="w-full border-2 border-ink bg-amber-50/50 px-3 py-2 text-sm font-sans focus:outline-hidden focus:border-blood cursor-pointer"
                >
                  <option value="other">Свои звуки (other)</option>
                  <option value="renovation">Ремонт (renovation)</option>
                  <option value="family">Семья (family)</option>
                  <option value="tech">Техника (tech)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase text-ink/80 mb-1">
                  {ru.soundboard.uploadModal.durationHint} ({duration}с)
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full mt-2 accent-blood cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase text-ink/80 mb-1">
                {ru.soundboard.uploadModal.fileLabel}
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-blood bg-blood/10"
                    : file
                    ? "border-ink bg-paper"
                    : "border-ink/40 bg-amber-50/60 hover:border-ink"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mp3,audio/wav,audio/ogg,audio/x-m4a,audio/mpeg,.mp3,.wav,.ogg,.m4a"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <Music className="size-6 text-blood shrink-0" />
                    <div className="text-left">
                      <p className="font-mono text-xs font-bold text-ink truncate max-w-[240px]">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-ink/60 font-mono">
                        {(file.size / (1024 * 1024)).toFixed(2)} МБ • ~{duration} сек
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="size-6 text-ink/50 mx-auto" />
                    <p className="text-xs font-mono text-ink/80">
                      {ru.soundboard.uploadModal.dragDropText}
                    </p>
                    <p className="text-[11px] text-ink/50 font-mono">
                      MP3, WAV, OGG, M4A (макс. 5 МБ, до 30 сек)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-ink/60 font-mono">
              * {ru.soundboard.uploadModal.maxLimitHint}
            </p>

            <div className="pt-2">
              <button
                type="submit"
                disabled={uploadSoundMutation.isPending || !file}
                className="w-full border-2 border-blood bg-blood py-2.5 font-display text-sm font-bold uppercase text-paper shadow-[3px_3px_0_var(--color-ink)] hover:bg-ink hover:border-ink hover:text-paper transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {uploadSoundMutation.isPending
                  ? ru.soundboard.uploadModal.submitting
                  : ru.soundboard.uploadModal.submitBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
