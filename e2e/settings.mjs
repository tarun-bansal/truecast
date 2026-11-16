// Behaviour checks for the Settings sheet against the packaged app.
//
//   node e2e/settings.mjs [path-to-binary]
//
// Launches the binary with a throwaway profile, drives it over CDP, and
// checks the gear trigger, Ctrl+, from anywhere, the focus trap, Escape with
// focus back on the trigger, the reduce-motion override, the units switch and
// the About section. Exits non-zero on failure. Designed for `xvfb-run -a`.
// The live checks need the API; when it is unreachable they are skipped and
// the rest still runs.
import { launchApp, waitFor, sleep } from "./harness.mjs";

const BINARY = process.argv[2];
const SF = { lat: 37.7749, lon: -122.4194 };
const failures = [];
const check = (name, pass, detail) => {
  if (!pass) failures.push(`${name} — ${JSON.stringify(detail)}`);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : "  — " + JSON.stringify(detail)}`);
};
const skip = (name, why) => console.log(`SKIP  ${name} — ${why}`);

const api = async (unit, wind) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${SF.lat}&longitude=${SF.lon}` +
    `&current=temperature_2m&timezone=auto&forecast_days=1&temperature_unit=${unit}&wind_speed_unit=${wind}`;
  return (await fetch(url)).json();
};

const reachable = await fetch(
  "https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m",
  { signal: AbortSignal.timeout(10_000) },
).then((response) => response.ok).catch(() => false);
if (!reachable) {
  console.log("NOTE  api.open-meteo.com is not reachable from this machine; the live checks are skipped.");
}

