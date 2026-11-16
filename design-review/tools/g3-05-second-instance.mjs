// Second-instance focus test against the RUNNING instance.
// Uses the installed binary with NO --user-data-dir so the single-instance lock
// is the one the running window already holds.
import { attach, sleep } from "./cdp.mjs";
import { execFileSync } from "node:child_process";

const cdp = await attach(9225);

const ps = () => execFileSync("bash", ["-lc", "ps -eo pid,ppid,etimes,args | grep '/opt/Truecast/truecast' | grep -v grep || true"]).toString().trim().split("\n").filter(Boolean);

console.log("=== processes before ===");
console.log(ps().join("\n"));

console.log("\n=== renderer focus before ===", await cdp.eval(`document.hasFocus()`));

// Minimize the running window through the app's own control, so the state is
// the real one and not an X11-only trick.
await cdp.eval(`document.querySelector('button[aria-label="Minimize window"]').click()`);
await sleep(1500);
console.log("after minimize: hasFocus =", await cdp.eval(`document.hasFocus()`));
console.log("visibilityState =", await cdp.eval(`document.visibilityState`));

// Launch the second instance.
console.log("\n=== launching second instance ===");
const started = Date.now();
try {
  const out = execFileSync("bash", ["-lc", "timeout 25 /opt/Truecast/truecast 2>&1; echo EXIT=$?"], { timeout: 40000 }).toString();
  console.log(out.trim());
  console.log("elapsed ms:", Date.now() - started);
} catch (e) {
  console.log("spawn error:", e.message);
}

await sleep(2000);
console.log("\n=== processes after ===");
console.log(ps().join("\n"));
console.log("\n=== renderer focus after ===", await cdp.eval(`document.hasFocus()`));
console.log("visibilityState =", await cdp.eval(`document.visibilityState`));

await cdp.close();
