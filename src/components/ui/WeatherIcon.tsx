import {
  Sun,
  CloudSun,
  CloudMoon,
  Moon,
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

// After dark a clear sky is a moon and a part-cloudy one a cloud across the moon; every other condition looks the same by night.
const NIGHT_ICONS = { clear: Moon, partly: CloudMoon };

export default function WeatherIcon({
  icon,
  night = false,
  ...props
}: { icon: WeatherIconKind; night?: boolean } & LucideProps) {
  const Icon = night && (icon === "clear" || icon === "partly") ? NIGHT_ICONS[icon] : ICONS[icon];
  return <Icon {...props} />;
}
