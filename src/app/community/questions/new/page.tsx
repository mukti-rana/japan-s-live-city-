import type { Metadata } from "next";
import AskQuestionForm from "@/components/community/AskQuestionForm";
import Tx from "@/components/i18n/Tx";
import { isAreaId } from "@/lib/community/areas";
import { getDestination } from "@/lib/explore/catalogue";

export const metadata: Metadata = {
  title: "Ask a question — Community",
  description: "Ask the community about a place in Japan.",
  robots: { index: false, follow: false },
};

// ?place=Q123 asks about that place; ?area=nara asks a local about that area.
export default async function AskPage({ searchParams }: PageProps<"/community/questions/new">) {
  const sp = await searchParams;
  const placeRaw = Array.isArray(sp.place) ? sp.place[0] : sp.place;
  const areaRaw = Array.isArray(sp.area) ? sp.area[0] : sp.area;
  const place = placeRaw && /^Q[0-9]{1,12}$/.test(placeRaw) ? getDestination(placeRaw) : null;
  const initialPlace = place ? { label: place.names.en ?? place.names.ja ?? "", ref: place.id, areaId: place.prefectureId } : undefined;
  const initialArea = !place && areaRaw && isAreaId(areaRaw) ? areaRaw : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <Tx en={place ? "Questions & Answers" : "Ask a Local"} />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Ask a question" />
        </h1>
        <p className="mt-2 text-sm text-foreground/85">
          <Tx en="People who have been there will answer." />
        </p>
      </header>
      <AskQuestionForm initialPlace={initialPlace} initialArea={initialArea} />
    </div>
  );
}
