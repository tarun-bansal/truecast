# Roadmap — from "passes the gate" to "worth a star"

Gate #3: **PASS, 7.1**, 0 P0, 0 P1. The remaining work is not correctness — it is
polish, distribution, and the things that make a repo *linkable*.

**Sizing:** XS ≤ 1 h · S 2–4 h · M ≈ 1 day · L 2–3 days
**Priority:** P0 blocks a respectable publish · P1 required for "polished" ·
P2 should · P3 nice

---

## M0 — Publishable (all P0)

| ID | Task | Size | Pri | Notes |
|---|---|---|---|---|
| R-01 | `git init`, first commit, sensible history | XS | P0 | repo does not exist yet |
| R-02 | MIT `LICENSE` | XS | P0 | |
| R-03 | Real README: pitch, GIF, 4 screenshots, install, dev, architecture, limitations | M | P0 | current README is the Vite template |
| R-04 | `QA.md` — gate record: 3 runs, 7.1, what failed, what was refused | S | P0 | the most linkable artefact in the repo |
| R-05 | Attribution: Open-Meteo (CC-BY 4.0, non-commercial free tier) in README **and** in-app; keep Inter OFL + Lucide ISC licences | S | P0 | legal requirement, not a nicety |
| R-06 | `.gitignore` audit; never commit `release/`, `dist/`, `node_modules/` | XS | P0 | 100 MB `.deb` must stay in Releases |
| R-07 | Capture the GIF + screenshots (dark/light, sheet, favourites, °F) | S | P0 | biggest stars-per-hour item |
| R-08 | Product name + icon | S | P0 | "Weather" collides with GNOME Weather; icon done |

---

## M1 — Close the gate's own list (P1)

| ID | Task | Size | Pri | Notes |
|---|---|---|---|---|
| R-10 | **F-03** theme the search sheet | M | P1 | **DONE** — 9.6–17.2 dark, 7.1–17.0 light |
| R-11 | **F-06** "Keep typing" below 2 characters | XS | P1 | **DONE** — 0 geocoder calls at 1 char |
| R-12 | **F-07** kill the default Electron menu | XS | P1 | **DONE** — real hidden menu, Alt does nothing |
| R-13 | **F-09** favourite reorder + "Clear all" | M | P1 | **DONE** — arrows + drag, confirm, focus kept |
| R-14 | **F-04** `outline-color: Highlight` under forced colors | XS | P1 | **REJECTED** — the source already uses `Highlight`; the gate measured its computed value |
| R-15 | **F-08** precipitation visualisation | M | P2 | **DONE** — per-hour bars under each temperature |

---

**M1 verification:** `p11-sheet.json` (both themes), `p12-m1.json` (6/6: bars,
reorder, persistence, clear-all), `p13-m1.json` (5/5: one character, menu, bars),
plus the regression suite (features 28/28, city 10/10, search 8/8, a11y 9/9,
sheet 5/5, focus 5/5, truth 131/131, console 0).

## M2 — Premium feel (P1/P2)

| ID | Task | Size | Pri | Notes |
|---|---|---|---|---|
| R-20 | Settings sheet / About | M | P1 | **DONE** — merged from #4: units, persisted reduce-motion override, About; `Ctrl+,` and gear |
| R-21 | Manual refresh + last-updated | S | P1 | **DONE** — refresh control spins while stale; `Ctrl+R` |
| R-22 | Keyboard shortcuts | S | P1 | **DONE** — `Ctrl+R`, `Ctrl+F`, Esc, Enter, arrows |
| R-23 | Search results as a real combobox | S | P2 | **DONE** — `role=combobox/listbox/option`, active descendant |
| R-24 | City-switch cross-fade | S | P2 | **DONE** — 260 ms, disabled under reduced motion |
| R-25 | Per-row star in search results | S | P2 | **DEFERRED** — a button inside a listbox option breaks the combobox semantics; the header star covers it |
| R-26 | Skeletons that match the real layout | S | P2 | **DONE** — 24 shapes mirroring hero, strip and rows |
| R-27 | Tray icon with current temperature | M | P3 | **DEFERRED** — P3; an AppIndicator dependency for little value |

---

**M2 verification:** `p14-m2.json` — 8/8: Ctrl+R refreshes without reloading,
Ctrl+F opens the sheet, combobox highlights/arrow/Enter, cross-fade runs, skeleton
matches the layout (24 blocks, 860 px).

## M3 — Ship and be found (P1)

| ID | Task | Size | Pri | Notes |
|---|---|---|---|---|
| R-30 | AUR / Flathub packaging | S / L | P1 | **PARTIAL** — `packaging/PKGBUILD` + docs; both need a public repo and accounts, so neither was published |
| R-31 | GitHub Actions CI | S | P1 | **DONE** — typecheck, tests, lint, build, plus an xvfb e2e job |
| R-32 | Unit tests | M | P1 | **DONE** — 30 tests: dates, units, day/night boundaries, theme, storage validation |
| R-33 | E2E smoke under xvfb | M | P2 | **DONE** — `e2e/smoke.mjs`, 8 checks against the packaged binary |
| R-34 | Release workflow | S | P1 | **DONE** — tag `v*` builds and attaches `release/*.deb` |
| R-35 | Wayland + HiDPI | S | P2 | **PARTIAL** — 2× HiDPI verified (identical layout, 2000×1400 capture); Wayland untested, no session here |

---

**M3 verification:** `npm test` 30/30; `node e2e/smoke.mjs` 8/8 on the
packaged binary; `npm run typecheck` and `npm run lint` clean; `p15-hidpi.json`
(dpr 2, hero 96 px, cards 159 px, no overflow).

## M4 — The differentiator (P2)

| ID | Task | Size | Pri | Notes |
|---|---|---|---|---|
| R-40 | CI truth check | M | P2 | **DONE** — `e2e/truth.mjs`, 125 values, wired into CI |
| R-41 | Write-up | S | P2 | **DONE** — `docs/STORY.md`, linked from the README |
| R-42 | About panel | XS | P2 | **DONE** — version, licence, data credit |
| R-43 | Localisation scaffold | L | P3 | **DEFERRED** — English-only is fine for v1; strings are already centralised in components |

---

**M4 verification:** `node e2e/truth.mjs` → 125/125 agree; `node e2e/smoke.mjs`
→ 8/8; CI runs both under xvfb.

## Open requests

| Issue | What | Size | Note |
|---|---|---|---|
| [#5](https://github.com/tarun-bansal/truecast/issues/5) | Choose a default city (what the app opens on) | M | storage + provider + a Settings row; distinct from "last viewed" |
| [#6](https://github.com/tarun-bansal/truecast/issues/6) | Use my location | M–L | GeoClue2 from the main process; reverse-geocoding decision; privacy copy |

## Definition of "polished"

- No open finding above P2, and every P2 either fixed or **stated** in the README.
- Every state designed: cold load, stale, offline, failed switch, empty search,
  no results, 500 px, 200 % text, forced colors, reduced motion.
- No layout shift on interaction; no focus ever lost; no contrast below AA.
- Keyboard-complete: every action reachable without a pointer.
- Window identity correct: title, icon, Restore, no stray menu.
- Install is one command.

## Not worth doing

Cross-platform builds, a native rewrite, an account/sync layer, weather alerts.
None of them earn a star; all of them cost a week.

## Start here (≈1.5 days)

**R-01 → R-02 → R-03 → R-07 → R-04 → R-10.**
Publishable, honest, and the one open P2 is gone.
