"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Video } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import T from "@/components/i18n/T";

// Honest demo: no real camera feed exists anywhere in this project or was
// supplied, so this reuses an existing real city photo as the "feed" and
// clearly labels itself DEMO CAMERA rather than claiming to be live. No
// invented metrics (pedestrian density, visibility, etc.) are shown.
export default function LiveCityCamCard() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <GlassCard className="relative overflow-hidden p-0">
      <div className="relative h-full min-h-[220px] w-full">
        <Image
          src="/images/place-shibuya.jpg"
          alt="Shibuya Crossing"
          fill
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e1a]/85 via-[#0b0e1a]/15 to-[#0b0e1a]/40" />

        <motion.div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/70 to-transparent"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
          <Video size={11} />
          <T k="citycam.demoLabel" />
        </div>

        <div className="absolute right-3 top-3 rounded-md border border-glass-border bg-black/40 px-2 py-1 font-mono text-[10px] text-neon-cyan backdrop-blur-sm" suppressHydrationWarning>
          {time ?? "--:--:--"}
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              <T k="citycam.title" />
            </p>
            <p className="font-mono text-[10px] text-foreground/70">CAM 01 · SHIBUYA, TOKYO</p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-3 border border-neon-cyan/20" />
      </div>
    </GlassCard>
  );
}
