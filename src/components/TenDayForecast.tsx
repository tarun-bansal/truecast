import type { DailyForecast } from "@/types/weather";
import ConditionIcon from "./ConditionIcon";
import { formatTemp } from "@/lib/format";

interface TenDayForecastProps {
  daily: DailyForecast[];
}

export default function TenDayForecast({ daily }: TenDayForecastProps) {
  const visible = daily.slice(0, 10);
  if (visible.length === 0) return null;

  // The range bar is only meaningful against the week's own extremes, so those
  // are derived from the same rows that are on screen.
  const weekMin = Math.min(...visible.map((day) => day.minTemperature));
  const weekMax = Math.max(...visible.map((day) => day.maxTemperature));
  const span = Math.max(1, weekMax - weekMin);

  return (
    <section aria-labelledby="daily-heading" className="z-20 px-6 pt-4 mb-2">
      <h2
        id="daily-heading"
        className="text-app text-sm font-semibold tracking-[0.06em] uppercase mb-4 px-4"
      >
        {visible.length}-day forecast
      </h2>
      <div className="grid grid-cols-[max-content_1.5rem_max-content_minmax(1rem,1fr)_max-content_max-content] items-center gap-x-3 gap-y-1">
        {visible.map((day) => {
          const left = ((day.minTemperature - weekMin) / span) * 100;
          const width = Math.max(
            6,
            ((day.maxTemperature - day.minTemperature) / span) * 100,
          );
          return (
            <div
              key={day.date}
              data-day-row
              className="glass col-span-full grid grid-cols-subgrid items-center px-4 py-2.5 rounded-xl"
            >
              <span className="text-app text-sm font-medium">
                {day.isToday ? "Today" : day.dayName}
              </span>
              <span className="flex justify-center">
                <ConditionIcon condition={day.condition} size={18} />
              </span>
              <span
                className="text-right text-app-2 text-sm tnum"
                aria-label={`Low ${Math.round(day.minTemperature)} degrees`}
              >
                {formatTemp(day.minTemperature)}
              </span>
              <span
                className="h-1.5 min-w-4 rounded-full bg-[color:var(--hairline)] relative overflow-hidden"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-300 to-amber-300"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </span>
              <span
                className="text-right text-app text-sm font-medium tnum"
                aria-label={`High ${Math.round(day.maxTemperature)} degrees`}
              >
                {formatTemp(day.maxTemperature)}
              </span>
              <span className="text-right text-app-3 text-xs tnum">
                {day.precipitationProbability > 0 ? `${day.precipitationProbability}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
