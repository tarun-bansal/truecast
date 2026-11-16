import { useEffect } from "react";
import WeatherBackground from "@/components/WeatherBackground";
import TitleBar from "@/components/TitleBar";
import CurrentWeatherHeader from "@/components/CurrentWeatherHeader";
import HourlyForecastStrip from "@/components/HourlyForecastStrip";
import TenDayForecast from "@/components/TenDayForecast";
import WeatherDetailGrid from "@/components/WeatherDetailGrid";
import { SettingsSheet } from "@/components/SettingsSheet";
import { useWeather } from "@/state/WeatherProvider";

export default function App() {
  const {
    data,
    city,
    status,
    error,
    isStale,
    failedCity,
    retry,
    dismissError,
    refresh,
    openSearch,
    units,
    changeUnits,
    isSettingsOpen,
    openSettings,
    closeSettings,
    reduceMotion,
    setReduceMotion,
  } = useWeather();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        refresh();
      }
      if (key === "f") {
        event.preventDefault();
        openSearch();
      }
      if (key === ",") {
        event.preventDefault();
        openSettings();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [refresh, openSearch, openSettings]);

  // The app menu's Settings item (the menu bar itself is hidden by design).
  useEffect(() => {
    const api = (window as any).electronAPI ?? {};
    const off = api.onOpenSettings?.(() => openSettings());
    return () => {
      off?.();
    };
  }, [openSettings]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden font-sans selection:bg-blue-500/30">
      <WeatherBackground />
      <TitleBar />
      <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden">
        <main className="pt-16 px-6 pb-20">
          {status === "loading" && <LoadingState />}

          {status === "error" && (
            <ErrorState message={error ?? "Unable to load weather."} onRetry={retry} />
          )}

          {data && (
            <>
              <h1 className="sr-only">{city.name} weather</h1>
              <CurrentWeatherHeader />
              {error && (
                <StaleNotice
                  cityName={failedCity?.name}
                  message={error}
                  onRetry={retry}
                  onDismiss={dismissError}
                />
              )}
              <div
                aria-busy={isStale}
                className={`transition-opacity duration-300 ${isStale ? "opacity-55" : "opacity-100"}`}
              >
                <div key={data.city.id} className="city-enter">
                <HourlyForecastStrip hourly={data.hourly} />
                {/* Side by side only when the right column is wide enough for
                    two readable cards. At 800-899 px a 5/12 column squeezed them
                    to 118 px and the labels wrapped, so it collapses to one
                    column and the details follow the forecast. */}
                <div className="grid grid-cols-1 min-[900px]:grid-cols-12 gap-6">
                  <div className="min-[900px]:col-span-7 min-w-0">
                    <TenDayForecast daily={data.daily} />
                  </div>
                  <div className="min-[900px]:col-span-5 min-w-0">
                    <WeatherDetailGrid details={data.details} units={data.units} />
                  </div>
                </div>
                <p className="px-6 pb-6 text-app-2 text-xs">
                  Weather data by Open-Meteo (CC BY 4.0). Not affiliated with Apple.
                </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      <SettingsSheet
        open={isSettingsOpen}
        onClose={closeSettings}
        units={units}
        changeUnits={changeUnits}
        reduceMotion={reduceMotion}
        setReduceMotion={setReduceMotion}
      />
    </div>
  );
}

function LoadingState() {
  const block = "rounded-2xl animate-pulse";
  const fill = { backgroundColor: "var(--skeleton)" };
  return (
    <div className="pt-4 px-6" aria-busy="true" aria-label="Loading weather">
      <span className="sr-only">Loading weather…</span>
      <div className={`${block} h-9 w-44 rounded-full`} style={fill} />
      <div className="mt-8 flex items-end gap-4">
        <div className={`${block} h-24 w-64`} style={fill} />
        <div className={`${block} h-6 w-32 mb-3`} style={fill} />
      </div>
      <div className={`${block} mt-3 h-4 w-40`} style={fill} />
      <div className={`${block} mt-10 h-5 w-72`} style={fill} />

      <div className={`${block} mt-8 h-4 w-40`} style={fill} />
      <div className="mt-4 flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className={`${block} h-40 w-16 shrink-0`} style={fill} />
        ))}
      </div>

      <div className={`${block} mt-8 h-4 w-44`} style={fill} />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`${block} h-11 w-full`} style={fill} />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-app text-xl font-semibold mb-2">Weather is unavailable</h1>
      <p className="text-app-2 text-sm max-w-sm mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="chip text-app rounded-full px-5 py-2 text-sm font-medium transition"
      >
        Try again
      </button>
    </div>
  );
}

function StaleNotice({
  cityName,
  message,
  onRetry,
  onDismiss,
}: {
  cityName?: string;
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="px-6 mt-6" role="status" aria-live="polite">
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className="text-app text-sm font-medium">
          {cityName ? `Couldn't update ${cityName}.` : "Couldn't update."}
        </span>
        <span className="text-app-2 text-sm flex-1 min-w-[12rem]">
          Showing the last reading{message ? ` — ${message}` : "."}
        </span>
        <button
          onClick={onRetry}
          className="chip text-app rounded-full px-3 py-1 text-sm font-medium transition"
        >
          Retry
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss update notice"
          className="text-app-3 hover:text-app text-sm px-2 transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
