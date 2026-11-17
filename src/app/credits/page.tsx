import type { Metadata } from "next";
import Tx from "@/components/i18n/Tx";
import { HOME_PHOTOS } from "@/lib/data/homePhotos";

export const metadata: Metadata = {
  title: "Photo credits — Live City Japan",
  description: "Who took the photographs used on Live City Japan, and under what licence.",
};

const link = "underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// Every photograph on the homepage, with its photographer and licence. The homepage itself carries no photo
// credits (it is meant to read as pictures and type on black); this page is where they live, linked from the
// footer. CC BY credit requires the photographer, the licence and a link to the source, and says the picture was
// changed: each is here.
export default function CreditsPage() {
  const photos = Object.values(HOME_PHOTOS);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          <Tx en="Photo credits" />
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <Tx en="The photographs on the home page are from Wikimedia Commons. Each was resized to 2560 px wide and compressed to WebP, and its camera data was removed. CC0 photographs need no credit and are listed as a courtesy; CC BY photographs are used with credit under their licence." />
        </p>
      </div>
      <ul className="divide-y divide-glass-border rounded-2xl border border-glass-border bg-glass-bg">
        {photos.map((p) => (
          <li key={p.src} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <p className="text-sm text-foreground">{p.credit.title.replace(/\.(jpe?g|png|webp)$/i, "")}</p>
            <p className="text-xs text-muted">
              <a href={p.credit.sourceUrl} target="_blank" rel="noopener noreferrer" className={link}>
                {p.credit.author}
              </a>{" "}
              ·{" "}
              <a href={p.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={link}>
                {p.credit.license}
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-muted">
        <Tx en="Photographs of places in Explore and Discover near you carry their own credit on each place's page." />
      </p>
    </div>
  );
}
