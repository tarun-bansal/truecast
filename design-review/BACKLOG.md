# P1 backlog — remaining release blockers

Working rule: **one item at a time**, each closed only when a measurement on the
packaged build proves it, and the status written here before the next starts.

Order chosen by value ÷ risk:

| # | Item | Gate ID | Status |
|---|---|---|---|
| 1 | Persist the last selected city | SG-13 | **DONE — 10/10** (`p1-city.json`) |
| 2 | Search results: no clipped row, show the count | SG-09 | **DONE — 8/8** (`p2-search.json`) |
| 3 | Detail cards reachable at 1000×700 | SG-16 | **DONE — measured** (`p3-fold.json`) |
| 4 | One content axis | SG-17 | **DONE — measured** (`p4-axes.json`) |
| 5 | Window identity (title, icon, restore, double-click) | SG-23 | **DONE — verified** (`p9-window.json`) |

---

## 1 — Persist the last selected city (SG-13)

**Defect.** Favourites and units persist, but every launch opens on San
Francisco. A user who lives in Berlin re-picks Berlin every time.

**Change.** Store the selected `City` under `weather.city.v1`, validate it with
the same guard the favourites use, and use it as the provider's initial city.
Fall back to `DEFAULT_CITY` when absent or invalid. Write on every successful
load; never write a failed city.

**Proof.** Select Miami → reload → pill `Miami`, values match Miami's API.
Clear the key → reload → `San Francisco`.

**DONE 2026-11-14.** `weather.city.v1` holds the last *successful* city; a failed
switch never overwrites it. 10/10 checks (`p1-city.json`, `p1-city-restored.png`):
default on no key · first load persists its city · selection persists with the
selected coordinates · reload restores Miami with Miami's own reading · exactly
one forecast request on launch · invalid stored JSON falls back to the default ·
cleared key returns to the default.

## Findings added by the independent gate run (2026-11-14)

The gate ran on `opencode-go/deepseek-v4.1-flash` and confirmed **0 P0**. It ran
out of its 60-step budget before the formal scorecard, but its working read was
**FAIL on P1 count, weighted ~6.5–6.8**, consistent with `REGATE.md`. It added:

- **SG-19 is PARTIAL, not closed.** The hourly scroller is keyboard-focusable and
  still draws the UA orange ring (`rgb(229,151,0)`); only `button/a/input` got the
  token. *Fix: put the token ring on `:focus-visible` itself.*
- **Dead hover affordances.** Day rows and hourly cards animate a hover wash but
  are not interactive. *Fix: remove the hover from non-interactive rows.*
- **Contrast, exhaustively.** Its 80-run dark sweep found a worst of **4.53:1**
  (12 px `%` label), and 4.97:1 light — both pass, but my "worst 6.19" was a
  sample, not a sweep. Correct the claim in `REGATE.md`.
- **800×560:** detail cards shrink to 117 px and labels wrap; the grid is cut at
  x≈494. Part of item 3.
- **A duplicate city pill ("Charlotte") with zero alpha** appeared once and not
  again. Unverified; watch for it during item 1's reload tests (none seen).
- **SG-22** still PARTIAL: the bar scales to the week now but sits far from the
  numbers with no legend.
- **No `<h1>`** in the ready state (SG-24).

These are queued as items 6–8 below, after the four P1s.

---

## 2 — Search results: no clipped row, show the count (SG-09)

**Defect.** The result list is `max-h-60` (240 px) for six 64 px rows, so the
fifth row is cut mid-height and a nested scrollbar appears.

**Change.** Size the list to the six rows the request already asks for
(`count: 6`) — no scroll at the default window — and cap the dialog so it still
fits at the 560 px minimum height. Add an "N results" line (and keep the
`aria-live` announcement).

**Proof.** Search a term with six hits at 1000×700: last row's bottom ≤ list
bottom, `overflow` not scrolling, count line present. Re-check at 800×560.

**DONE 2026-11-14.** The list is sized to the six rows the search already
requests (`max-h-96` = 384 px = 6 × 64). Measured: list **384/384** (no scroll),
last row bottom **583 ≤ 583**, "6 results" visible, 0 unnamed buttons, dialog
31–669 inside 700. At 800×560 the dialog fits 12–548 and the list scrolls by
whole rows (`scroll-snap`). `p2-search.json`, `p2-search-1000x700.png`.

---

## 3 — Detail cards reachable at 1000×700 (SG-16)

**Defect.** The page is 1112 px tall at 700 px viewport. The two-column layout
exists, but the lower detail cards sit below the fold.

**Measure first.** The first detail row may already be visible at y≈571. If so,
this is "two of three rows below the fold", not "the grid is below the fold" —
record it accurately rather than overstating.

