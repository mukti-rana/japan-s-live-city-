import Link from "next/link";
import Tx from "@/components/i18n/Tx";

// The Community sections: Discover (photos and reviews) and Questions.
export default function CommunityTabs({ active }: { active: "discover" | "questions" | "me" }) {
  const tab = (on: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
      on ? "border-lilac/60 bg-lilac/15 text-lilac" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
    }`;
  return (
    <nav className="flex flex-wrap gap-2">
      <Link href="/community" className={tab(active === "discover")} aria-current={active === "discover" ? "page" : undefined}>
        <Tx en="Discover" />
      </Link>
      <Link href="/community/questions" className={tab(active === "questions")} aria-current={active === "questions" ? "page" : undefined}>
        <Tx en="Questions & Answers" />
      </Link>
      <Link href="/community/me" className={tab(active === "me")} aria-current={active === "me" ? "page" : undefined}>
        <Tx en="My contributions" />
      </Link>
    </nav>
  );
}
