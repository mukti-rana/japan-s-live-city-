import Image from "next/image";
import T from "@/components/i18n/T";

export default function AlwaysAliveCard() {
  return (
    <div className="relative h-full min-h-[240px] overflow-hidden p-5">
      <Image
        src="/images/sakura-pagoda.jpg"
        alt="Illuminated pagoda surrounded by cherry blossoms at night"
        fill
        sizes="(min-width: 1280px) 20vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1a]/85 via-[#0b0e1a]/25 to-[#0b0e1a]/40" />

      <div className="relative flex h-full flex-col">
        <p className="text-2xl font-medium leading-snug tracking-tight text-foreground/95">
          <T k="hero.alwaysAlive" /> <span className="text-sakura">🌸</span>
        </p>

        <p className="mt-auto font-jp text-xs text-foreground/70">
          日本は、いつも生きている
        </p>
      </div>
    </div>
  );
}