**Change (if needed).** Tighten the vertical spend above the fold: hero margins,
hourly strip bottom padding, card `min-h`; consider 3-up detail columns at `md`
instead of only `xl`. Target: first two detail rows visible without scrolling.

**DONE 2026-11-14.** The measurement changed the fix. At 1000×700 the first
detail row was **already visible** (572–696); the real defect was at 800 px,
where the 5/12 column squeezed cards to **118 px** and labels wrapped. The
two-column layout now starts at **900 px** instead of 768; below that the page
is one column and the cards are **341 px** wide. Verified: 1000×700 → 12-col,
2-up 159 px cards, first row visible; 800×560 → 1-col, 2-up 341 px, no wrap;
1600×1000 → 3-up 186 px. Content remains 1112 px at 700 and 1550 px at 560, so
the lower rows are still reached by scrolling — stated, not hidden.

---

## 4 — One content axis (SG-17)

**Defect.** Rendered ink starts at 48 (hero, H/L), 56 (section headings), 65
(day names), and 109 (detail labels inside cards).

**Target.** Deliberate two-axis system, not a single forced axis: block edges at
**48**, and content inside cards and section headers at **64** (16 px inset —
the grouped-list pattern). Today's 48/56/65 is accidental, not a system.

**Change.** Remove the compensating `px-2` from both section headers; inset the
headers to the same 64 as the row text; keep the detail cards on 48 with their
internal 16 px.

**Proof.** Ink-band scan of a text-hidden plate, listing every left edge;
expect exactly {48, 64}.

**DONE 2026-11-14.** Every block edge measures **48** (hero, H/L, feels-like,
hourly card, day row, detail card); every text inset measures **16 ± 1** (both
section headers, day name, detail value). Measured with `Range` rects on the text
nodes, not element boxes (`p4-axes.json`, `p4-axes.png`). The accidental 56 px
heading axis is gone.

---

## 5 — Window identity (SG-23), after the P1s

Real `<title>Weather</title>`, an application icon in the build and the
`.desktop` entry, Restore glyph on maximize, double-click the drag region to
zoom, and matching window background. No data or layout impact.

---

## 6–8 — done 2026-11-14 (9/9, `p5-a11y.json`)

6. **Focus ring** — `:focus-visible` now carries the token ring on every element.
   The hourly scroller, previously `rgb(229,151,0)` (UA orange), measures
   `rgb(255,255,255)`.
7. **Dead hovers** — removed from day rows and hourly cards. The hover proof now
   targets the city pill (a real control): **5,207 of 5,508 px** changed inside
   its box (94.5 %), 0 outside (`hover-diff.json`, `p6-*`).
8. **`<h1>` + labelled high/low** — one sr-only `h1` ("San Francisco weather"),
   header H/L labelled "High 17 degrees"/"Low 11 degrees", and all 20 day-row
   high/low values labelled.

## Round 2 — findings from the gate's second run

The gate ran again on the final package and produced a provisional scorecard:
**0 P0, ~6.9 weighted, FAIL on two claimed P1s.** One of the two was wrong.

| Claim | Verdict | Proof |
|---|---|---|
| **P1 — favourites never persist** (root cause: "geocoding ids are numeric") | **REJECTED** | The stored JSON in the gate's own `favorites.json` has string ids (`"id":"1850147"`), and `isCity` accepts them. Reproduced the full cycle: star → key populated → reload → key still populated → sheet lists the favourite (`Remove Miami from favorites`). `fav-repro2.mjs` output; also `features.json` "favourite survives a reload". No code change made for a bug that does not exist. |
| **P1 — the sheet jumps 152 px when results arrive** | **FIXED** | Real: an auto-height sheet is centred, so six rows moved the input under the user's hands. The panel is now a fixed `h-[min(40rem,calc(100vh-1.5rem))]` with the body `flex-1`. Measured: empty and full both **30 → 670, h 640**, delta **0 px**. `p7-fixes.json` |
| **P2 — removing a favourite ejects focus to `<body>`** | **FIXED** | Focus now moves to the next remove button: after removing Tokyo, `activeElement` = "Remove Paris from favorites", inside the dialog. |
| **P2 — forced-colors loses the selected unit** | **FIXED** | `@media (forced-colors: active) [aria-pressed="true"]` draws a `Highlight` outline; active unit `2px solid` cyan, inactive `outline-style: none`. `p7-forced-colors.png` |
| **P2 — "align the hourly heading to the 48 axis"** | **DISAGREED** | Declined: the axis system is edges at 48 and card content at 16 inset (64). A header floating at 48 above cards whose text is at 64 would be the accident, not the fix. Recorded, not changed. |
| **P3 — window title/icon, Linux control order** | **OPEN** | Item 5. |

