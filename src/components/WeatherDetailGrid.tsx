import { Sun, Wind, Droplets, Eye, Gauge, Sunrise } from "lucide-react";
import type { Units, WeatherDetails } from "@/types/weather";
import {
  clockLabel,
  compassDirection,
  formatDecimal,
  formatVisibility,
  formatWind,
  uvDescriptor,
} from "@/lib/format";

interface DetailCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}

function DetailCard({ label, value, sub, icon: Icon }: DetailCardProps) {
  return (
    <div className="glass p-4 rounded-2xl min-h-[104px] min-w-0 flex flex-col">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-[color:var(--chip-fill)]">
          <Icon size={15} className="text-app-2" aria-hidden="true" />
        </span>
        <span className="text-app-2 text-[11px] font-semibold uppercase tracking-[0.06em]">
          {label}
        </span>
      </div>
      <div className="text-app text-xl font-medium leading-tight tnum break-words">
        {value}
      </div>
      {sub && <div className="text-app-3 text-xs mt-1 tnum">{sub}</div>}
    </div>
  );
}

interface WeatherDetailGridProps {
  details: WeatherDetails;
  units: Units;
}

export default function WeatherDetailGrid({ details, units }: WeatherDetailGridProps) {
  const cards: DetailCardProps[] = [
    {
      label: "UV index",
      value: formatDecimal(details.uvIndex),
      sub: uvDescriptor(details.uvIndex),
      icon: Sun,
    },
    {
      label: "Wind",
      value: formatWind(details.windSpeed, units),
      sub: `From ${compassDirection(details.windDirection)}`,
      icon: Wind,
    },
    {
      label: "Humidity",
      value: `${details.humidity}%`,
      icon: Droplets,
    },
    {
      label: "Visibility",
      value: formatVisibility(details.visibilityMetres, units),
      icon: Eye,
    },
    {
      label: "Pressure",
      value: `${Math.round(details.pressure)} hPa`,
      icon: Gauge,
    },
    {
      label: "Sunrise",
      value: clockLabel(details.sunrise),
      sub: `Sunset ${clockLabel(details.sunset)}`,
      icon: Sunrise,
    },
  ];

  return (
    <section aria-label="Current conditions detail" className="z-20 px-6 pt-4 pb-8">
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map((card) => (
          <DetailCard key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}
