import type { Metadata } from "next";
import NewPostForm from "@/components/community/NewPostForm";
import Tx from "@/components/i18n/Tx";
import { getDestination } from "@/lib/explore/catalogue";

export const metadata: Metadata = {
  title: "Share your experience — Community",
  description: "Share photos and your experience of a place in Japan.",
  // A form, not content: nothing here is for search engines.
  robots: { index: false, follow: false },
};

// ?place=Q123 (from a place's page) pre-fills the place, which also decides the area.
export default async function NewPostPage({ searchParams }: PageProps<"/community/new">) {
  const raw = (await searchParams).place;
  const ref = Array.isArray(raw) ? raw[0] : raw;
  const place = ref && /^Q[0-9]{1,12}$/.test(ref) ? getDestination(ref) : null;
  const initialPlace = place ? { label: place.names.en ?? place.names.ja ?? "", ref: place.id, areaId: place.prefectureId } : undefined;
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <Tx en="Community" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Share your experience" />
        </h1>
        <p className="mt-2 text-sm text-foreground/85">
          <Tx en="Help the next visitor: show them what it's really like." />
        </p>
      </header>
      <NewPostForm initialPlace={initialPlace} />
    </div>
  );
}
