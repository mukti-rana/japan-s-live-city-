import Link from "next/link";
import { ChapterHeader, CHAPTER_WIDTH } from "@/components/home/cinematic/Chapter";
import ParallaxImage from "@/components/home/cinematic/ParallaxImage";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import NearbyDiscovery from "@/components/discovery/NearbyDiscovery";
import { HOME_PHOTOS, type HomePhoto } from "@/lib/data/homePhotos";

const BLUR = "blur" as const;
const PAD = "px-(--home-gutter)";

// `place` is the place's own name (a proper noun), shown as it is written. The photographs
// run edge to edge with only a hairline of black between them.
function PlaceCard({ photo, kanji, place, href, sizes, className, delay = 0 }: { photo: HomePhoto; kanji: string; place: string; href: string; sizes: string; className: string; delay?: number }) {
  return (
    <ScrollReveal from="image" className="h-full" delay={delay}>
      <article className={`group relative isolate flex h-full items-end overflow-hidden ${className}`}>
        <ParallaxImage src={photo.src} alt={photo.alt} sizes={sizes} placeholder={BLUR} blurDataURL={photo.blur} className="-z-20 transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className={`flex w-full flex-col items-start gap-3 py-[clamp(24px,5vh,56px)] xl:flex-row xl:items-end xl:justify-between xl:gap-4 ${PAD}`}>
          <div className="min-w-0">
            <p lang="ja" aria-hidden="true" className="font-[family-name:var(--font-home-kanji)] text-[clamp(22px,2.8vw,40px)] text-white/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">
              {kanji}
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-home-serif)] text-[clamp(32px,5.2vw,84px)] font-normal leading-[1.04] tracking-[-0.02em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
              {/* The whole card opens the place: the title link stretches over it. */}
              <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-azure">
                {place}
              </Link>
            </h3>
          </div>
        </div>
      </article>
    </ScrollReveal>
  );
}

// Five places to start from, each opening its real Explore page (Dōtonbori is not in
// the Explore catalogue, so Osaka opens the Osaka city page). Under them, the
// personalised "near you" discovery that has always been on the home page.
export default function WhereTo() {
  const first = "min-h-[max(520px,100svh)]";
  const half = "min-h-[max(440px,78svh)]";
  const halfSizes = "(min-width: 768px) 50vw, 100vw";
  return (
    <section id="where" aria-labelledby="where-h" className="relative scroll-mt-16 pb-[clamp(32px,5vh,56px)] pt-[clamp(72px,12vh,160px)]">
      <div className={CHAPTER_WIDTH}>
        <ChapterHeader id="where" number="03" label="Explore" heading="Where to?" intro="Five places to start. Open any of them in Explore." href="/explore" linkLabel="Explore all" className="mb-[clamp(32px,6vh,72px)]" />
      </div>
      <div className="flex flex-col gap-[3px]">
        <PlaceCard photo={HOME_PHOTOS.fushimi} kanji="伏見稲荷大社" place="Fushimi Inari, Kyoto" href="/explore/Q714828" sizes="100vw" className={first} />
        <div className="grid gap-[3px] md:grid-cols-2">
          <PlaceCard photo={HOME_PHOTOS.dotonbori} kanji="道頓堀" place="Dōtonbori, Osaka" href="/osaka" sizes={halfSizes} className={half} />
          <PlaceCard photo={HOME_PHOTOS.itsukushima} kanji="厳島神社" place="Itsukushima, Miyajima" href="/explore/Q191763" sizes={halfSizes} className={half} delay={0.12} />
        </div>
        <div className="grid gap-[3px] md:grid-cols-2">
          <PlaceCard photo={HOME_PHOTOS.todaiji} kanji="東大寺" place="Tōdai-ji, Nara" href="/explore/Q460367" sizes={halfSizes} className={half} />
          <PlaceCard photo={HOME_PHOTOS.fuji} kanji="富士山" place="Chureito Pagoda & Fuji" href="/explore/Q21652375" sizes={halfSizes} className={half} delay={0.12} />
        </div>
      </div>
      <div className={`${CHAPTER_WIDTH} mt-[clamp(56px,10vh,120px)]`}>
        <ScrollReveal>
          <NearbyDiscovery headingLevel={3} />
        </ScrollReveal>
      </div>
    </section>
  );
}
