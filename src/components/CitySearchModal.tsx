import { useEffect, useRef, useState } from "react";
import { GripVertical, Search, X, ArrowRight } from "lucide-react";
import type { City } from "@/types/weather";

interface CitySearchModalProps {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  results: City[];
  isSearching: boolean;
  searchError: string | null;
  onSelect: (city: City) => void;
  /** Saved places, shown when the field is empty so they are one click away. */
  favorites: City[];
  onRemoveFavorite: (city: City) => void;
  onMoveFavorite: (from: number, to: number) => void;
  onClearFavorites: () => void;
}

export function CitySearchModal({
  open,
  onClose,
  query,
  setQuery,
  results,
  isSearching,
  searchError,
  onSelect,
  favorites,
  onRemoveFavorite,
  onMoveFavorite,
  onClearFavorites,
}: CitySearchModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  /** One ref per favourites row, so removing one can hand focus to the next. */
  const removeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  /** Index of the keyboard-highlighted result, -1 when there is none. */
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`city-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

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
      // Return focus to the trigger. Programmatic/assistive opens often leave
      // activeElement on <body>, so fall back to the city button explicitly.
      // But when the sheet closed because the *other* dialog opened in the
      // same update, that dialog owns focus now — don't steal it back.
      if (document.querySelector('[role="dialog"]')) return;
      const trigger = document.querySelector<HTMLElement>('[aria-haspopup="dialog"]');
      const previous = previousFocus.current;
      const target =
        previous && previous !== document.body && previous.isConnected ? previous : trigger;
      target?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

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
        aria-labelledby="search-title"
        className="relative w-full max-w-md mx-4 h-[min(40rem,calc(100vh-1.5rem))] bg-[color:var(--sheet-bg)] backdrop-blur rounded-3xl border border-[color:var(--sheet-border)] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[color:var(--sheet-hairline)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[color:var(--sheet-accent-bg)] flex items-center justify-center text-[color:var(--sheet-accent)]">
              <Search size={18} aria-hidden="true" />
            </div>
            <h2 id="search-title" className="text-[color:var(--sheet-text)] text-lg font-semibold">
              Search city
            </h2>
          </div>
        </div>

        <div className="p-4 flex flex-1 min-h-0 flex-col">
          <div className="relative mb-4">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--sheet-faint)]">
              <Search size={16} aria-hidden="true" />
            </div>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="city-results"
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 && results[activeIndex]
                  ? `city-option-${activeIndex}`
                  : undefined
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && results.length > 0) {
                  event.preventDefault();
                  setActiveIndex((index) => (index + 1) % results.length);
                } else if (event.key === "ArrowUp" && results.length > 0) {
                  event.preventDefault();
                  setActiveIndex((index) => (index - 1 + results.length) % results.length);
                } else if (event.key === "Enter" && results.length > 0) {
                  event.preventDefault();
                  onSelect(results[activeIndex] ?? results[0]);
                }
              }}
              placeholder="Enter city name"
              aria-label="Enter city name"
              className="app-region-no-drag w-full pl-10 pr-12 py-3 rounded-2xl border border-[color:var(--sheet-field-border)] bg-[color:var(--sheet-field)] focus:border-[color:var(--sheet-accent)] transition text-[color:var(--sheet-text)] placeholder:text-[color:var(--sheet-faint)] text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                title="Clear search"
                className="app-region-no-drag absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[color:var(--sheet-muted)] hover:text-[color:var(--sheet-text)] hover:bg-[color:var(--sheet-hover)] transition"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <div aria-live="polite" className="min-h-[1rem]">
            {isSearching && <p className="text-center py-2 text-[color:var(--sheet-muted)] text-sm">Searching…</p>}
            {!isSearching && searchError && (
              <p className="text-center py-2 text-[color:var(--sheet-muted)] text-sm">
                <span className="block font-medium text-[color:var(--sheet-text)]">Couldn't search for cities</span>
                {searchError}
              </p>
            )}
            {!isSearching && !searchError && query.trim().length === 1 && (
              <p className="text-center py-2 text-[color:var(--sheet-muted)] text-sm">Keep typing to search…</p>
            )}
            {!isSearching && !searchError && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-center py-2 text-[color:var(--sheet-muted)] text-sm">
                No cities found for “{query.trim()}”
              </p>
            )}
            {!isSearching && !searchError && results.length > 0 && (
              <p className="pb-1 text-xs text-[color:var(--sheet-muted)] tnum">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
            )}
            {!query.trim() && favorites.length > 0 && (
              <p className="sr-only">
                {favorites.length} favorite {favorites.length === 1 ? "city" : "cities"}
              </p>
            )}
          </div>

          <div className="mt-1 min-h-0 max-h-96 flex-1 overflow-y-auto pr-1 snap-y snap-proximity">
            {!query.trim() && favorites.length === 0 && (
              <p className="px-4 py-3 text-sm text-[color:var(--sheet-muted)]">
                Search for a city, open it, then use the star beside its name to keep it
                here for one-click access, even after you restart the app.
              </p>
            )}

            {!query.trim() && favorites.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 pb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--sheet-muted)]">
                    Favorites
                  </p>
                  {confirmClear ? (
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClearFavorites();
                          setConfirmClear(false);
                          requestAnimationFrame(() => inputRef.current?.focus());
                        }}
                        className="text-[11px] font-semibold text-[color:var(--danger)] hover:underline"
                      >
                        Clear {favorites.length}
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="text-[11px] text-[color:var(--sheet-muted)] hover:underline"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="text-[11px] text-[color:var(--sheet-muted)] hover:text-[color:var(--sheet-text)] hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {favorites.map((city, index) => (
                  <div
                    key={`${city.latitude.toFixed(3)},${city.longitude.toFixed(3)}`}
                    className="flex items-center gap-1"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", String(index));
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = Number(event.dataTransfer.getData("text/plain"));
                      if (Number.isInteger(from)) onMoveFavorite(from, index);
                    }}
                  >
                    <button
                      aria-label={`Reorder ${city.name}. Use the arrow up and arrow down keys.`}
                      title="Drag to reorder"
                      onKeyDown={(event) => {
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          onMoveFavorite(index, index - 1);
                        }
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          onMoveFavorite(index, index + 1);
                        }
                      }}
                      className="app-region-no-drag w-6 h-9 shrink-0 flex items-center justify-center text-[color:var(--sheet-faint)] cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => onSelect(city)}
                      className="app-region-no-drag flex-1 flex items-center justify-between gap-3 px-4 py-3 text-left rounded-xl hover:bg-[color:var(--sheet-hover)] transition text-[color:var(--sheet-text)] snap-start"
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{city.name}</span>
                        <span className="text-xs text-[color:var(--sheet-muted)] truncate">
                          {city.admin1 ? city.admin1 + ", " : ""}
                          {city.country}
                        </span>
                      </span>
                      <ArrowRight size={14} className="text-[color:var(--sheet-faint)] shrink-0" aria-hidden="true" />
                    </button>
                    <button
                      ref={(node) => {
                        removeRefs.current[index] = node;
                      }}
                      onClick={() => {
                        onRemoveFavorite(city);
                        // Keep the keyboard user in the list rather than dropping
                        // focus to <body> when their row disappears.
                        requestAnimationFrame(() => {
                          const next =
                            removeRefs.current[index] ??
                            removeRefs.current[index - 1] ??
                            removeRefs.current[0];
                          // Last row removed: the list is gone, so land on the
                          // field the user came to use, not on <body>.
                          (next ?? inputRef.current)?.focus();
                        });
                      }}
                      aria-label={`Remove ${city.name} from favorites`}
                      title="Remove from favorites"
                      className="app-region-no-drag w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[color:var(--sheet-muted)] hover:text-[color:var(--sheet-text)] hover:bg-[color:var(--sheet-hover)] transition"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </>
            )}

            {query.trim() && (
              <div role="listbox" id="city-results" aria-label="Search results">
                {results.map((city, index) => (
                  <div
                    key={city.id}
                    id={`city-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => onSelect(city)}
                    className={`app-region-no-drag w-full flex items-center justify-between gap-3 px-4 py-3 text-left rounded-xl transition text-[color:var(--sheet-text)] cursor-pointer snap-start ${
                      index === activeIndex ? "bg-[color:var(--sheet-hover)]" : ""
                    }`}
                  >
                    <span className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{city.name}</span>
                      <span className="text-xs text-[color:var(--sheet-muted)] truncate">
                        {city.admin1 ? city.admin1 + ", " : ""}
                        {city.country}
                      </span>
                    </span>
                    <ArrowRight size={14} className="text-[color:var(--sheet-faint)] shrink-0" aria-hidden="true" />
                  </div>
                ))}
              </div>
            )}
          </div>
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
