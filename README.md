# Truecast

[![CI](https://github.com/tarun-bansal/truecast/actions/workflows/ci.yml/badge.svg)](https://github.com/tarun-bansal/truecast/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tarun-bansal/truecast?color=3b7fe0)](https://github.com/tarun-bansal/truecast/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Weather, with receipts.** A macOS-style weather app for Linux. CI opens the
packaged app, reads ~125 values off the screen, re-fetches the Open-Meteo
response it used, and fails the build when they disagree. The review record —
including a finding the gate got wrong — is in [`QA.md`](QA.md).

![Truecast demo](docs/demo.gif)

| Night | Day |
|---|---|
| ![Dark theme](docs/screenshots/dark.png) | ![Light theme](docs/screenshots/light.png) |
| ![Search sheet](docs/screenshots/sheet.png) | ![Fahrenheit](docs/screenshots/fahrenheit.png) |

The bugs it shipped with, and how they were found, are written up in
[`docs/STORY.md`](docs/STORY.md).

## Why this one

Built on Electron, so it is large (~100 MB download). What it does differently is
check its numbers and avoid API keys:

- **No API key, no account, no telemetry.** [Open-Meteo](https://open-meteo.com)
  is called directly from the app.
- **Numbers you can audit.** Hero, high/low, feels-like, humidity, wind, UV,
  visibility, pressure, sunrise/sunset, 24 hourly cards and 10 daily rows are
  compared against the API response — over 120 of them, all matching in the
  committed run.
- **City-local time everywhere.** Dates and hours come from the city's own
  sunrise/sunset, never the host clock.
- **Measured accessibility.** Contrast sampled from rendered pixels (worst
  sampled 5.56:1 light / 6.19:1 dark; an exhaustive sweep found 4.53:1, still above AA), real dialog semantics, focus trap, 24 px
  targets,
  `prefers-reduced-motion`, forced-colors selection.
- **One request per load.** In-flight de-duplication plus a 60 s cache.

## Features

- Current conditions, 24-hour strip, 10-day list, detail grid
- Dynamic gradient and day/night icons from the selected city's condition and sun
- °C/°F with km/h ↔ mph (re-requested from the API, never converted locally)
- City search with keyboard support; saved favourites reorder by arrow key or drag
- Last city, units and favourites persist across launches
- `Ctrl+R` refreshes, `Ctrl+F` searches, arrows move through results
- Frameless window with macOS-style controls, maximize/restore and double-click zoom

## Install

[**Download the latest `.deb`**](https://github.com/tarun-bansal/truecast/releases/latest) and install it:

```bash
sudo apt install ./truecast_0.1.3_amd64.deb
```

Tested on Ubuntu 26.04 LTS with GNOME on X11. Wayland is untested; 2× HiDPI was measured in a headless harness.

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

Requires Node 22+ and a Linux desktop with X11. The main process starts Chromium
with `--no-sandbox` so the packaged binary runs without the setuid
`chrome-sandbox` helper. That trades away part of Chromium's process isolation;
the app loads only Open-Meteo and local resources.

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
- No geolocation, notifications, alerts or radar yet. Settings cover units,
  reduced motion and About.
- English only.
- The hero numeral scales with your font size but the layout is tuned for
  1000 × 700.

## Quality

An AI design review, scored against a rubric by the author, gave the **0.1.0**
build **7.1 / 10** with **0 P0 and 0 P1**. Fixes made after that review are listed
in [`QA.md`](QA.md); they have not been independently re-reviewed. The three
reports, their measurements and the things that were *not* fixed are in
[`design-review/`](design-review/).

That is backed by **32 unit tests**, an end-to-end smoke test, and a truth check
that fails the build when the UI and the API disagree. The truth check **skips
with a notice** when the runner cannot reach Open-Meteo, so a green build means
"no disagreement found", not "the API was reachable". CI runs on pushes to `main`
and on pull requests. Packaging notes for AUR and Flathub are in
[`packaging/`](packaging/).

## Licence

MIT — see [LICENSE](LICENSE). Not affiliated with Apple; "macOS-style" describes
the visual language, not the vendor.
