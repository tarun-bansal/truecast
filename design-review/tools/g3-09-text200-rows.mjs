import { attach, sleep } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
const cdp = await attach(9225);
async function shot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
}
await cdp.eval(`document.documentElement.style.fontSize = "32px"`);
await sleep(600);
await cdp.eval(`(() => {
  const row = document.querySelector('.space-y-1 > div');
  const scroller = document.querySelector('.overflow-y-auto');
  const r = row.getBoundingClientRect();
  scroller.scrollTop += r.top - 120;
})()`);
await sleep(500);
await shot("text-200-10day-b");
const r = await cdp.eval(`(() => {
  const rows = [...document.querySelectorAll('.space-y-1 > div')].slice(0,3).map(row => {
    const rr = row.getBoundingClientRect();
    const last = row.lastElementChild.getBoundingClientRect();
    return { rowX: Math.round(rr.x), rowRight: Math.round(rr.right), lastCellX: Math.round(last.x), lastCellRight: Math.round(last.right), lastText: row.lastElementChild.textContent.trim(), clipped: last.right > rr.right + 1 };
  });
  const cont = document.querySelector('[class*="col-span-7"]')?.getBoundingClientRect();
  return { rows, containerRight: cont ? Math.round(cont.right) : null };
})()`);
console.log(JSON.stringify(r, null, 1));
await cdp.eval(`document.documentElement.style.fontSize = ""`);
await cdp.close();
