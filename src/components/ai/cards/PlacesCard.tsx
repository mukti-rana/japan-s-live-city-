import { Landmark } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import CardHeader from "@/components/ai/cards/CardHeader";
import PlaceTile from "@/components/ai/cards/PlaceTile";
import type { PlacesCardData } from "@/lib/ai/types";

export default function PlacesCard({ data }: { data: PlacesCardData }) {
  return (
    <GlassCard className="flex w-full max-w-2xl flex-col gap-3 p-4">
      <CardHeader icon={Landmark} label="Popular Places" accent="mint" />
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.places.map((place) => (
          <PlaceTile
            key={place.name}
            name={place.name}
            image={place.image}
            gradient={place.gradient}
            description={place.description}
            href={place.wikipediaUrl}
            subtitle={place.city}
          />
        ))}
      </div>
    </GlassCard>
  );
}
