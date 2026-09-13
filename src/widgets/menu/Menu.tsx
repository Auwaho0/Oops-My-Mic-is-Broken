import { ru } from "@/shared/i18n/ru";
import { UserNav } from "@/features/auth/ui/UserNav";
import { PWAInstallButton } from "@/shared/pwa/PWAInstallButton";

const NAV = [
  { label: ru.nav.menu, href: "#top" },
  { label: ru.nav.soundboard, href: "#sounds" },
  { label: ru.nav.excuses, href: "#excuses" },
  { label: ru.nav.about, href: "#about" },
  { label: ru.nav.contacts, href: "#contacts" },
];

export default function Menu() {
  return (
    <nav className="flex flex-wrap font-mono-code items-center justify-between gap-x-5 gap-y-2 py-2.5 mx-auto max-w-7xl px-4 sm:px-6 pb-1">
      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1">
        {NAV.map((n) => (
          <a
            key={n.label}
            href={n.href}
            className="select-none py-1 px-2 border-b-2 border-transparent transition-all cursor-pointer whitespace-nowrap hover:text-red-600 hover:border-black text-xs sm:text-sm"
          >
            {n.label}
          </a>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <PWAInstallButton variant="header" />
        <span className="hidden lg:inline text-xs text-ink/60">
          {ru.nav.audioHint}
        </span>
        <UserNav />
      </div>
    </nav>
  );
}
