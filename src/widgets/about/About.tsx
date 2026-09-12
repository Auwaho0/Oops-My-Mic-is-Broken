import Reveal from "@/shared/ui/reveal/Reveal";
import { ru } from "@/shared/i18n/ru";

export default function About() {
  return (
    <section id="about" className="border-t-4 bg-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="text-sm text-blood font-medium tracking-widest">{ru.about.moduleBadge}</p>
            <h2 className="mt-3 font-display font-bold uppercase leading-[0.9] text-[clamp(2.6rem,7vw,6rem)]">
              {ru.about.headingMain}
              <br />
              {ru.about.headingSub} <span className="relative inline-block">{ru.about.headingAccent}<span className="absolute left-0 right-0 bottom-[0.08em] h-[0.0em] bg-blood" /></span>
            </h2>
            <p className="mt-6 max-w-md font-serif italic text-xl leading-relaxed text-ink/70">
              {ru.about.quote}
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-4 text-sm leading-relaxed text-ink/85">
              <p>{ru.about.p1}</p>
              <p>{ru.about.p2}</p>
              <p>{ru.about.p3}</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-px border-2 border-ink bg-ink">
              {ru.about.stats.map((s) => (
                <div key={s.t} className="bg-paper p-4 transition-colors hover:bg-ink hover:text-paper group">
                  <p className="font-display text-3xl sm:text-4xl font-bold text-blood group-hover:text-blood">{s.n}</p>
                  <p className="mt-1 text-[11px] leading-snug text-ink/70 group-hover:text-paper/70">{s.t}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
