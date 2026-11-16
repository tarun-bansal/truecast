import { attach, sleep } from "./cdp.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
mkdirSync(OUT, { recursive: true });

const cdp = await attach(9225);

async function shot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
  return `${OUT}/${name}.png`;
}

const info = await cdp.eval(`(() => {
  const cs = getComputedStyle(document.documentElement);
  return {
    title: document.title,
    url: location.href,
    inner: [window.innerWidth, window.innerHeight],
    outer: [window.outerWidth, window.outerHeight],
    dpr: window.devicePixelRatio,
    theme: document.documentElement.getAttribute("data-theme"),
    colorScheme: cs.colorScheme,
    bodyText: document.body.innerText.slice(0, 1200),
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    lsKeys: Object.keys(localStorage),
  };
})()`);

console.log(JSON.stringify(info, null, 2));
console.log("shot:", await shot("01-baseline"));

await cdp.close();
