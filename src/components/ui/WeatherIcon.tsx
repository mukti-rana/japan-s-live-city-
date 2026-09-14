import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  type LucideProps,
} from "lucide-react";
import type { WeatherIconKind } from "@/lib/services/weather";

const ICONS = {
  clear: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export default function WeatherIcon({
  icon,
  ...props
}: { icon: WeatherIconKind } & LucideProps) {
  const Icon = ICONS[icon];
  return <Icon {...props} />;
}
