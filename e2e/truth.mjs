// Truth check: every number on screen must equal the API response the app was
// allowed to use. Fails the build on any disagreement.
//
//   node e2e/truth.mjs
//
// The app's own forecast request URL is captured, then re-fetched, so the check
// follows whatever city and units the app chose instead of assuming them.
import { launchApp, waitFor, sleep } from "./harness.mjs";

const failures = [];
const checks = [];
const expect = (name, ui, api) => {
  const pass = String(ui) === String(api);
  checks.push({ name, ui: String(ui), api: String(api), pass });
  if (!pass) failures.push({ name, ui, api });
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parts = (value) => {
  const [date, time = "00:00"] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute, date };
};
const weekday = (date, long = false) => {
  const { year, month, day } = parts(date);
  const index = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return long ? WEEKDAY_LONG[index] : WEEKDAY_SHORT[index];
};
const hourLabel = (value) => {
  const { hour } = parts(value);
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return `${hour % 12}${hour < 12 ? "am" : "pm"}`;
};
const clockLabel = (value) => {
  const { hour, minute } = parts(value);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};
const temp = (value) => `${Math.round(value)}°`;
const decimal = (value) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const reachable = await fetch(
  "https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m",
  { signal: AbortSignal.timeout(10_000) },
).then((response) => response.ok).catch(() => false);
if (!reachable) {
  console.log("SKIP  api.open-meteo.com is not reachable from this machine; the truth check needs it.");
  process.exit(0);
}

