import type { City } from "@/types/weather";
import { DEFAULT_UNITS, type UnitPreferences } from "@/services/weatherApi";

const FAVORITES_KEY = "weather.favorites.v1";
const UNITS_KEY = "weather.units.v1";
const CITY_KEY = "weather.city.v1";
const MOTION_KEY = "weather.motion.v1";

/** Keep the list short enough to be a quick-access row, not a second address book. */
const MAX_FAVORITES = 12;

/**
 * Identity is the place, not the geocoding record. The built-in default city and
 * the same city found through search have different ids but the same
 * coordinates, and the user must not see two "San Francisco" favourites.
 */
export function placeKey(city: Pick<City, "latitude" | "longitude">): string {
  return `${city.latitude.toFixed(3)},${city.longitude.toFixed(3)}`;
}

function isCity(value: unknown): value is City {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    c.name.length > 0 &&
    typeof c.country === "string" &&
    typeof c.latitude === "number" &&
    Number.isFinite(c.latitude) &&
    Math.abs(c.latitude) <= 90 &&
    typeof c.longitude === "number" &&
    Number.isFinite(c.longitude) &&
    Math.abs(c.longitude) <= 180
  );
}

function read<T>(key: string, validate: (value: unknown) => T | null, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return validate(JSON.parse(raw)) ?? fallback;
  } catch {
    // Storage blocked (private mode, file:// restrictions) — degrade to memory.
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do: the session's in-memory copy is still correct.
  }
}

/** The city the user was last looking at, so a launch does not reset it. */
export function readCity(): City | null {
  return read<City | null>(CITY_KEY, (value) => (isCity(value) ? value : null), null);
}

export function writeCity(city: City): void {
  write(CITY_KEY, city);
}

export function readFavorites(): City[] {
  return read<City[]>(
    FAVORITES_KEY,
    (value) => {
      if (!Array.isArray(value)) return null;
      const valid = value.filter(isCity).slice(0, MAX_FAVORITES);
      const seen = new Set<string>();
      const unique: City[] = [];
      for (const city of valid) {
        const key = placeKey(city);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(city);
      }
      return unique;
    },
    [],
  );
}

export function writeFavorites(favorites: City[]): void {
  write(FAVORITES_KEY, favorites);
}

export function readUnits(): UnitPreferences {
  return read<UnitPreferences>(
    UNITS_KEY,
    (value) => {
      if (typeof value !== "object" || value === null) return null;
      const u = value as Record<string, unknown>;
      if (u.temperature !== "celsius" && u.temperature !== "fahrenheit") return null;
      if (u.windSpeed !== "kmh" && u.windSpeed !== "mph") return null;
      return { temperature: u.temperature, windSpeed: u.windSpeed };
    },
    DEFAULT_UNITS,
  );
}

export function writeUnits(units: UnitPreferences): void {
  write(UNITS_KEY, units);
}

/**
 * True when the user asked animations off regardless of the OS setting.
 * Anything that is not a boolean is not a preference — fall back to following
 * the OS.
 */
export function readReduceMotion(): boolean {
  return read<boolean>(
    MOTION_KEY,
    (value) => (typeof value === "boolean" ? value : null),
    false,
  );
}

export function writeReduceMotion(value: boolean): void {
  write(MOTION_KEY, value);
}

export { MAX_FAVORITES };
