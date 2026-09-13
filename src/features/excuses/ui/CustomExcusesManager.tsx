import { useState } from "react";
import { Plus, Trash2, Lock, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/model/useAuth";
import { useAuthUIStore } from "@/store/authStore";
import { useExcusesList, useCreateExcuse, useDeleteExcuse } from "@/features/excuses/model/useExcuses";
import { ExcuseCardSkeleton } from "@/shared/ui/Skeleton";
import { ru } from "@/shared/i18n/ru";

interface CustomExcusesManagerProps {
  onSelectExcuse?: (text: string) => void;
}

export function CustomExcusesManager({ onSelectExcuse }: CustomExcusesManagerProps) {
  const { data: user } = useCurrentUser();
  const openAuthModal = useAuthUIStore((state) => state.openAuthModal);
  const [newExcuseText, setNewExcuseText] = useState("");

  const { data: excusesData, isLoading } = useExcusesList("custom");
  const { mutate: createExcuse, isPending: isCreating } = useCreateExcuse();
  const { mutate: deleteExcuse, isPending: isDeleting } = useDeleteExcuse();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newExcuseText.trim();
    if (text.length < 3) {
      toast.error(ru.excuses.custom.validationShort);
      return;
    }

    createExcuse(text, {
      onSuccess: () => {
        toast.success(ru.excuses.custom.createdSuccess);
        setNewExcuseText("");
      },
      onError: (err: any) => {
        const detail = err?.response?.data?.detail || "Ошибка при создании";
        toast.error(typeof detail === "string" ? detail : "Ошибка при создании");
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteExcuse(id, {
      onSuccess: () => {
        toast.success(ru.excuses.custom.deletedSuccess);
      },
      onError: (err: any) => {
        const detail = err?.response?.data?.detail || "Ошибка при удалении";
        toast.error(typeof detail === "string" ? detail : "Ошибка при удалении");
      },
    });
  };

  if (!user) {
    return (
      <div className="border-2 border-dashed border-paper/30 bg-ink/60 p-6 sm:p-8 rounded text-center space-y-4 font-mono">
        <div className="w-10 h-10 rounded-full bg-paper/10 text-paper flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold uppercase tracking-wider text-paper">
            {ru.excuses.custom.title}
          </h4>
          <p className="text-xs text-paper/70 max-w-md mx-auto">
            {ru.excuses.custom.loginCta}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-paper text-ink font-bold text-xs uppercase tracking-wider hover:bg-paper/90 transition-colors cursor-pointer shadow-[3px_3px_0_var(--color-blood)]"
        >
          <Sparkles className="w-4 h-4 text-blood" />
          {ru.excuses.custom.loginBtn}
        </button>
      </div>
    );
  }

  const customItems = excusesData?.items ?? [];

  return (
    <div className="space-y-6 font-mono text-paper">
      {/* Form to add custom excuse */}
      <form onSubmit={handleAdd} className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-paper/80">
          // {ru.excuses.custom.addTitle}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newExcuseText}
            onChange={(e) => setNewExcuseText(e.target.value)}
            placeholder={ru.excuses.custom.inputPlaceholder}
            className="flex-1 bg-ink border-2 border-paper/50 px-4 py-2 text-sm text-paper placeholder:text-paper/40 focus:border-paper focus:outline-none"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={isCreating || newExcuseText.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-paper text-ink font-bold text-xs uppercase tracking-wider hover:bg-paper/90 transition-colors cursor-pointer disabled:opacity-40 shadow-[3px_3px_0_var(--color-blood)] shrink-0"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {ru.excuses.custom.submitBtn}
          </button>
        </div>
      </form>

      {/* List of custom excuses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-paper/60 border-b border-paper/20 pb-1">
          <span>{ru.excuses.custom.myListCount}</span>
          <span className="font-bold text-paper">{customItems.length}</span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <ExcuseCardSkeleton />
            <ExcuseCardSkeleton />
            <ExcuseCardSkeleton />
          </div>
        ) : customItems.length === 0 ? (
          <div className="p-4 border border-paper/20 bg-ink/40 text-xs text-paper/50 text-center">
            {ru.excuses.custom.emptyState}
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {customItems.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-3 p-3 bg-ink border border-paper/30 hover:border-paper/70 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onSelectExcuse?.(item.text)}
                  className="flex-1 text-left text-xs sm:text-sm text-paper/90 hover:text-paper cursor-pointer font-sans"
                  title="Нажмите, чтобы загрузить в терминал"
                >
                  «{item.text}»
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting}
                  className="p-1.5 text-paper/40 hover:text-blood hover:bg-paper/10 rounded transition-colors cursor-pointer shrink-0"
                  title={ru.excuses.custom.deleteBtn}
                  aria-label={ru.excuses.custom.deleteBtn}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
