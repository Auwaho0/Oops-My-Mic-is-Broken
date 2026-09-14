import { Link, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Shield,
  Calendar,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Volume2,
  MessageSquare,
  Lock,
  Trash2,
  Music,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useCurrentUser, useLogout } from "@/features/auth/model/useAuth";
import { useAuthUIStore } from "@/store/authStore";
import { AuthModal } from "@/features/auth/ui/AuthModal";
import { useSounds, useDeleteSound } from "@/features/soundboard/model/useSounds";
import { useExcusesList } from "@/features/excuses/model/useExcuses";
import { ru } from "@/shared/i18n/ru";

export function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const openAuthModal = useAuthUIStore((state) => state.openAuthModal);
  const navigate = useNavigate();

  const { data: soundsData } = useSounds();
  const { data: customExcusesData } = useExcusesList("custom");
  const deleteSoundMutation = useDeleteSound();

  const userSounds = soundsData?.items.filter((s) => s.user_id === user?.id || !s.is_system) || [];
  const excusesCount = customExcusesData?.total ?? 0;

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast.success(ru.auth.logoutSuccess);
        navigate("/");
      },
    });
  };

  const handleDeleteSound = async (id: string) => {
    if (!window.confirm("Удалить этот звук из арсенала?")) return;
    try {
      await deleteSoundMutation.mutateAsync(id);
      toast.success(ru.soundboard.uploadModal.deleteSuccess);
    } catch {
      toast.error("Не удалось удалить звук.");
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center font-mono">
        <div className="text-amber-400 animate-pulse">// LOADING AGENT PROFILE...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex items-center justify-center font-mono">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100">
            {ru.auth.authRequired}
          </h2>
          <p className="text-xs text-neutral-400">
            {ru.auth.loginSubtitle}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer"
            >
              {ru.auth.submitLogin}
            </button>
            <Link
              to="/"
              className="w-full py-2 text-xs text-neutral-400 hover:text-neutral-200"
            >
              ← {ru.auth.profile.backToApp}
            </Link>
          </div>
        </div>
        <AuthModal />
        <Toaster position="bottom-right" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-8 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-amber-400 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            {ru.auth.profile.backToApp}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {ru.auth.logout}
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-6 shadow-xl">
          <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center font-bold text-lg">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-100 uppercase tracking-wider">
                  {ru.auth.profile.title}
                </h1>
                <p className="text-xs text-neutral-400">{ru.auth.profile.subtitle}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs rounded uppercase font-bold tracking-wider">
              {user.role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                {ru.auth.profile.emailLabel}
              </span>
              <p className="text-neutral-200 font-bold truncate">{user.email}</p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                {ru.auth.profile.roleLabel}
              </span>
              <p className="text-neutral-200 font-bold">
                {ru.auth.profile.roles[user.role as keyof typeof ru.auth.profile.roles] || user.role}
              </p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {ru.auth.profile.statusLabel}
              </span>
              <p className="text-emerald-400 font-bold">{ru.auth.profile.activeStatus}</p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {ru.auth.profile.registeredAtLabel}
              </span>
              <p className="text-neutral-200">{formatDate(user.created_at)}</p>
            </div>
          </div>

          {/* Module Assets Stats */}
          <div className="pt-2">
            <h3 className="text-xs uppercase text-neutral-400 tracking-wider mb-3">
              // AGENT ALIBI ARSENAL
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-lg font-bold text-neutral-100">{userSounds.length}</div>
                  <div className="text-[11px] text-neutral-400">{ru.auth.profile.mySoundsCount}</div>
                </div>
              </div>
              <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-lg font-bold text-neutral-100">{excusesCount}</div>
                  <div className="text-[11px] text-neutral-400">{ru.auth.profile.myExcusesCount}</div>
                </div>
              </div>
            </div>
          </div>

          {/* List of user's custom sounds */}
          {userSounds.length > 0 && (
            <div className="pt-4 border-t border-neutral-800">
              <h3 className="text-xs uppercase text-neutral-400 tracking-wider mb-3">
                // UPLOADED AUDIO FILES ({userSounds.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {userSounds.map((sound) => (
                  <div
                    key={sound.id}
                    className="p-2.5 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Music className="size-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-200 truncate">{sound.title}</p>
                        <p className="text-[10px] text-neutral-500">
                          Категория: {sound.category} • {Math.round(sound.duration_sec)}с •{" "}
                          {(sound.file_size / (1024 * 1024)).toFixed(2)} МБ
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSound(sound.id)}
                      disabled={deleteSoundMutation.isPending}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                      title="Удалить"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
