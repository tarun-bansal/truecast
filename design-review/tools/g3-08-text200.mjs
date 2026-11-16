import { attach, sleep } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
const cdp = await attach(9225);

async function shot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
}

// Scroll the main region to the 10-day list, at 200% root font size.
await cdp.eval(`document.documentElement.style.fontSize = "32px"`);
await sleep(600);
await cdp.eval(`(() => { const s = document.querySelector('.overflow-y-auto'); s.scrollTop = 520; })()`);
await sleep(400);
await shot("text-200-10day");

const probe = await cdp.eval(`(() => {
  const row = document.querySelector('.space-y-1 > div');
  const cells = [...row.children].map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: String(el.className).slice(0,50), w: Math.round(r.width), x: Math.round(r.x), text: (el.textContent||"").trim().slice(0,12) };
  });
  const list = document.querySelector('.space-y-1');
  const r = row.getBoundingClientRect();
  const lr = list.getBoundingClientRect();
  return {
    rowRect: { x: Math.round(r.x), w: Math.round(r.width), scrollW: row.scrollWidth, clientW: row.clientWidth },
    listRect: { x: Math.round(lr.x), w: Math.round(lr.width), scrollW: list.scrollWidth, clientW: list.clientWidth },
    cells,
    rowOverflowHidden: getComputedStyle(row).overflow,
    lastRowText: [...document.querySelectorAll('.space-y-1 > div')].map(r2 => r2.innerText.replace(/\\n/g,'|')).slice(0,3),
  };
})()`);
console.log(JSON.stringify(probe, null, 1));

// Now the same at normal text size for comparison.
await cdp.eval(`document.documentElement.style.fontSize = ""`);
await sleep(500);
const normal = await cdp.eval(`(() => {
  const row = document.querySelector('.space-y-1 > div');
  return { rowScrollW: row.scrollWidth, rowClientW: row.clientWidth, listScrollW: document.querySelector('.space-y-1').scrollWidth, listClientW: document.querySelector('.space-y-1').clientWidth };
})()`);
console.log("normal:", JSON.stringify(normal));
await shot("text-100-10day");
await cdp.eval(`(() => { const s = document.querySelector('.overflow-y-auto'); s.scrollTop = 0; })()`);
await cdp.close();
