# A weather app that lied, and the three gates that fixed it

The screenshot looked finished. Glass cards, a 96 px temperature, a soft
gradient, real data from a real API. It was also wrong in at least seven
independent ways at the same time.

## What was on screen

- The header said **H:16° L:15°** while the list 300 px below said **22°/11°**
  for the same day. "High" was the current temperature; "low" was the apparent
  temperature. On one frame the low was two degrees above the high.
- The hourly strip labelled **midnight "Now"** and presented the elapsed day as
  upcoming.
- Every weekday in the 10-day list was **one day early**, because `new Date("2026-11-12")`
  parses as UTC midnight and re-renders in the host's timezone.
- The whole app — gradient, icons, "night" — followed the **host clock**, so
  Sydney at 3 p.m. was painted as midnight.
- Three separate `useWeather()` instances each fetched the forecast, and only one
  of them received the city selection. The header could say Tokyo while every
  panel below showed San Francisco.
- A failed city switch left the previous city's panels under an error banner, and
  the city label disappeared entirely.
- Ten minutes later the auto-refresh erased the city name, turning the pill into
  "Search city" with valid data still on screen.

A weather app that lies about the weather has no product. The glass made it
worse: it looked done.

## The original gate: 3.9 / 10, six release blockers

An independent design gate — run as a rubric, not a vibe check — measured the
pixels and compared every number against the API. It found **six P0s**, 13 P1s,
and one systemic contrast failure: every text layer on the glass cards sat
between **1.63:1 and 4.18:1**, against a 4.5:1 requirement.

That last one was the useful surprise. The bug was not "the colours are wrong";
it was that a translucent white card over a light sky produces a *rendered*
background nobody had measured. The fix was a token layer and, in one case,
re-declaring a grey overcast day as a dark surface, because white text on it
could never pass.

## Tranche one: make it tell the truth

One provider, one `data`. High and low from `daily[0].max/min`. Dates parsed from
their parts, never through the host timezone. Day and night from **that city's
own sunrise and sunset** for that date. Failed loads keep the last good reading
and name the city that failed. The hourly window starts at the city's current
hour, and the "Now" card carries the current reading so it cannot disagree with
the hero.

Then 132 on-screen values were compared against the API. All of them matched.

## First re-gate: 6.5–6.8, and no report

Once the data layer was rebuilt, a re-gate confirmed **0 P0** and four P1s — then
ran out of budget before writing a scorecard. A run without a report is a run you
cannot cite, so it is listed here as a pass, not a result.

## Second re-gate: 6.9, and a lesson about trusting the gate

The second run confirmed zero P0s and four P1s, and produced a confident finding:
*"favourites never persist — the geocoding ids are numeric, so the validator
drops them."*

It was wrong. The stored JSON in the gate's own evidence had string ids, and a
five-step reproduction — star, read storage, reload, read again, open the sheet —
showed the favourite intact. The right response was not to "fix" it. It was to
write down why it was rejected and move on. A gate is adversarial, not
infallible.

The other P1 was real: the search sheet grew 152 px the instant results arrived,
moving the input under the user's hands. Fixed by giving the sheet a fixed height.

## Third re-gate: 7.1, pass

The third run passed: **0 P0, 0 P1**, four P2s. It also caught me overstating a
fix — I had claimed focus stays in the dialog after removing a favourite. It does,
*until you remove the last one*, which dropped focus to `<body>`. Three lines
later, that was true.

## What generalises

- **Measure the rendered pixel.** Declared colours are a hypothesis.
- **Compare against the source, not the mock.** Every number, every row.
- **A finding you cannot reproduce is a hypothesis**, even when it is written
  confidently. Reproduce, then fix or reject.
- **Keep the receipts.** Three gate reports, the measurements, and the list of
  what is *not* fixed are in [`QA.md`](../QA.md) and
  [`design-review/`](../design-review/).
- Polish without truth is worse than an ugly app, because it buys trust it has
  not earned.
