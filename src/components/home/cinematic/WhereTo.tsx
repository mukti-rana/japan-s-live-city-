import Link from "next/link";
import Chapter from "@/components/home/cinematic/Chapter";
import ParallaxImage from "@/components/home/cinematic/ParallaxImage";
import PhotoCredit from "@/components/home/cinematic/PhotoCredit";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import NearbyDiscovery from "@/components/discovery/NearbyDiscovery";
import { HOME_PHOTOS, type HomePhoto } from "@/lib/data/homePhotos";

const BLUR = "blur" as const;

// `place` is the place's own name (a proper noun), shown as it is written.
function PlaceCard({ photo, kanji, place, href, sizes, className }: { photo: HomePhoto; kanji: string; place: string; href: string; sizes: string; className: string }) {
  return (
    <ScrollReveal>
      <article className={`group relative isolate flex items-end overflow-hidden rounded-2xl border border-line ${className}`}>
        <ParallaxImage src={photo.src} alt={photo.alt} sizes={sizes} quality={75} placeholder={BLUR} blurDataURL={photo.blur} className="-z-20 transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
        <div className="flex w-full items-end justify-between gap-4 p-[clamp(20px,3vw,40px)]">
          <div className="min-w-0">
            <p lang="ja" aria-hidden="true" className="font-[family-name:var(--font-home-kanji)] text-[clamp(20px,2.6vw,30px)] text-white/80">
              {kanji}
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-home-serif)] text-[clamp(26px,3.6vw,46px)] font-normal leading-[1.08] tracking-[-0.01em] text-white">
              {/* The whole card opens the place: the title link stretches over it. */}
              <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-azure">
                {place}
              </Link>
            </h3>
          </div>
          <PhotoCredit photo={photo} className="relative z-10 hidden shrink-0 text-right sm:block" />
        </div>
      </article>
    </ScrollReveal>
  );
}

// Five places to start from, each opening its real Explore page (Dōtonbori is not in
// the Explore catalogue, so Osaka opens the Osaka city page). Under them, the
// personalised "near you" discovery that has always been on the home page.
export default function WhereTo() {
  const wide = "min-h-[clamp(320px,48vw,580px)]";
  const half = "min-h-[clamp(280px,34vw,440px)]";
  const halfSizes = "(min-width: 1240px) 620px, (min-width: 768px) 50vw, 100vw";
  return (
    <Chapter id="where" number="03" label="Explore" heading="Where to?" intro="Five places to start. Open any of them in Explore." href="/explore" linkLabel="Explore all">
      <div className="flex flex-col gap-[clamp(14px,2vw,24px)]">
        <PlaceCard photo={HOME_PHOTOS.fushimi} kanji="伏見稲荷大社" place="Fushimi Inari, Kyoto" href="/explore/Q714828" sizes="(min-width: 1240px) 1240px, 100vw" className={wide} />
        <div className="grid gap-[clamp(14px,2vw,24px)] md:grid-cols-2">
          <PlaceCard photo={HOME_PHOTOS.dotonbori} kanji="道頓堀" place="Dōtonbori, Osaka" href="/osaka" sizes={halfSizes} className={half} />
          <PlaceCard photo={HOME_PHOTOS.itsukushima} kanji="厳島神社" place="Itsukushima, Miyajima" href="/explore/Q191763" sizes={halfSizes} className={half} />
        </div>
        <div className="grid gap-[clamp(14px,2vw,24px)] md:grid-cols-2">
          <PlaceCard photo={HOME_PHOTOS.todaiji} kanji="東大寺" place="Tōdai-ji, Nara" href="/explore/Q460367" sizes={halfSizes} className={half} />
          <PlaceCard photo={HOME_PHOTOS.fuji} kanji="富士山" place="Chureito Pagoda & Fuji" href="/explore/Q21652375" sizes={halfSizes} className={half} />
        </div>
      </div>
      <div className="mt-[clamp(32px,5vw,64px)]">
        <ScrollReveal>
          <NearbyDiscovery />
        </ScrollReveal>
      </div>
    </Chapter>
  );
}
