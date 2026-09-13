import { X, Shield } from "lucide-react";
import { useAuthUIStore } from "@/store/authStore";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { RegisterForm } from "@/features/auth/ui/RegisterForm";
import { ru } from "@/shared/i18n/ru";

export function AuthModal() {
  const { isAuthModalOpen, authModalTab, closeAuthModal, setAuthModalTab } =
    useAuthUIStore();

  if (!isAuthModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative w-full max-w-md bg-neutral-950 border-2 border-neutral-700 rounded-lg shadow-2xl p-6 text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
              // AUTHENTICATION_GATEWAY
            </span>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-neutral-900 rounded font-mono text-xs">
          <button
            type="button"
            onClick={() => setAuthModalTab("login")}
            className={`py-2 text-center rounded transition-all cursor-pointer font-bold ${
              authModalTab === "login"
                ? "bg-amber-400 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            [ {ru.nav.login.replace(/[\[\]]/g, "")} ]
          </button>
          <button
            type="button"
            onClick={() => setAuthModalTab("register")}
            className={`py-2 text-center rounded transition-all cursor-pointer font-bold ${
              authModalTab === "register"
                ? "bg-amber-400 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            [ {ru.nav.register.replace(/[\[\]]/g, "")} ]
          </button>
        </div>

        {/* Modal content */}
        <div className="mb-2">
          <h2 className="text-lg font-bold font-mono text-neutral-100 mb-1">
            {authModalTab === "login"
              ? ru.auth.loginTitle
              : ru.auth.registerTitle}
          </h2>
          <p className="text-xs text-neutral-400 mb-4">
            {authModalTab === "login"
              ? ru.auth.loginSubtitle
              : ru.auth.registerSubtitle}
          </p>

          {authModalTab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </div>
  );
}
