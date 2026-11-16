import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_FAVORITES,
  placeKey,
  readCity,
  readFavorites,
  readReduceMotion,
  readUnits,
  writeFavorites,
  writeReduceMotion,
} from "./storage";
import type { City } from "@/types/weather";
import { DEFAULT_UNITS } from "@/services/weatherApi";

const store = new Map<string, string>();

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  };
});

beforeEach(() => store.clear());

const city = (over: Partial<City> = {}): City => ({
  id: "1",
  name: "Paris",
  country: "France",
  latitude: 48.85341,
  longitude: 2.3488,
  ...over,
});

describe("place identity", () => {
  it("treats the same coordinates as one place", () => {
    const a = city({ id: "default", latitude: 37.7749, longitude: -122.4194 });
    const b = city({ id: "5391959", latitude: 37.7749, longitude: -122.4194 });
    expect(placeKey(a)).toBe(placeKey(b));
  });
});

describe("reading favourites", () => {
  it("drops invalid records and duplicate places", () => {
    store.set(
      "weather.favorites.v1",
      JSON.stringify([
        city(),
        city(), // duplicate coordinates
        { id: "2", name: "", country: "France", latitude: 1, longitude: 1 }, // empty name
        { id: "3", name: "Nowhere", country: "X", latitude: 999, longitude: 0 }, // out of range
      ]),
    );
    expect(readFavorites()).toHaveLength(1);
  });

  it("survives corrupt JSON", () => {
    store.set("weather.favorites.v1", "{not json");
    expect(readFavorites()).toEqual([]);
  });

  it("round-trips what it writes, capped", () => {
    const many = Array.from({ length: MAX_FAVORITES + 4 }, (_, index) =>
      city({ id: String(index), name: `City ${index}`, latitude: index, longitude: index }),
    );
    writeFavorites(many);
    expect(readFavorites()).toHaveLength(MAX_FAVORITES);
  });
});

describe("reading units", () => {
  it("accepts a valid pair", () => {
    store.set("weather.units.v1", JSON.stringify({ temperature: "fahrenheit", windSpeed: "mph" }));
    expect(readUnits()).toEqual({ temperature: "fahrenheit", windSpeed: "mph" });
  });

  it("rejects an unknown unit and falls back", () => {
    store.set("weather.units.v1", JSON.stringify({ temperature: "kelvin", windSpeed: "mph" }));
    expect(readUnits()).toEqual(DEFAULT_UNITS);
  });
});

describe("reading the reduce-motion override", () => {
  it("round-trips what it writes", () => {
    writeReduceMotion(true);
    expect(readReduceMotion()).toBe(true);
    writeReduceMotion(false);
    expect(readReduceMotion()).toBe(false);
  });

  it("falls back to following the OS on bad data", () => {
    store.set("weather.motion.v1", JSON.stringify("yes"));
    expect(readReduceMotion()).toBe(false);
    store.set("weather.motion.v1", "{not json");
    expect(readReduceMotion()).toBe(false);
  });
});

describe("reading the last city", () => {
  it("returns null for an invalid record", () => {
    store.set("weather.city.v1", JSON.stringify({ id: "x", name: "" }));
    expect(readCity()).toBeNull();
  });

  it("returns a valid record", () => {
    store.set("weather.city.v1", JSON.stringify(city()));
    expect(readCity()?.name).toBe("Paris");
  });
});
