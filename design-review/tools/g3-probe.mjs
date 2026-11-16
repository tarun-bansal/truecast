import { attach } from "./cdp.mjs";
const cdp = await attach(9225);
const r = await cdp.eval(`(() => {
  const d = document.querySelector('[role="dialog"]');
  if (!d) return "no dialog";
  const a = d.querySelector('[role="switch"]');
  const b = d.querySelector('[role="switch"][aria-label="Reduce motion"]');
  return { a: !!a, b: !!b, html: a ? a.outerHTML.slice(0, 200) : null };
})()`);
console.log(JSON.stringify(r, null, 1));
await cdp.close();
