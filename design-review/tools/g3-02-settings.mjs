import { attach, sleep } from "./cdp.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "/home/tarun-bansal/dev/weather-app/design-review/evidence-gate3";
mkdirSync(OUT, { recursive: true });

const cdp = await attach(9225);
const log = [];
const say = (...a) => { const s = a.join(" "); log.push(s); console.log(s); };

async function shot(name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
}

const state = () => cdp.eval(`(() => ({
  dialogs: [...document.querySelectorAll('[role="dialog"]')].map(d => ({
    modal: d.getAttribute("aria-modal"),
    label: d.getAttribute("aria-labelledby"),
    title: d.querySelector("h2")?.innerText ?? null,
    visible: d.offsetParent !== null || getComputedStyle(d).display !== "none",
  })),
  active: (() => {
    const a = document.activeElement;
    if (!a) return null;
    return {
      tag: a.tagName,
      text: (a.innerText || a.getAttribute("aria-label") || "").slice(0, 60),
      cls: (a.className && a.className.baseVal !== undefined ? a.className.baseVal : String(a.className)).slice(0, 80),
      isSettingsTrigger: a.hasAttribute?.("data-settings-trigger"),
      role: a.getAttribute?.("role"),
    };
  })(),
  searchOpen: !!document.querySelector('[role="dialog"][aria-labelledby*="search" i]'),
}))()`);

say("=== T1: baseline dialogs ===");
say(JSON.stringify(await state()));

say("\n=== T2: Ctrl+, opens settings ===");
await cdp.key(",", "Comma", 188, 2);
await sleep(600);
say(JSON.stringify(await state(), null, 1));
await shot("02-settings-ctrl-comma");

say("\n=== T3: gear opens settings (close first) ===");
await cdp.key("Escape", "Escape", 27);
await sleep(400);
say("after escape: " + JSON.stringify(await state()));
await cdp.eval(`document.querySelector("[data-settings-trigger]").click()`);
await sleep(600);
say("after gear: " + JSON.stringify(await state(), null, 1));

say("\n=== T4: Escape closes exactly one dialog ===");
await cdp.key("Escape", "Escape", 27);
await sleep(500);
say("after escape: " + JSON.stringify(await state(), null, 1));

say("\n=== T5: focus return to trigger after gear-open/close ===");
await cdp.eval(`document.querySelector("[data-settings-trigger]").click()`);
await sleep(500);
say("open: " + JSON.stringify(await state()));
await cdp.key("Escape", "Escape", 27);
await sleep(500);
say("closed: " + JSON.stringify(await state()));

say("\n=== T6: focus return to trigger after Ctrl+, open/close ===");
await cdp.key(",", "Comma", 188, 2);
await sleep(500);
say("open: " + JSON.stringify(await state()));
await cdp.key("Escape", "Escape", 27);
await sleep(500);
say("closed: " + JSON.stringify(await state()));

say("\n=== T7: search and settings are mutually exclusive ===");
await cdp.key(",", "Comma", 188, 2);
await sleep(400);
await cdp.key("f", "KeyF", 70, 2);
await sleep(600);
say("after Ctrl+F while settings open: " + JSON.stringify(await state(), null, 1));
await cdp.key("Escape", "Escape", 27);
await sleep(400);
await cdp.key(",", "Comma", 188, 2);
await sleep(600);
say("after Ctrl+, while search open: " + JSON.stringify(await state(), null, 1));
await cdp.key("Escape", "Escape", 27);
await sleep(400);

say("\n=== T8: Settings content dump ===");
await cdp.key(",", "Comma", 188, 2);
await sleep(600);
const content = await cdp.eval(`(() => {
  const d = document.querySelector('[role="dialog"]');
  if (!d) return null;
  const out = [];
  d.querySelectorAll('*').forEach(el => {
    if (el.children.length === 0) {
      const t = (el.textContent||"").trim();
      if (t) out.push({ tag: el.tagName, role: el.getAttribute("role"), label: el.getAttribute("aria-label"), pressed: el.getAttribute("aria-pressed"), checked: el.getAttribute("aria-checked"), text: t.slice(0,90) });
    }
  });
  return { html_head: d.innerHTML.slice(0, 400), leaves: out, text: d.innerText };
})()`);
say(JSON.stringify(content, null, 1));

say("\n=== T9: tab order inside settings ===");
const order = [];
for (let i = 0; i < 12; i++) {
  const a = await cdp.eval(`(() => { const a = document.activeElement; return { tag: a?.tagName, text: (a?.innerText||a?.getAttribute?.("aria-label")||"").slice(0,40), role: a?.getAttribute?.("role") }; })()`);
  order.push(`${i}: ${a.tag} "${a.text}" role=${a.role}`);
  await cdp.key("Tab", "Tab", 9);
  await sleep(120);
}
say(order.join("\n"));

await cdp.key("Escape", "Escape", 27);
await sleep(400);

writeFileSync(`${OUT}/settings-log.txt`, log.join("\n"));
await cdp.close();
