// Attach to the already-running Truecast instance on :9225 and drive it.
// Never launches a second instance.
import { setTimeout as sleep } from "node:timers/promises";

export class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.requests = [];
    this.console = [];
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Network.requestWillBeSent") {
        this.requests.push(message.params.request.url);
      }
      if (message.method === "Runtime.consoleAPICalled") {
        this.console.push({
          type: message.params.type,
          text: message.params.args.map((a) => a.value ?? a.description ?? "").join(" "),
        });
      }
      if (message.method === "Runtime.exceptionThrown") {
        this.console.push({
          type: "exception",
          text: message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text,
        });
      }
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
      }
    });
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  }
  async key(key, code, virtualKeyCode, modifiers = 0) {
    await this.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key,
      code,
      windowsVirtualKeyCode: virtualKeyCode,
      nativeVirtualKeyCode: virtualKeyCode,
      modifiers,
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode: virtualKeyCode,
      nativeVirtualKeyCode: virtualKeyCode,
      modifiers,
    });
  }
  async click(x, y) {
    for (const type of ["mousePressed", "mouseReleased"]) {
      await this.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: "left",
        clickCount: 1,
        buttons: type === "mousePressed" ? 1 : 0,
      });
    }
  }
  close() {
    this.ws.close();
  }
}

export async function attach(port = 9225) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("DOM.enable");
  return cdp;
}

export { sleep };
