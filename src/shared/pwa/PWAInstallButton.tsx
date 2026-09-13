import { useState } from "react";
import { Download, Share2, X, Smartphone, Check } from "lucide-react";
import { usePWAInstall } from "./usePWAInstall";
import { ru } from "@/shared/i18n/ru";

interface PWAInstallButtonProps {
  variant?: "header" | "footer" | "banner";
}

export function PWAInstallButton({ variant = "header" }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    if (variant === "footer") {
      return (
        <span className="inline-flex items-center gap-1.5 border border-ink/30 bg-paper-deep px-2 py-0.5 font-mono text-[10px] text-ink/70">
          <Check className="size-3 text-emerald-600" />
          {ru.pwa.alreadyInstalled}
        </span>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setJustInstalled(true);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General prompt modal or tooltip
      setShowIOSModal(true);
    }
  };

  if (justInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 border-2 border-emerald-600 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800">
        <Check className="size-3.5" />
        {ru.pwa.alreadyInstalled}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title={ru.pwa.installTooltip}
        className={
          variant === "header"
            ? "group flex items-center gap-1.5 border-2 border-ink bg-amber-300 px-2.5 py-1 font-mono text-xs font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] hover:bg-amber-400 hover:shadow-[3px_3px_0_var(--color-ink)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            : "group inline-flex items-center gap-2 border-2 border-ink bg-amber-300 px-4 py-2 font-mono text-xs font-bold text-ink shadow-[3px_3px_0_var(--color-ink)] hover:bg-amber-400 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
        }
      >
        <Download className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
        <span>{isIOS ? ru.pwa.installIOS : ru.pwa.installBtn}</span>
      </button>

      {/* iOS / General Install Guidance Modal */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="relative w-full max-w-md border-3 border-ink bg-paper p-6 font-mono text-ink shadow-[8px_8px_0_var(--color-ink)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-ink pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center border-2 border-ink bg-amber-300 text-ink">
                  <Smartphone className="size-5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-ink/60 uppercase">
                    // PWA DEPLOYMENT
                  </p>
                  <h3 className="font-display text-base font-bold text-ink uppercase">
                    {ru.pwa.iosModal.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="grid size-8 place-items-center border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="flex items-start gap-3 border border-ink/20 bg-paper-deep p-3">
                <Share2 className="mt-0.5 size-4 text-blood shrink-0" />
                <span>{ru.pwa.iosModal.step1}</span>
              </div>
              <div className="flex items-start gap-3 border border-ink/20 bg-paper-deep p-3">
                <Download className="mt-0.5 size-4 text-blood shrink-0" />
                <span>{ru.pwa.iosModal.step2}</span>
              </div>
              <div className="flex items-start gap-3 border border-ink/20 bg-paper-deep p-3">
                <Check className="mt-0.5 size-4 text-emerald-600 shrink-0" />
                <span>{ru.pwa.iosModal.step3}</span>
              </div>
              <p className="text-[11px] text-ink/70 italic pt-1">
                {ru.pwa.iosModal.hint}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full border-2 border-ink bg-ink py-2.5 font-display text-sm font-bold uppercase tracking-wider text-paper hover:bg-blood transition-colors cursor-pointer"
            >
              {ru.pwa.iosModal.closeBtn}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
