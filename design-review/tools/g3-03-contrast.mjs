// Contrast measurement against the RUNNING installed build (CDP :9225).
// Mirrors e2e/settings-contrast.mjs but attaches instead of launching.
import { attach, sleep } from "./cdp.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
const TMP = "/tmp/truecast-g3";
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const GRADIENTS = {
  dark: "linear-gradient(180deg, #0b1220 0%, #1e293b 100%)",
  light: "linear-gradient(180deg, #bfdbfe 0%, #60a5fa 100%)",
};

const failures = [];

function pixel(file, x, y) {
  const out = execFileSync("python3", [
    path.resolve("/home/tarun-bansal/dev/weather-app/e2e/pixel.py"),
    file,
    String(Math.round(x)),
    String(Math.round(y)),
  ]).toString().trim();
  const [r, g, b] = out.split(",").map(Number);
  return { r, g, b };
}
const lum = (c) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const contrast = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
};
const comp = (fg, bg, alpha) => ({
  r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
  g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
  b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
});
function parseColor(color) {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error("unparsable color " + color);
  const [r, g, b, a = 1] = m[1].split(",").map(Number);
  return { r, g, b, a };
}

const cdp = await attach(9225);
await cdp.eval(`document.querySelector("[data-settings-trigger]").click()`);
await sleep(700);
if (!(await cdp.eval(`!!document.querySelector('[role="dialog"]')`))) throw new Error("sheet did not open");
await cdp.eval(`(() => { const s = document.createElement('style'); s.id='audit-no-transition'; s.textContent='*{transition:none !important;animation:none !important;}'; document.head.appendChild(s); })()`);

const shot = async (file) => {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
};
const pngWidth = (file) =>
  Number(execFileSync("python3", ["-c", "import sys; from PIL import Image; print(Image.open(sys.argv[1]).size[0])", file]).toString().trim());

for (const theme of ["dark", "light"]) {
  await cdp.eval(
    `document.documentElement.dataset.theme = ${JSON.stringify(theme)}; ` +
      `document.documentElement.style.setProperty('--bg-gradient', ${JSON.stringify(GRADIENTS[theme])});`,
  );
  await sleep(600);

  const runs = await cdp.eval(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const out = [];
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_ELEMENT);
    let el = walker.currentNode;
    while (el) {
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE) continue;
        const text = node.textContent.trim();
        if (!text) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const cs = getComputedStyle(el);
        out.push({ text: text.slice(0,30), color: cs.color, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight,10)||400, opacity: parseFloat(cs.opacity), x: rect.x+rect.width/2, y: rect.y+rect.height/2 });
      }
      el = walker.nextNode();
    }
    return out;
  })()`);

  const evidenceFile = path.join(OUT, `settings-sheet-${theme}.png`);
  const bgFile = path.join(TMP, `bg-${theme}.png`);
  await shot(evidenceFile);
  await cdp.eval(`(() => { const s = document.createElement('style'); s.id='audit-bg'; s.textContent='*{color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important;}'; document.head.appendChild(s); })()`);
  await sleep(250);
  await shot(bgFile);
  await cdp.eval(`document.getElementById('audit-bg')?.remove()`);

  console.log(`\n=== ${theme} — ${runs.length} text runs ===`);
  console.log("text                          size  wt  bg              eff             ratio  req");
  for (const run of runs) {
    const bg = pixel(bgFile, run.x, run.y);
    const fg = parseColor(run.color);
    const effective = comp(fg, bg, fg.a * run.opacity);
    const ratio = contrast(effective, bg);
    const required = run.size >= 24 || (run.size >= 18.66 && run.weight >= 700) ? 3 : 4.5;
    const pass = ratio >= required;
    if (!pass) failures.push(`${theme}: "${run.text}" ${ratio} < ${required}`);
    console.log(
      `${run.text.padEnd(30).slice(0,30)} ${String(run.size).padEnd(5)} ${String(run.weight).padEnd(3)} ` +
      `rgb(${bg.r},${bg.g},${bg.b})`.padEnd(16) + `rgb(${effective.r},${effective.g},${effective.b})`.padEnd(16) +
      `${String(ratio).padEnd(6)} ${required}  ${pass ? "PASS" : "FAIL"}`);
  }

  // Motion switch
  const sw = await cdp.eval(`(() => {
    const el = document.querySelector('[role="switch"][aria-label="Reduce motion"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, vw: window.innerWidth };
  })()`);
  console.log(`\n=== ${theme} — motion switch knob vs track (bar 3:1) ===  rect=${JSON.stringify(sw)}`);
  for (const wantOn of [false, true]) {
    const isOn = (await cdp.eval(`document.querySelector('[role="switch"][aria-label="Reduce motion"]').getAttribute('aria-checked')`)) === "true";
    if (isOn !== wantOn) {
      await cdp.eval(`document.querySelector('[role="switch"][aria-label="Reduce motion"]').click()`);
      await sleep(500);
    }
    const f = path.join(TMP, `switch-${theme}-${wantOn ? "on" : "off"}.png`);
    await shot(f);
    const scale = pngWidth(f) / sw.vw;
    const at = (cx, cy) => pixel(f, cx * scale, cy * scale);
    const knob = at(sw.x + (wantOn ? 32 : 12), sw.y + 12);
    const track = at(sw.x + (wantOn ? 6 : 38), sw.y + 12);
    const ratio = contrast(knob, track);
    const pass = ratio >= 3;
    if (!pass) failures.push(`${theme}: switch ${wantOn ? "on" : "off"} ${ratio} < 3`);
    console.log(`${(wantOn?"on":"off").padEnd(5)} knob rgb(${knob.r},${knob.g},${knob.b}) track rgb(${track.r},${track.g},${track.b}) ratio ${ratio} req 3 ${pass ? "PASS" : "FAIL"}`);
  }
  // restore motion off
  const leftOn = (await cdp.eval(`document.querySelector('[role="switch"][aria-label="Reduce motion"]').getAttribute('aria-checked')`)) === "true";
  if (leftOn) { await cdp.eval(`document.querySelector('[role="switch"][aria-label="Reduce motion"]').click()`); await sleep(400); }
}

// restore the real theme
await cdp.eval(`document.documentElement.dataset.theme='dark'; document.documentElement.style.removeProperty('--bg-gradient');`);
await cdp.key("Escape", "Escape", 27);
await sleep(400);
console.log(`\n${failures.length ? failures.length + " failing:\n" + failures.join("\n") : "all pass"}`);
await cdp.close();
