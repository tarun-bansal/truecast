import { attach, sleep } from "./cdp.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
fs.mkdirSync(OUT, { recursive: true });
const GRADIENTS = {
  dark: "linear-gradient(180deg, #0b1220 0%, #1e293b 100%)",
  light: "linear-gradient(180deg, #bfdbfe 0%, #60a5fa 100%)",
};

const cdp = await attach(9225);
await cdp.eval(`document.querySelector("[data-settings-trigger]").click()`);
await sleep(700);
await cdp.eval(`(() => { const s=document.createElement('style'); s.id='nt'; s.textContent='*{transition:none !important;animation:none !important;}'; document.head.appendChild(s); })()`);

async function crop(file, rect, scale = 4) {
  const r = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale },
  });
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
}

for (const theme of ["dark", "light"]) {
  await cdp.eval(
    `document.documentElement.dataset.theme=${JSON.stringify(theme)};` +
    `document.documentElement.style.setProperty('--bg-gradient',${JSON.stringify(GRADIENTS[theme])});`,
  );
  await sleep(500);

  const geo = await cdp.eval(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const group = dialog.querySelector('[role="group"][aria-label="Temperature and wind units"]');
    const c = group.querySelectorAll("button");
    const g = group.getBoundingClientRect();
    const b0 = c[0].getBoundingClientRect(), b1 = c[1].getBoundingClientRect();
    const sw = dialog.querySelector('[role="switch"][aria-label="Reduce motion"]');
    const sr = sw.getBoundingClientRect();
    const knob = sw.querySelector("span").getBoundingClientRect();
    return {
      group: { x: g.x, y: g.y, w: g.width, h: g.height },
      c: c[0].getBoundingClientRect ? { x: b0.x, y: b0.y, w: b0.width, h: b0.height } : null,
      c0: { x: b0.x, y: b0.y, w: b0.width, h: b0.height, pressed: c[0].getAttribute("aria-pressed"), bg: getComputedStyle(c[0]).backgroundColor, color: getComputedStyle(c[0]).color, outline: getComputedStyle(c[0]).outline },
      c1: { x: b1.x, y: b1.y, w: b1.width, h: b1.height, pressed: c[1].getAttribute("aria-pressed"), bg: getComputedStyle(c[1]).backgroundColor, color: getComputedStyle(c[1]).color, outline: getComputedStyle(c[1]).outline },
      groupBg: getComputedStyle(group).backgroundColor,
      groupBorder: getComputedStyle(group).borderColor,
      groupRadius: getComputedStyle(group).borderRadius,
      btnRadius: getComputedStyle(c[0]).borderRadius,
      switch: { x: sr.x, y: sr.y, w: sr.width, h: sr.height },
      knob: { x: knob.x, y: knob.y, w: knob.width, h: knob.height },
      activeIs: document.activeElement === c[0] ? "C" : document.activeElement === c[1] ? "F" : "other",
    };
  })()`);
  console.log(`\n=== ${theme} ===`);
  console.log(JSON.stringify(geo, null, 1));

  await crop(path.join(OUT, `units-${theme}.png`), { x: geo.group.x - 6, y: geo.group.y - 6, width: geo.group.w + 12, height: geo.group.h + 12 }, 6);
  await crop(path.join(OUT, `switch-${theme}.png`), { x: geo.switch.x - 8, y: geo.switch.y - 8, width: geo.switch.w + 16, height: geo.switch.h + 16 }, 6);
}
await cdp.eval(`document.documentElement.dataset.theme='dark'; document.documentElement.style.removeProperty('--bg-gradient');`);
await cdp.key("Escape", "Escape", 27);
await sleep(300);
await cdp.close();
