import { Link } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useLogout } from "@/features/auth/model/useAuth";
import { useAuthUIStore } from "@/store/authStore";
import { ru } from "@/shared/i18n/ru";

export function UserNav() {
  const { data: user } = useCurrentUser();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const openAuthModal = useAuthUIStore((state) => state.openAuthModal);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast.success(ru.auth.logoutSuccess);
      },
    });
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <Link
          to="/me"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-amber-400 rounded border border-neutral-700 transition-colors"
          title={user.email}
        >
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span className="max-w-[120px] truncate">{user.email.split("@")[0]}</span>
          <span className="text-[10px] px-1 py-0.2 bg-amber-400/20 text-amber-400 rounded">
            {user.role}
          </span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer disabled:opacity-50"
          title={ru.auth.logout}
          aria-label={ru.auth.logout}
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <button
        type="button"
        onClick={() => openAuthModal("login")}
        className="px-2.5 py-1 text-neutral-300 hover:text-amber-400 hover:bg-neutral-800/80 rounded transition-colors cursor-pointer"
      >
        {ru.nav.login}
      </button>
      <button
        type="button"
        onClick={() => openAuthModal("register")}
        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded transition-colors cursor-pointer shadow-sm"
      >
        {ru.nav.register}
      </button>
    </div>
  );
}
