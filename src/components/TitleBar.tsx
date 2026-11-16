import { useEffect, useState } from "react";
import { Bookmark, Minimize2, Minus, RotateCw, Settings, Square, X } from "lucide-react";
import { useWeather } from "@/state/WeatherProvider";
import type { UnitPreferences } from "@/services/weatherApi";

const UNIT_OPTIONS: Array<{ short: string; label: string; value: UnitPreferences }> = [
  {
    short: "°C",
    label: "Celsius, wind in kilometres per hour",
    value: { temperature: "celsius", windSpeed: "kmh" },
  },
  {
    short: "°F",
    label: "Fahrenheit, wind in miles per hour",
    value: { temperature: "fahrenheit", windSpeed: "mph" },
  },
];

/**
 * Frameless window chrome: the traffic lights are the real window controls,
 * with 24 px hit targets around 14 px dots. The arc of the title bar also holds
 * the two things that apply to the whole window: saved cities and units.
 */
export default function TitleBar() {
  const api = (window as any).electronAPI ?? {};
  const { minimize, maximize, close, isMaximized, onMaximizedChange, toggleMaximize } = api;
  const { units, changeUnits, favorites, openSearch, isSearchOpen, refresh, isStale, openSettings, isSettingsOpen } = useWeather();

  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    let alive = true;
    isMaximized?.().then((value: boolean) => {
      if (alive) setMaximized(value);
    }).catch(() => {});
    const off = onMaximizedChange?.((value: boolean) => setMaximized(value));
    return () => {
      alive = false;
      off?.();
    };
  }, [isMaximized, onMaximizedChange]);

  const controls = [
    {
      short: "Close",
      onClick: close,
      dot: "bg-[#ff5f57] border-[#e0443e]",
      icon: X,
    },
    {
      short: "Minimize",
      onClick: minimize,
      dot: "bg-[#febc2e] border-[#d89e24]",
      icon: Minus,
    },
    {
      short: maximized ? "Restore" : "Maximize",
      onClick: toggleMaximize ?? maximize,
      dot: "bg-[#28c840] border-[#1f9f33]",
      icon: maximized ? Minimize2 : Square,
    },
  ];

  return (
    <header
      className="app-region-drag relative z-50 h-10 px-4 flex items-center justify-between"
      onDoubleClick={(event) => {
        // On macOS a double-click on the title bar zooms the window. The drag
        // region swallows the gesture otherwise.
        if ((event.target as HTMLElement).closest("button")) return;
        toggleMaximize?.();
      }}
    >
      <div className="app-region-no-drag flex items-center gap-1">
        {controls.map(({ short, onClick, dot, icon: Icon }) => (
          <button
            key={short}
            onClick={onClick}
            aria-label={`${short} window`}
            title={short}
            className="group w-6 h-6 rounded-full flex items-center justify-center"
          >
            <span
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition ${dot}`}
            >
              <Icon
                size={8}
                strokeWidth={3}
                className="text-black/55 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
              />
            </span>
          </button>
        ))}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-app-2 text-xs font-medium tracking-wide pointer-events-none">
        Truecast
      </div>

      <div className="app-region-no-drag flex items-center gap-2">
        <button
          onClick={refresh}
          aria-label="Refresh weather"
          title="Refresh"
          className="chip flex h-7 w-7 items-center justify-center rounded-full text-app-2 transition hover:text-app"
        >
          <RotateCw size={13} className={isStale ? "animate-spin" : ""} aria-hidden="true" />
        </button>

        {/* A named way into the saved cities. The city pill opens the same sheet,
            but nothing on the pill says favourites exist. */}
        <button
          onClick={openSearch}
          aria-haspopup="dialog"
          aria-expanded={isSearchOpen}
          aria-label={
            favorites.length
              ? `Favorites, ${favorites.length} ${favorites.length === 1 ? "city" : "cities"}`
              : "Favorites, none saved"
          }
          title="Favorites"
          className="chip flex h-7 items-center gap-1 rounded-full px-2 text-app-2 transition hover:text-app"
        >
          <Bookmark size={13} aria-hidden="true" />
          <span className="text-[11px] font-semibold tnum">{favorites.length}</span>
        </button>

        <div
          className="unit-track flex items-center gap-0.5 rounded-full p-0.5"
          role="group"
          aria-label="Temperature and wind units"
        >
          {UNIT_OPTIONS.map((option) => {
            const active =
              units.temperature === option.value.temperature &&
              units.windSpeed === option.value.windSpeed;
            return (
              <button
                key={option.short}
                onClick={() => changeUnits(option.value)}
                aria-pressed={active}
                aria-label={option.label}
                title={option.label}
                className={`min-w-8 h-6 px-1.5 rounded-full text-xs font-semibold tnum transition ${
                  active
                    ? "bg-[color:var(--unit-active)] text-app"
                    : "text-app-3 hover:text-app"
                }`}
              >
                {option.short}
              </button>
            );
          })}
        </div>

        {/* The visible way into Settings. The app menu has the same item, but
            the menu bar is hidden by design, so this gear is the entry point
            most people will actually see. */}
        <button
          onClick={openSettings}
          data-settings-trigger
          aria-haspopup="dialog"
          aria-expanded={isSettingsOpen}
          aria-label="Open settings"
          title="Settings (Ctrl+,)"
          className="chip flex h-7 w-7 items-center justify-center rounded-full text-app-2 transition hover:text-app"
        >
          <Settings size={13} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
