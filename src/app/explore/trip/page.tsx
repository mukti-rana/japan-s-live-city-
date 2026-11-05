import type { Metadata } from "next";
import TripBuilder from "@/components/explore/TripBuilder";

export const metadata: Metadata = {
  title: "My trip — Explore Japan",
  description: "Pick places from Explore Japan and arrange them into a realistic one-day plan.",
  robots: { index: false, follow: true },
};

export default function TripPage() {
  return <TripBuilder />;
}
