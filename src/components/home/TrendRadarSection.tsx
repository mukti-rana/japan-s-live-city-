import TrendRadar from "@/components/home/TrendRadar";
import { getTrendRadar } from "@/lib/services/trendRadar";

// Fetches the radar on the server so the Home page arrives with it; the
// client then keeps it fresh in the background. If it can't be fetched the
// section says so honestly and retries by itself.
export default async function TrendRadarSection() {
  const initial = await getTrendRadar().catch(() => null);
  return <TrendRadar initial={initial} />;
}
