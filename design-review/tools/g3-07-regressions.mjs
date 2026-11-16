import { attach, sleep } from "./cdp.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
mkdirSync(OUT, { recursive: true });
const cdp = await attach(9225);

async function shot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
}

async function metrics(label) {
  const m = await cdp.eval(`(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth > doc.clientWidth + 1;
    const scrollers = [...document.querySelectorAll("*")].filter(el => {
      const cs = getComputedStyle(el);
      return el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "visible" && cs.overflowX !== "hidden";
    }).map(el => ({
      tag: el.tagName, cls: String(el.className).slice(0, 70),
      scrollW: el.scrollWidth, clientW: el.clientWidth,
    }));
    const clipped = [...document.querySelectorAll("main *")].filter(el => {
      if (!el.textContent?.trim()) return false;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === "ellipsis" || cs.overflow === "hidden" || cs.overflowY === "hidden") return false;
      return el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
    }).slice(0, 8).map(el => ({ tag: el.tagName, cls: String(el.className).slice(0,60), txt: (el.textContent||"").trim().slice(0,30), scrollW: el.scrollWidth, clientW: el.clientWidth }));
    const hero = document.querySelector(".tnum.text-\\\\[6rem\\\\]");
    const heroEl = [...document.querySelectorAll("span")].find(s => s.className.includes("text-[6rem]"));
    const cs = heroEl ? getComputedStyle(heroEl) : null;
    return {
      vw: window.innerWidth, vh: window.innerHeight,
      docScrollW: doc.scrollWidth, docClientW: doc.clientWidth,
      overflowX,
      bodyScrollH: document.body.scrollHeight,
      rootFont: getComputedStyle(doc).fontSize,
      heroFontSize: cs ? cs.fontSize : null,
      heroText: heroEl ? heroEl.textContent : null,
      heroRect: heroEl ? (r => ({x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}))(heroEl.getBoundingClientRect()) : null,
      scrollers, clipped,
      mainScrollH: document.querySelector(".overflow-y-auto")?.scrollHeight ?? null,
    };
  })()`);
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(m, null, 1));
  return m;
}

console.log("############ A. WIDTHS ############");
for (const w of [500, 800, 1000, 1600]) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: 700, deviceScaleFactor: 1, mobile: false });
  await sleep(700);
  await metrics(`width ${w}`);
  await shot(`w-${w}`);
}
await cdp.send("Emulation.clearDeviceMetricsOverride");
await sleep(500);

console.log("\n############ B. 200% TEXT (root font-size 32px) ############");
const base = await cdp.eval(`getComputedStyle(document.documentElement).fontSize`);
console.log("root font-size before:", base);
await cdp.eval(`document.documentElement.style.fontSize = "32px"`);
await sleep(700);
await metrics("root 32px");
await shot("text-200");
await cdp.eval(`document.documentElement.style.fontSize = ""`);
await sleep(500);

console.log("\n############ C. FORCED COLORS ############");
await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
await sleep(700);
const fc = await cdp.eval(`(() => {
  const pressed = [...document.querySelectorAll('[aria-pressed="true"]')].map(el => {
    const cs = getComputedStyle(el);
    return { text: (el.innerText||"").trim().slice(0,20), outline: cs.outline, outlineOffset: cs.outlineOffset, bg: cs.backgroundColor, color: cs.color };
  });
  return { pressed, forced: matchMedia("(forced-colors: active)").matches };
})()`);
console.log(JSON.stringify(fc, null, 1));
await shot("forced-colors");
await cdp.send("Emulation.setEmulatedMedia", { features: [] });
await sleep(400);

console.log("\n############ D. REDUCED MOTION ############");
await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await sleep(600);
const rm = await cdp.eval(`(() => {
  const el = document.querySelector(".city-enter");
  const cs = el ? getComputedStyle(el) : null;
  const probe = document.createElement("div");
  probe.className = "city-enter";
  document.body.appendChild(probe);
  const ps = getComputedStyle(probe);
  const out = { matches: matchMedia("(prefers-reduced-motion: reduce)").matches, cityEnter: cs ? { name: cs.animationName, dur: cs.animationDuration } : null, probe: { name: ps.animationName, dur: ps.animationDuration } };
  probe.remove();
  return out;
})()`);
console.log(JSON.stringify(rm, null, 1));
await cdp.send("Emulation.setEmulatedMedia", { features: [] });
await sleep(400);

console.log("\n############ E. CLEAN LOAD — console errors ############");
cdp.console.length = 0;
const before = cdp.requests.length;
await cdp.send("Page.reload", { ignoreCache: true });
await sleep(6000);
console.log("console messages:", JSON.stringify(cdp.console, null, 1));
console.log("network requests since reload:");
for (const u of cdp.requests.slice(before)) console.log("  ", u);
await shot("clean-load");

await cdp.close();
