import { useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
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

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  units: UnitPreferences;
  /** Re-fetches the current city in the requested units; never converts locally. */
  changeUnits: (units: UnitPreferences) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
}

/**
 * The preferences sheet, modeled on CitySearchModal: same overlay and panel,
 * same --sheet-* tokens, same focus trap, Escape to close, and focus back to
 * the trigger on close — never dropped to <body>.
 */
export function SettingsSheet({
  open,
  onClose,
  units,
  changeUnits,
  reduceMotion,
  setReduceMotion,
}: SettingsSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    firstControlRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Return focus to the trigger. Programmatic/assistive opens (Ctrl+,
      // the app menu) often leave activeElement on <body>, so fall back to
      // the settings gear explicitly — never to <body>. But when the sheet
      // closed because the *other* dialog opened in the same update, that
      // dialog owns focus now — don't steal it back to the gear.
      if (document.querySelector('[role="dialog"]')) return;
      const trigger = document.querySelector<HTMLElement>("[data-settings-trigger]");
      const previous = previousFocus.current;
      const target =
        previous && previous !== document.body && previous.isConnected ? previous : trigger;
      target?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const activeUnits = UNIT_OPTIONS.find(
    (option) =>
      units.temperature === option.value.temperature && units.windSpeed === option.value.windSpeed,
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="app-region-no-drag absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-full max-w-md mx-4 bg-[color:var(--sheet-bg)] backdrop-blur rounded-3xl border border-[color:var(--sheet-border)] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[color:var(--sheet-hairline)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[color:var(--sheet-accent-bg)] flex items-center justify-center text-[color:var(--sheet-accent)]">
              <Settings size={18} aria-hidden="true" />
            </div>
            <h2 id="settings-title" className="text-[color:var(--sheet-text)] text-lg font-semibold">
              Settings
            </h2>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          <section aria-labelledby="settings-units-label">
            <p
              id="settings-units-label"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--sheet-muted)]"
            >
              Units
            </p>
            <div
              className="mt-2 flex w-fit items-center gap-0.5 rounded-full p-0.5 border border-[color:var(--sheet-field-border)] bg-[color:var(--sheet-field)]"
              role="group"
              aria-label="Temperature and wind units"
            >
              {UNIT_OPTIONS.map((option, index) => {
                const active =
                  units.temperature === option.value.temperature &&
                  units.windSpeed === option.value.windSpeed;
                return (
                  <button
                    key={option.short}
                    ref={index === 0 ? firstControlRef : undefined}
                    onClick={() => changeUnits(option.value)}
                    aria-pressed={active}
                    aria-label={option.label}
                    title={option.label}
                    className={`min-w-8 h-6 px-1.5 rounded-full text-xs font-semibold tnum transition ${
                      active
                        ? "bg-[color:var(--sheet-accent-bg)] text-[color:var(--sheet-text)]"
                        : "text-[color:var(--sheet-muted)] hover:text-[color:var(--sheet-text)]"
                    }`}
                  >
                    {option.short}
                  </button>
                );
              })}
            </div>
            {activeUnits && (
              <p className="mt-2 text-xs text-[color:var(--sheet-muted)]">
                {activeUnits.label}
              </p>
            )}
          </section>

          <section aria-labelledby="settings-motion-label">
            <p
              id="settings-motion-label"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--sheet-muted)]"
            >
              Motion
            </p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--sheet-text)]">Reduce motion</p>
                <p className="mt-0.5 text-xs text-[color:var(--sheet-muted)]">
                  Turns animations off, even if your system allows them.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                aria-label="Reduce motion"
                onClick={() => setReduceMotion(!reduceMotion)}
                className="app-region-no-drag relative h-6 w-11 shrink-0 rounded-full transition"
                style={{
                  backgroundColor: reduceMotion
                    ? "var(--sheet-switch-on)"
                    : "var(--sheet-switch-off)",
                }}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    reduceMotion ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </section>

          <section aria-labelledby="settings-about-label">
            <p
              id="settings-about-label"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--sheet-muted)]"
            >
              About
            </p>
            <p className="mt-2 text-sm font-medium text-[color:var(--sheet-text)]">
              Truecast <span className="font-normal text-[color:var(--sheet-muted)]">Version {APP_VERSION}</span>
            </p>
            <p className="mt-1 text-xs text-[color:var(--sheet-muted)]">
              Weather data by Open-Meteo (CC BY 4.0). Not affiliated with Apple.
            </p>
          </section>
        </div>

        <div className="px-6 py-3 border-t border-[color:var(--sheet-hairline)] bg-[color:var(--sheet-footer)]">
          <button
            onClick={onClose}
            className="app-region-no-drag w-full py-2.5 rounded-xl text-[color:var(--sheet-muted)] font-medium hover:bg-[color:var(--sheet-hover)] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
