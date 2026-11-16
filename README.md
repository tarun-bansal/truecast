# Truecast

[![CI](https://github.com/tarun-bansal/truecast/actions/workflows/ci.yml/badge.svg)](https://github.com/tarun-bansal/truecast/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tarun-bansal/truecast?color=3b7fe0)](https://github.com/tarun-bansal/truecast/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A weather app that proves its numbers.** macOS-style, for Linux. Every reading
on screen is checked against the API it came from, and the receipts are in
[`QA.md`](QA.md).

![Truecast demo](docs/demo.gif)

| Night | Day |
|---|---|
| ![Dark theme](docs/screenshots/dark.png) | ![Light theme](docs/screenshots/light.png) |
| ![Search sheet](docs/screenshots/sheet.png) | ![Fahrenheit](docs/screenshots/fahrenheit.png) |

The bugs it shipped with, and how they were found, are written up in
[`docs/STORY.md`](docs/STORY.md).

## Why this one

Most desktop weather apps are a web page in a frame. This one is small, honest,
and measured:

- **No API key, no account, no telemetry.** [Open-Meteo](https://open-meteo.com)
  is called directly from the app.
- **Numbers you can audit.** Hero, high/low, feels-like, humidity, wind, UV,
  visibility, pressure, sunrise/sunset, 24 hourly cards and 10 daily rows are
  compared against the API response — 131–132 of them, all matching.
- **City-local time everywhere.** Dates and hours come from the city's own
  sunrise/sunset, never the host clock.
- **Measured accessibility.** Contrast sampled from rendered pixels (worst
  sampled layer 6.19:1), real dialog semantics, focus trap, 24 px targets,
  `prefers-reduced-motion`, forced-colors selection.
- **One request per load.** In-flight de-duplication plus a 60 s cache.

## Features

- Current conditions, 24-hour strip, 10-day list, detail grid
- Dynamic gradient and day/night icons from the selected city's condition and sun
- °C/°F with km/h ↔ mph (re-requested from the API, never converted locally)
- City search with keyboard support; saved favourites reorder by arrow key or drag
- Last city, units and favourites persist across launches
- `Ctrl+R` refreshes, `Ctrl+F` searches, arrows move through results
- Frameless window with real traffic lights, Restore state and double-click zoom

## Install

[**Download the latest `.deb`**](https://github.com/tarun-bansal/truecast/releases/latest) and install it:

```bash
sudo apt install ./truecast_0.1.2_amd64.deb
```

Tested on Ubuntu 26.04 LTS with GNOME on X11. Wayland and HiDPI are untested.

## Run from source

```bash
npm install
npm run electron:dev     # Vite dev server + Electron
npm run build            # type-check and bundle the renderer
npm run dist             # package the .deb into release/

npm test                 # unit tests (dates, units, day/night, storage)
npm run typecheck
npm run lint
node e2e/smoke.mjs       # end-to-end against the packaged binary (needs a display)
```

Requires Node 20+ and a Linux desktop with X11. No sandbox setup is needed — the
main process starts with `--no-sandbox` so the packaged binary runs on systems
where `chrome-sandbox` is not setuid-root.

## How it is put together

```
src/
  state/WeatherProvider.tsx   one source of truth: data, city, status, units, favourites
  services/weatherApi.ts      Open-Meteo requests, unit params, cache, de-duplication
  lib/format.ts               calendar-safe dates (never `new Date(string)`)
  lib/theme.ts                per-condition gradients + the dark/light decision
  lib/storage.ts              persisted city, units, favourites (validated reads)
  components/                 header, hourly strip, 10-day list, details, sheet, title bar
electron/
  main.ts                     window, IPC for the window controls
  preload.ts                  the small bridge exposed to the renderer
tools/capture.mjs             regenerates the screenshots and the demo GIF
```

The renderer never talks to the network directly except through
`services/weatherApi.ts`, and every component reads from the single provider.
That is what keeps one city's name from appearing above another city's forecast —
the bug that started this project's QA record.

## Weather data

Data by [Open-Meteo](https://open-meteo.com), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Their free API is for
non-commercial use; if you fork this and ship it commercially, you need your own
Open-Meteo plan. Truecast asks for the units it displays and shows the API's own
values — including its quirk of labelling miles per hour `mp/h`, normalised here
to `mph`.

Inter is bundled under the SIL Open Font License
([licence](src/assets/fonts/Inter-LICENSE.txt)); icons are
[Lucide](https://lucide.dev) (ISC).

## Limitations, stated

- Linux only, x64. The package is a `.deb`.
- No geolocation, settings window, notifications or tray icon yet.
- English only.
- The hero numeral scales with your font size but the layout is tuned for
  1000 × 700.

## Quality

The app passed an independent ship gate at **7.1 / 10**, with **0 P0 and 0 P1**.
Three runs, their measurements, and the things that were *not* fixed are in
[`QA.md`](QA.md); the full reports are in [`design-review/`](design-review/).

That is backed by 30 unit tests, an end-to-end smoke test against the packaged
binary (launch, API agreement, units, shortcuts), and a **truth check that fails
the build when the UI and the API disagree** — all on every push.
Packaging notes for AUR and Flathub are in [`packaging/`](packaging/).

## Licence

MIT — see [LICENSE](LICENSE). Not affiliated with Apple; "macOS-style" describes
the visual language, not the vendor.
