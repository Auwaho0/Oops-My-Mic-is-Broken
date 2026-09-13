import { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, EXCUSES, type ExcuseCategory } from "@/data/excuses";
import { cn } from "@/utils/cn";
import { ru } from "@/shared/i18n/ru";
import { excusesApi } from "@/features/excuses/api/excusesApi";
import { useCurrentUser } from "@/features/auth/model/useAuth";
import { useAuthUIStore } from "@/store/authStore";
import { CustomExcusesManager } from "@/features/excuses/ui/CustomExcusesManager";
import Reveal from "../shared/ui/reveal/Reveal";

export default function Generator() {
  const [category, setCategory] = useState<ExcuseCategory>("rude");
  const [full, setFull] = useState<string>("");
  const [shown, setShown] = useState("");
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastIdx, setLastIdx] = useState<Record<string, number>>({});
  const typeTimer = useRef<number | null>(null);

  const { data: user } = useCurrentUser();
  const openAuthModal = useAuthUIStore((state) => state.openAuthModal);

  /* печатная машинка */
  useEffect(() => {
    if (!full) return;
    setShown("");
    let i = 0;
    const tick = () => {
      i += 1;
      setShown(full.slice(0, i));
      if (i < full.length) {
        typeTimer.current = window.setTimeout(tick, 16 + Math.random() * 22);
      }
    };
    typeTimer.current = window.setTimeout(tick, 120);
    return () => {
      if (typeTimer.current) window.clearTimeout(typeTimer.current);
    };
  }, [full]);

  const generate = async () => {
    setIsLoading(true);
    setCopied(false);

    try {
      if (category === "custom") {
        if (!user) {
          openAuthModal("login");
          toast.info(ru.excuses.custom.loginCta);
          setIsLoading(false);
          return;
        }

        try {
          const res = await excusesApi.getRandomExcuse("custom");
          setFull(res.text);
          setCount((c) => c + 1);
        } catch {
          toast.info(ru.excuses.custom.emptyState);
        }
        setIsLoading(false);
        return;
      }

      // System categories (rude, polite, technical, absurd)
      try {
        const res = await excusesApi.getRandomExcuse(category);
        setFull(res.text);
        setCount((c) => c + 1);
      } catch {
        // Offline / fallback to bundled system excuses
        const pool = EXCUSES[category];
        let idx = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && idx === lastIdx[category]) {
          idx = (idx + 1) % pool.length;
        }
        setLastIdx((m) => ({ ...m, [category]: idx }));
        setFull(pool[idx]);
        setCount((c) => c + 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copy = async () => {
    if (!full) return;
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = full;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    toast.success(ru.excuses.copiedButton);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const typing = shown.length < full.length;
  const cat = CATEGORIES.find((c) => c.id === category)!;

  return (
    <section id="excuses" className="border-y-2 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <p className="text-sm text-blood font-medium tracking-widest">
            {ru.excuses.moduleBadge}
          </p>
          <h2 className="mt-3 font-display font-bold uppercase leading-[0.9] text-[clamp(2.4rem,7vw,5.5rem)]">
            {ru.excuses.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper/70">
            {ru.excuses.description}
          </p>
        </Reveal>

        {/* фильтры */}
        <Reveal delay={60}>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                title={c.hint}
                className={cn(
                  "border-2 px-4 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all cursor-pointer flex items-center gap-1.5",
                  category === c.id
                    ? "border-paper bg-paper text-ink shadow-[4px_4px_0_var(--color-blood)]"
                    : "border-paper/40 text-paper/80 hover:border-paper hover:text-paper",
                )}
              >
                {c.id === "custom" && (
                  user ? (
                    <UserCheck className="size-3.5 text-blood" />
                  ) : (
                    <Sparkles className="size-3.5 text-paper/50" />
                  )
                )}
                {c.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* вывод */}
        <Reveal delay={120}>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="relative border-[3px] border-paper/80 bg-ink p-6 sm:p-8 min-h-[10rem]">
              <span className="absolute -top-3 left-5 bg-ink px-2 text-[10px] tracking-widest text-paper/60">
                {ru.excuses.incomingMessage} {cat.label}
              </span>
              {full ? (
                <p className="font-mono text-lg sm:text-2xl leading-snug">
                  «{shown}
                  {typing && <span className="anim-caret text-blood">▌</span>}
                  {!typing && "»"}
                </p>
              ) : (
                <p className="font-mono text-lg sm:text-2xl text-paper/40">
                  {ru.excuses.placeholder}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-paper/50">
                <span>{ru.excuses.sentPrefix}</span>
                <span>·</span>
                <span>{ru.excuses.devicePrefix}</span>
                <span>·</span>
                <span>{ru.excuses.sessionCountPrefix} {count}</span>
              </div>
            </div>

            <div className="flex lg:flex-col gap-3">
              <button
                type="button"
                onClick={generate}
                disabled={isLoading}
                className="group cursor-pointer inline-flex flex-1 lg:flex-none items-center justify-center gap-3 border-[3px] border-paper bg-blood px-6 py-5 font-display text-xl sm:text-2xl font-semibold uppercase text-paper shadow-[6px_6px_0_var(--color-paper)] transition-all hover:-translate-y-1 active:translate-x-1.5 active:translate-y-1.5 active:shadow-none disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "size-6 transition-transform duration-500",
                    isLoading ? "animate-spin" : "group-hover:rotate-180"
                  )}
                />
                {ru.excuses.generateButton}
              </button>
              <button
                type="button"
                onClick={copy}
                disabled={!full}
                className={cn(
                  "cursor-pointer inline-flex flex-1 lg:flex-none items-center justify-center gap-2 border-[3px] border-paper px-5 py-3 text-sm font-medium tracking-wide transition-all",
                  !full && "opacity-40 cursor-not-allowed",
                  copied
                    ? "bg-ok text-paper"
                    : "bg-transparent text-paper hover:bg-paper hover:text-ink",
                )}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? ru.excuses.copiedButton : ru.excuses.copyButton}
              </button>
            </div>
          </div>
        </Reveal>

        {/* Custom excuses management panel (when 'custom' tab is selected) */}
        {category === "custom" && (
          <Reveal delay={150}>
            <div className="mt-8 border-[3px] border-paper/40 bg-ink/90 p-6 sm:p-8">
              <CustomExcusesManager
                onSelectExcuse={(text) => {
                  setFull(text);
                  setCount((c) => c + 1);
                }}
              />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