const app = await launchApp({ port: 9231 });
try {
  await app.cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(app.cdp, `!!document.querySelector('button[aria-label^="Change city"]') || /Weather is unavailable/.test(document.body.innerText)`, "first paint", 60_000);
  if (await app.cdp.eval(`/Weather is unavailable/.test(document.body.innerText)`)) {
    throw new Error(`the app showed its error state instead of weather: ${await app.cdp.eval("document.body.innerText.replace(/\\n+/g, ' | ')")}`);
  }
  await sleep(1500);

  const forecastUrls = app.cdp.requests.filter((url) => /api\.open-meteo\.com\/v1\/forecast/.test(url));
  if (forecastUrls.length === 0) throw new Error("the app made no forecast request");
  const requestUrl = forecastUrls[forecastUrls.length - 1];
  const api = await (await fetch(requestUrl)).json();
  const units = new URL(requestUrl).searchParams;
  const windLabel = units.get("wind_speed_unit") === "mph" ? "mph" : "km/h";
  const imperial = units.get("wind_speed_unit") === "mph";

  const dom = await app.cdp.eval(`(() => {
    const leaf = (re) => [...document.querySelectorAll('*')]
      .filter((element) => element.children.length === 0)
      .map((element) => (element.textContent || '').trim())
      .find((text) => re.test(text) && text.length < 40) ?? null;
    const cards = [...document.querySelectorAll('section[aria-labelledby="hourly-heading"] .scroll-x > div')]
      .map((card) => (card.innerText || '').split('\\n').map((line) => line.trim()).filter(Boolean));
    const rows = [...document.querySelectorAll('[data-day-row]')]
      .map((row) => (row.innerText || '').split('\\n').map((line) => line.trim()).filter(Boolean));
    const details = [...document.querySelectorAll('section[aria-label] > div > div')]
      .map((card) => (card.innerText || '').split('\\n').map((line) => line.trim()).filter(Boolean));
    const mainLines = (document.querySelector('main')?.innerText || '').split('\\n').map((line) => line.trim()).filter(Boolean);
    const humidity = [...document.querySelectorAll('span')]
      .find((span) => span.querySelector('.lucide-droplet') && /\\d+%/.test(span.textContent || ''));
    return {
      pill: document.querySelector('button[aria-label^="Change city"]')?.innerText.trim() ?? null,
      hero: leaf(/^-?\\d+°$/),
      condition: leaf(/^(Clear|Mainly clear|Partly cloudy|Overcast|Fog|Light drizzle|Slight rain|Moderate rain)$/),
      high: leaf(/^H:-?\\d+°$/),
      low: leaf(/^L:-?\\d+°$/),
      feels: leaf(/^Feels like -?\\d+°$/),
      humidity: humidity ? (humidity.textContent || '').trim() : null,
      wind: leaf(/^\\d+ (km\\/h|mph)$/),
      dateLine: mainLines.find((line) => /^(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY),/.test(line)) ?? null,
      hourly: cards,
      days: rows,
      details,
    };
  })()`);

  expect("hero", dom.hero, temp(api.current.temperature_2m));
  expect("high", dom.high, `H:${temp(api.daily.temperature_2m_max[0])}`);
  expect("low", dom.low, `L:${temp(api.daily.temperature_2m_min[0])}`);
  expect("feels like", dom.feels, `Feels like ${temp(api.current.apparent_temperature)}`);
  expect("humidity", dom.humidity, `${Math.round(api.current.relative_humidity_2m)}%`);
  expect("wind", dom.wind, `${Math.round(api.current.wind_speed_10m)} ${windLabel}`);
  const date = parts(api.current.time);
  expect(
    "header date",
    dom.dateLine,
    `${weekday(api.current.time, true).toUpperCase()}, ${MONTHS[date.month - 1].toUpperCase()} ${date.day}`,
  );

  // The strip starts at the city's current hour; `current.time` carries minutes.
  const currentHour = api.current.time.slice(0, 13);
  const start = Math.max(0, api.hourly.time.findIndex((time) => time.slice(0, 13) >= currentHour));
  const hourly = api.hourly.time.slice(start, start + 24);
  expect("hourly count", dom.hourly.length, 24);
  hourly.forEach((time, index) => {
    const card = dom.hourly[index] ?? [];
    const temperature = index === 0 ? api.current.temperature_2m : api.hourly.temperature_2m[start + index];
    expect(`hour ${index} label`, card[0], index === 0 ? "Now" : hourLabel(time));
    expect(`hour ${index} temp`, card[1], temp(temperature));
    const pop = api.hourly.precipitation_probability[start + index] ?? 0;
    if (pop > 0) expect(`hour ${index} pop`, card[3] ?? card[2], `${pop}%`);
  });

  expect("day count", dom.days.length, 10);
  api.daily.time.forEach((dateValue, index) => {
    const row = dom.days[index] ?? [];
    expect(`day ${index} name`, row[0], index === 0 ? "Today" : weekday(dateValue));
    expect(`day ${index} min`, row[1], temp(api.daily.temperature_2m_min[index]));
    expect(`day ${index} max`, row[2], temp(api.daily.temperature_2m_max[index]));
    const pop = api.daily.precipitation_probability_max[index];
    expect(`day ${index} precip`, row[3], pop > 0 ? `${pop}%` : "—");
  });

  const detail = {};
  for (const card of dom.details) detail[card[0].toUpperCase()] = card;
  const visibility = imperial
    ? `${api.current.visibility / 1609.344 < 10 ? (api.current.visibility / 1609.344).toFixed(1) : Math.round(api.current.visibility / 1609.344)} mi`
    : `${api.current.visibility / 1000 < 10 ? (api.current.visibility / 1000).toFixed(1) : Math.round(api.current.visibility / 1000)} km`;
  expect("UV", detail["UV INDEX"]?.[1], decimal(api.current.uv_index));
  expect("visibility", detail["VISIBILITY"]?.[1], visibility);
  expect("pressure", detail["PRESSURE"]?.[1], `${Math.round(api.current.pressure_msl)} hPa`);
  expect("sunrise", detail["SUNRISE"]?.[1], clockLabel(api.daily.sunrise[0]));
  expect("sunset", (detail["SUNRISE"]?.[2] ?? "").replace(/^Sunset /, ""), clockLabel(api.daily.sunset[0]));

  console.log(`city: ${dom.pill} · units: ${units.get("temperature_unit")}`);
  console.log(`checked ${checks.length} on-screen values against ${new URL(requestUrl).host}`);
  if (failures.length) {
    for (const failure of failures) console.log(`FAIL  ${failure.name}: ui=${failure.ui} api=${failure.api}`);
    console.log(`\n${failures.length} of ${checks.length} disagree`);
  } else {
    console.log(`\nall ${checks.length} agree`);
  }
} catch (error) {
  failures.push({ name: "threw", ui: "", api: error.message });
  console.error(error);
} finally {
  app.stop();
}
process.exit(failures.length ? 1 : 0);
