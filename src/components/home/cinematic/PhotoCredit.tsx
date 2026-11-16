import Tx from "@/components/i18n/Tx";
import type { HomePhoto } from "@/lib/data/homePhotos";

// "Photo: author · CC0", linking to the Wikimedia Commons page and the licence.
export default function PhotoCredit({ photo, className = "" }: { photo: HomePhoto; className?: string }) {
  const { author, license, licenseUrl, sourceUrl } = photo.credit;
  return (
    <p className={`text-xs text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)] ${className}`}>
      <Tx en="Photo" />:{" "}
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        {author}
      </a>{" "}
      ·{" "}
      <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
        {license}
      </a>
    </p>
  );
}