const app = await launchApp({ port: 9232, binary: BINARY });
try {
  const { cdp } = app;
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(cdp, `!!document.querySelector('[data-settings-trigger]')`, "title bar", 60_000);
  await sleep(1500);

  const gear = () => cdp.eval(`document.querySelector('[data-settings-trigger]')?.getAttribute('aria-label')`);
  const dialogOpen = () => cdp.eval(`!!document.querySelector('[role="dialog"]')`);
  const activeLabel = () =>
    cdp.eval(`document.activeElement === document.body ? '<body>' : (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? 'none')`);
  const forecast = () => cdp.requests.filter((url) => /api\.open-meteo\.com\/v1\/forecast/.test(url)).length;

  check("settings gear exists", (await gear()) === "Open settings");
  check("sheet closed at launch", !(await dialogOpen()));

  // Open from the gear; focus lands on the first control, not the panel.
  await cdp.eval(`document.querySelector('[data-settings-trigger]').click()`);
  await waitFor(cdp, `!!document.querySelector('[role="dialog"]')`, "sheet open");
  check("gear opens the sheet", true);
  check(
    "focus lands on the first control",
    (await cdp.eval(`document.activeElement?.getAttribute('aria-label')`))?.startsWith("Celsius") ?? false,
  );
  check("gear reports expanded", (await cdp.eval(`document.querySelector('[data-settings-trigger]').getAttribute('aria-expanded')`)) === "true");

  // The trap: Tab cycles inside the dialog and never escapes it.
  let escaped = false;
  for (let i = 0; i < 20; i += 1) {
    await cdp.key("Tab", "Tab", 9);
    await sleep(60);
    if (!(await cdp.eval(`document.querySelector('[role="dialog"]')?.contains(document.activeElement)`))) {
      escaped = true;
      break;
    }
  }
  check("Tab stays inside the sheet", !escaped);

  // Escape closes and focus returns to the gear — never to <body>.
  await cdp.key("Escape", "Escape", 27);
  await sleep(400);
  check("Escape closes it", !(await dialogOpen()));
  check("focus returns to the gear trigger", (await activeLabel()) === "Open settings", await activeLabel());

  // Ctrl+, works from anywhere: move focus away first (a click on plain
  // content leaves focus on <body>), then open from the keyboard.
  await cdp.eval(`document.querySelector('main')?.click()`);
  await sleep(200);
  await cdp.key(",", "Comma", 188, 2);
  await waitFor(cdp, `!!document.querySelector('[role="dialog"]')`, "sheet open via Ctrl+,");
  check("Ctrl+, opens the sheet from anywhere", true);
  await cdp.key("Escape", "Escape", 27);
  await sleep(400);
  check("focus still returns to the gear after Ctrl+,", (await activeLabel()) === "Open settings", await activeLabel());

  // Dialog exclusivity: opening one sheet closes the other — never two
  // role=dialog at once, in either direction, and focus lands in the sheet
  // that just opened, not on the trigger of the one that closed.
  const dialogCount = () => cdp.eval(`document.querySelectorAll('[role="dialog"]').length`);
  const dialogLabel = () =>
    cdp.eval(`document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby') ?? ''`);
  await cdp.eval(`document.querySelector('[data-settings-trigger]').click()`);
  await waitFor(cdp, `!!document.querySelector('[role="dialog"]')`, "sheet open");
  check("settings open before Ctrl+F", (await dialogCount()) === 1, await dialogCount());
  await cdp.key("f", "KeyF", 70, 2);
  await sleep(500);
  check("Ctrl+F with Settings open leaves one dialog", (await dialogCount()) === 1, await dialogCount());
  check("that dialog is the city search", (await dialogLabel()) === "search-title", await dialogLabel());
  check(
    "focus lands in the search input, not the settings gear",
    (await cdp.eval(`document.activeElement?.getAttribute('aria-label')`)) === "Enter city name",
    await activeLabel(),
  );
  await cdp.key(",", "Comma", 188, 2);
  await sleep(500);
  check("Ctrl+, with search open leaves one dialog", (await dialogCount()) === 1, await dialogCount());
  check("that dialog is Settings again", (await dialogLabel()) === "settings-title", await dialogLabel());
  check(
    "focus lands on the first control again",
    (await cdp.eval(`document.activeElement?.getAttribute('aria-label')`))?.startsWith("Celsius") ?? false,
  );
  await cdp.key("Escape", "Escape", 27);
  await sleep(400);
  check("Escape closes it after the switch", !(await dialogOpen()));
  check("focus returns to the gear after the switch", (await activeLabel()) === "Open settings", await activeLabel());

  // About: version only, no commit hash anywhere in the sheet.
  await cdp.eval(`document.querySelector('[data-settings-trigger]').click()`);
  await waitFor(cdp, `!!document.querySelector('[role="dialog"]')`, "sheet open");
  const about = await cdp.eval(`document.querySelector('[role="dialog"]').innerText`);
  check("About shows a version", /Version \d+\.\d+\.\d+/.test(about), about.match(/Version [^\n]*/)?.[0]);
  check("About shows no commit hash", !/[0-9a-f]{40}/.test(about));
  check("About names the data source", /Open-Meteo \(CC BY 4\.0\)/.test(about));

  // The app-menu IPC subscription exists (the menu item sends "open-settings").
  check(
    "preload exposes onOpenSettings",
    (await cdp.eval(`typeof window.electronAPI?.onOpenSettings`)) === "function",
  );

  // Reduce motion: the toggle writes the preference and silences animation.
  const motion = () => cdp.eval(`document.documentElement.dataset.motion ?? ''`);
  const storedMotion = () => cdp.eval(`window.localStorage.getItem('weather.motion.v1')`);
  await cdp.eval(`document.querySelector('[role="switch"][aria-label="Reduce motion"]').click()`);
  await sleep(200);
  check("toggle sets data-motion=reduce", (await motion()) === "reduce");
  check("toggle persists the preference", (await storedMotion()) === "true");
  if (reachable) {
    const cityEnter = await cdp.eval(`(() => { const el = document.querySelector('.city-enter'); if (!el) return null; const cs = getComputedStyle(el); return { name: cs.animationName, duration: cs.animationDuration }; })()`);
    if (cityEnter) {
      check("reduce motion silences the city-enter animation", cityEnter.name === "none", cityEnter);
    } else {
      skip("city-enter animation check", "no .city-enter element on screen");
    }
  } else {
    skip("city-enter animation check", "API unreachable");
  }
  await cdp.eval(`document.querySelector('[role="switch"][aria-label="Reduce motion"]').click()`);
  await sleep(200);
  check("toggle off clears data-motion", (await motion()) === "");
  check("toggle off persists", (await storedMotion()) === "false");

  // Units in the sheet re-fetch in the new units, like the title-bar switch.
  if (reachable) {
    const fahrenheit = await api("fahrenheit", "mph");
    const before = forecast();
    await cdp.eval(`document.querySelector('[role="dialog"] button[aria-label^="Fahrenheit"]').click()`);
    await waitFor(
      cdp,
      `[...document.querySelectorAll('span')].some(s => s.children.length === 0 && s.textContent.trim() === ${JSON.stringify(`${Math.round(fahrenheit.current.temperature_2m)}°`)})`,
      "hero in °F",
    );
    check("°F in the sheet re-requests and matches the API", forecast() - before === 1, `${Math.round(fahrenheit.current.temperature_2m)}°`);
    check("sheet stays in sync with the title bar", (await cdp.eval(`document.querySelector('[role="dialog"] button[aria-label^="Fahrenheit"]').getAttribute('aria-pressed')`)) === "true");
    // Leave the app as it was found.
    await cdp.eval(`document.querySelector('[role="dialog"] button[aria-label^="Celsius"]').click()`);
    await sleep(1500);
  } else {
    skip("units re-fetch check", "API unreachable");
  }

  await cdp.key("Escape", "Escape", 27);
  await sleep(400);
  check("sheet closes at the end", !(await dialogOpen()));
} catch (error) {
  failures.push(`threw: ${error.message}`);
  console.error(error);
} finally {
  app.stop();
}

console.log(`\n${failures.length ? `${failures.length} failing` : "all checks passed"}`);
process.exit(failures.length ? 1 : 0);
