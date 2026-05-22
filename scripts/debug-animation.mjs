#!/usr/bin/env node
// Boots the animation in headless Chrome and prints any console errors / page
// title so we can debug "Frame readiness timed out" failures from the capture
// script. Throws after 8s if no console output collected.
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { rmSync } from "node:fs";

const id = process.argv[2] ?? "14-dex-demo";
const ORIGIN = process.env.MOTION_ORIGIN ?? "http://localhost:5174";
const url = `${ORIGIN}/capture.html?id=${id}&t=0&chromeless=1&w=1920&h=1080`;

const CHROME_PATHS = [
   process.env.CHROME_PATH,
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
   "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);
const chromePath = CHROME_PATHS.find(Boolean);
if (!chromePath) {
   console.error("No chrome found");
   process.exit(1);
}

const userDataDir = resolve(tmpdir(), `dbg-${process.pid}-${Date.now()}`);
const chrome = spawn(
   chromePath,
   [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      "--window-size=1920,1080",
      "about:blank",
   ],
   { stdio: ["ignore", "ignore", "pipe"] },
);

let stderr = "";
const browserWsUrl = await new Promise((res, rej) => {
   chrome.stderr.on("data", (b) => {
      stderr += String(b);
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) res(m[1]);
   });
   setTimeout(() => rej(new Error("chrome boot timeout")), 6000);
});

const targetListUrl = browserWsUrl
   .replace(/^ws:\/\//, "http://")
   .replace(/\/devtools\/browser\/.*$/, "/json/list");
let targets;
for (let tries = 0; tries < 60; tries += 1) {
   const r = await fetch(targetListUrl);
   if (r.ok) {
      targets = await r.json();
      break;
   }
   await new Promise((r) => setTimeout(r, 100));
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;
function send(method, params = {}) {
   const id = nextId++;
   ws.send(JSON.stringify({ id, method, params }));
   return new Promise((res, rej) => pending.set(id, { res, rej }));
}
ws.onmessage = (evt) => {
   const m = JSON.parse(evt.data);
   if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
   } else if (m.method === "Runtime.consoleAPICalled") {
      const args = m.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a)).join(" ");
      console.log(`[console.${m.params.type}] ${args}`);
   } else if (m.method === "Runtime.exceptionThrown") {
      const e = m.params.exceptionDetails;
      console.error(`[exception] ${e.text}: ${e.exception?.description ?? ""}`);
   } else if (m.method === "Page.frameNavigated") {
      console.log(`[nav] ${m.params.frame.url}`);
   }
};
await new Promise((res, rej) => {
   ws.onopen = res;
   ws.onerror = rej;
});

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Page.navigate", { url });

await new Promise((r) => setTimeout(r, 8000));
const t = await send("Runtime.evaluate", {
   expression: "document.title",
   returnByValue: true,
});
console.log(`[title] ${t.result?.value}`);

const frameTitle = await send("Runtime.evaluate", {
   expression:
      "(() => { const f = document.getElementById('capture-frame'); return f && f.contentDocument ? f.contentDocument.title : 'no-frame'; })()",
   returnByValue: true,
});
console.log(`[iframe-title] ${frameTitle.result?.value}`);

const frameError = await send("Runtime.evaluate", {
   expression:
      "(() => { const f = document.getElementById('capture-frame'); if (!f) return 'no-frame'; const w = f.contentWindow; return { lfTimeline: typeof w.lfTimeline, lfSeek: typeof w.lfSeek, ready: w.__LF_CAPTURE_READY }; })()",
   returnByValue: true,
});
console.log(`[iframe-state]`, frameError.result?.value);

ws.close();
chrome.kill();
try {
   rmSync(userDataDir, { recursive: true, force: true });
} catch {}
