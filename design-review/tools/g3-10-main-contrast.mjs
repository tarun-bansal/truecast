import { attach, sleep } from "./cdp.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
const TMP = "/tmp/truecast-g3b";
fs.mkdirSync(TMP, { recursive: true });
const GRADIENTS = {
  dark: "linear-gradient(180deg, #0b1220 0%, #1e293b 100%)",
  light: "linear-gradient(180deg, #bfdbfe 0%, #60a5fa 100%)",
};
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return +(((Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05)).toFixed(2)); };
const comp = (fg, bg, a) => ({ r: Math.round(fg.r*a + bg.r*(1-a)), g: Math.round(fg.g*a + bg.g*(1-a)), b: Math.round(fg.b*a + bg.b*(1-a)) });
function parseColor(c) { const m = c.match(/rgba?\(([^)]+)\)/); const [r,g,b,a=1] = m[1].split(",").map(Number); return {r,g,b,a}; }
function pixel(file, x, y) { const out = execFileSync("python3", ["/home/tarun-bansal/dev/weather-app/e2e/pixel.py", file, String(Math.round(x)), String(Math.round(y))]).toString().trim(); const [r,g,b] = out.split(",").map(Number); return {r,g,b}; }

const cdp = await attach(9225);
const shot = async (f) => { const r = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true }); fs.writeFileSync(f, Buffer.from(r.data, "base64")); };

await cdp.eval(`document.documentElement.style.fontSize = ""`);
await sleep(300);
await cdp.eval(`(() => { const s=document.createElement('style'); s.id='nt'; s.textContent='*{transition:none !important;animation:none !important;}'; document.head.appendChild(s); })()`);

for (const theme of ["dark", "light"]) {
  await cdp.eval(`document.documentElement.dataset.theme=${JSON.stringify(theme)}; document.documentElement.style.setProperty('--bg-gradient',${JSON.stringify(GRADIENTS[theme])});`);
  await sleep(600);
  const runs = await cdp.eval(`(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let el = walker.currentNode;
    while (el) {
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE) continue;
        const text = node.textContent.trim();
        if (!text) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom < 40 || rect.top > window.innerHeight) continue; // visible viewport only
        const cs = getComputedStyle(el);
        out.push({ text: text.slice(0,28), color: cs.color, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight,10)||400, opacity: parseFloat(cs.opacity), x: rect.x + rect.width/2, y: rect.y + rect.height/2 });
      }
      el = walker.nextNode();
    }
    return out;
  })()`);
  const bgFile = path.join(TMP, `main-bg-${theme}.png`);
  await cdp.eval(`(() => { const s=document.createElement('style'); s.id='bg'; s.textContent='*{color:transparent !important;-webkit-text-fill-color:transparent !important;text-shadow:none !important;}'; document.head.appendChild(s); })()`);
  await sleep(250);
  await shot(bgFile);
  await cdp.eval(`document.getElementById('bg')?.remove()`);
  const rows = runs.map((run) => {
    const bg = pixel(bgFile, Math.min(run.x, 999), Math.min(run.y, 699));
    const fg = parseColor(run.color);
    const eff = comp(fg, bg, fg.a * run.opacity);
    const ratio = contrast(eff, bg);
    const req = run.size >= 24 || (run.size >= 18.66 && run.weight >= 700) ? 3 : 4.5;
    return { ...run, bg, eff, ratio, req, pass: ratio >= req };
  }).sort((a,b) => a.ratio - b.ratio);
  console.log(`\n=== MAIN APP ${theme}: ${rows.length} visible text runs, worst first ===`);
  for (const r of rows.slice(0, 14)) {
    console.log(`${r.text.padEnd(28).slice(0,28)} ${String(r.size).padEnd(5)} ${String(r.weight).padEnd(3)} bg=rgb(${r.bg.r},${r.bg.g},${r.bg.b}) ratio=${r.ratio} req=${r.req} ${r.pass ? "PASS" : "FAIL"}`);
  }
  const fails = rows.filter(r => !r.pass);
  console.log(`fails: ${fails.length} of ${rows.length}; worst = ${rows[0].ratio}:1 ("${rows[0].text}")`);
}
await cdp.eval(`document.documentElement.dataset.theme='dark'; document.documentElement.style.removeProperty('--bg-gradient'); document.getElementById('nt')?.remove();`);

console.log("\n=== HIT TARGETS (all interactive elements, visible) ===");
const targets = await cdp.eval(`(() => {
  const els = [...document.querySelectorAll('button, a[href], input, [role="switch"], [role="option"], [tabindex]:not([tabindex="-1"])')];
  return els.map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { label: (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().replace(/\\s+/g,' ').slice(0,38), w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName, vis: r.width>0 && r.height>0 };
  }).filter(t => t.vis);
})()`);
const small = targets.filter(t => t.w < 24 || t.h < 24);
console.log("total visible:", targets.length, " under 24px:", small.length);
for (const t of small) console.log(`  ${String(t.w).padStart(3)}x${String(t.h).padEnd(3)} ${t.tag} "${t.label}"`);

await cdp.close();
