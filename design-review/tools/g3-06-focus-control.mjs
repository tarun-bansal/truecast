import { attach, sleep } from "./cdp.mjs";
import { execFileSync } from "node:child_process";

const cdp = await attach(9225);
const hasFocus = () => cdp.eval(`document.hasFocus()`);
const vis = () => cdp.eval(`document.visibilityState`);

console.log("=== CONTROL: restore through the app's own maximize button ===");
console.log("before: focus=", await hasFocus(), "vis=", await vis());
await cdp.eval(`document.querySelector('button[aria-label="Minimize window"]').click()`);
await sleep(1200);
console.log("minimized: focus=", await hasFocus(), "vis=", await vis());
await cdp.eval(`document.querySelector('button[aria-label="Maximize window"]').click()`);
await sleep(1500);
console.log("maximized (app's own control): focus=", await hasFocus(), "vis=", await vis());
// Put it back to 1000x700.
await cdp.eval(`document.querySelector('button[aria-label="Restore window"]').click()`);
await sleep(1500);
console.log("restored: focus=", await hasFocus(), "vis=", await vis());

console.log("\n=== CONTROL: does clicking inside the window give focus back? ===");
await cdp.eval(`document.querySelector('main')?.click()`);
await sleep(300);
console.log("after a renderer click: focus=", await hasFocus(), "vis=", await vis());

console.log("\n=== Second instance again, from a visible (not minimized) window ===");
await cdp.eval(`document.querySelector('button[aria-label="Minimize window"]').click()`);
await sleep(1200);
console.log("minimized: focus=", await hasFocus(), "vis=", await vis());
const out = execFileSync("bash", ["-lc", "timeout 25 /opt/Truecast/truecast >/dev/null 2>&1; echo EXIT=$?"]).toString().trim();
await sleep(2000);
console.log("second instance:", out);
console.log("after: focus=", await hasFocus(), "vis=", await vis());
console.log("isMaximized via app:", await cdp.eval(`window.electronAPI.isMaximized()`));
console.log("outer size:", await cdp.eval(`[window.outerWidth, window.outerHeight]`));

await cdp.close();
