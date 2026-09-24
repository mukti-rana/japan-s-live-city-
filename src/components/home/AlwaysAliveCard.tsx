import Image from "next/image";
import T from "@/components/i18n/T";

export default function AlwaysAliveCard() {
  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-glass-border bg-panel p-5">
      <Image
        src="/images/sakura-pagoda.jpg"
        alt="Illuminated pagoda surrounded by cherry blossoms at night"
        fill
        sizes="(min-width: 1280px) 20vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1a]/85 via-[#0b0e1a]/25 to-[#0b0e1a]/40" />

      <div className="dark-scene relative flex h-full flex-col">
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-mint/15 px-2.5 py-1 text-[10px] font-medium text-mint backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_1px_rgba(74,222,128,0.8)]" />
          <T k="widget.live" />
        </span>

        <p className="mt-4 text-2xl font-medium leading-snug tracking-tight text-foreground/95">
          <T k="hero.alwaysAlive" /> <span className="text-sakura">🌸</span>
        </p>

        <p className="mt-auto font-jp text-xs text-foreground/70">
          日本は、いつも生きている
        </p>
      </div>
    </div>
  );
}
