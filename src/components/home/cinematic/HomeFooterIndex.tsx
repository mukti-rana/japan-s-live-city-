import Link from "next/link";
import ScrollReveal from "@/components/home/cinematic/ScrollReveal";
import T from "@/components/i18n/T";
import Tx from "@/components/i18n/Tx";
import type { TranslationKey } from "@/lib/i18n/translationKeys";

type L = { href: string; key?: TranslationKey; en?: string };
const COLUMNS: { heading: string; links: L[] }[] = [
  { heading: "Go", links: [{ href: "/", key: "nav.home" }, { href: "/map", key: "nav.map" }, { href: "/explore", key: "nav.explore" }, { href: "/cities", key: "nav.cities" }] },
  { heading: "Live", links: [{ href: "/weather", key: "nav.weather" }, { href: "/trains", key: "nav.trains" }, { href: "/emergency", key: "nav.emergency" }, { href: "/earthquakes", key: "quickaccess.earthquakes" }] },
  { heading: "Read", links: [{ href: "/news", key: "nav.news" }, { href: "/trending", key: "nav.trending" }, { href: "/events", key: "nav.events" }, { href: "/calendar", key: "nav.calendar" }] },
  { heading: "Community", links: [{ href: "/community", en: "Discover" }, { href: "/community/help", en: "Need Help" }, { href: "/community/me", en: "My Contributions" }] },
  { heading: "More", links: [{ href: "/ai-assistant", key: "quickaccess.ai" }, { href: "/settings", key: "nav.settings" }, { href: "/credits", en: "Photo credits" }, { href: "/login", en: "Sign in" }] },
];

const link = "inline-flex min-h-9 items-center rounded text-text-secondary transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// A plain list of every destination — the sidebar is hidden on the home page, so this
// keeps everything one click away. Photo credits are not printed on this page; they are one link away (/credits).
export default function HomeFooterIndex() {
  return (
    <section aria-labelledby="home-index-h" className="border-t border-white/10 pb-[clamp(120px,14vw,160px)] pt-[clamp(48px,7vw,88px)]">
      <div className="mx-auto w-full max-w-[1480px] px-(--home-gutter)">
        <h2 id="home-index-h" className="sr-only">
          <Tx en="All destinations" />
        </h2>
        <nav aria-labelledby="home-index-h" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((c, i) => (
            <ScrollReveal key={c.heading} delay={i * 0.06}>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
                <Tx en={c.heading} />
              </p>
              <ul className="flex flex-col text-sm">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={link}>
                      {l.key ? <T k={l.key} /> : <Tx en={l.en!} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          ))}
        </nav>
      </div>
    </section>
  );
}