Also of note: the gate measured reduced motion at **0 transitions > 1 ms across 545
elements**, and an exhaustive dark-contrast sweep with a worst genuine pair of
**4.92:1** — everything passing.

## Favourites entry point (requested after the gate)

The only way to reach saved cities was to open the city pill and notice that the
empty search field showed a FAVORITES section — invisible to anyone who did not
already know. Added a **bookmark button with the saved count** to the title bar,
left of the units switch: `aria-label="Favorites, 2 cities"` (or "none saved"),
`aria-haspopup="dialog"`, 42 × 28 px target, opens the same sheet on the
favourites view. The star beside the city still adds/removes the *current* city;
the bookmark is the list, so the two icons do not mean the same thing.

Measured: 5/5 (`p8-favorites-button.json`) — control exists, reports the count,
target ≥ 24, opens the sheet on favourites, honest empty state. The 11 px count
measures **4.76:1** on the chip (`p8-contrast.json`), above AA.

## Window identity — done

- `document.title` / bundle title: **Weather**.
- A **512 px icon** (`build/icon.svg` → `build/icon.png`, drawn as SVG because the
  image API had no credits) bundled via `build.linux.icon`; the `.deb` now ships
  `/usr/share/icons/hicolor/512x512/apps/weather-app.png` and `Icon=weather-app`
  resolves. The "default Electron icon is used" build warning is gone.
- **Restore state**: `window-toggle-maximize` IPC + `window-maximized` events;
  the green control reads "Maximize window" → "Restore window" and back.
- **Double-click the title bar** to zoom.
- Window `backgroundColor` set to `#0b1220`, matching the pre-data theme.
- Skipped deliberately: a custom application menu (the default is reachable with
  Alt; not worth the time box).

Measured (`p9-window.json`): title `Weather`; maximize → `maxed:true`, label
`Restore window`; restore → `maxed:false`; double-click → `maxed:true`.

## Post-gate P2 fixes (after the PASS)

The gate passed at **7.1** and named four P2s. Three were cheap and are fixed;
the fourth is a design decision with a real cost.

| Gate ID | Finding | Status |
|---|---|---|
| F-01 | Removing the **last** favourite dropped focus to `<body>` | **FIXED** — the fallback is now the search input: `activeElement` = `INPUT`, inside the dialog (`p10-final.json`) |
| F-05 | Empty-state copy pointed at a star that isn't in the result list | **FIXED** — "Search for a city, open it, then use the star beside its name…" |
| F-02 | The 96 px hero ignored text size | **FIXED** — `6rem`: 96 px normally, **192 px** at 200 % text, no horizontal overflow |
| F-03 | The search sheet is always light inside the dark theme | **FIXED in M1** — tokenised sheet, measured 9.6–17.2:1 dark / 7.1–17.0:1 light. The note above is the state at the time of gate #2. |

`p10-final.json` — 5/5: last-item focus, corrected copy, 96 px at default,
192 px at 200 %, no overflow.

## Progress log

- 2026-11-14: backlog written; gate re-run on
  `opencode-go/deepseek-v4.1-flash` (free models capped) — 0 P0 confirmed,
  budget exhausted before the scorecard, working verdict FAIL on P1 count.
- 2026-11-14: **item 1 done** — last city persisted, 10/10.
- 2026-11-14: **item 2 done** — search sheet fits six rows with a count, 8/8.
- 2026-11-14: **item 3 done** — 800 px cards 118 → 341 px, no wrap; default keeps
  two columns with the first detail row visible.
- 2026-11-14: **item 4 done** — edges 48, insets 16; the 56 px axis is gone.
- 2026-11-14: **items 6–8 done** — token focus ring everywhere, dead hovers gone,
  `h1` and 20 labelled high/low values, 9/9.
- 2026-11-14: **gate #2** — 0 P0, ~6.9, two claimed P1s; one was a false positive
  (favourites persist), the other (sheet jump) fixed along with two P2s, 5/5.
- 2026-11-14: **favourites entry point** — bookmark + count in the title bar, 5/5.
- 2026-11-14: **window identity** — title, icon, Restore, double-click; `.deb`
  ships the icon; 131/131 values still match after the change.
- 2026-11-14: **gate #3 — PASS, 7.1**, 0 P0 / 0 P1 / 4 P2. `SHIP-GATE-2.md`.
- 2026-11-14: **three P2s fixed after the pass** (last-item focus, empty-state
  copy, scalable hero), 5/5. The sheet-theme P2 remains open by choice.
