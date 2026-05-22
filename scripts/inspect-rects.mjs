#!/usr/bin/env node
/**
 * Headless probe: opens the autosana run page, lets it boot, then reads
 * getBoundingClientRect() for the elements we care about and prints JSON.
 */
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rmSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ORIGIN = process.env.MOTION_ORIGIN ?? "http://localhost:5174";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const id = process.argv[2] ?? "10-autosana-intro";
const t = Number(process.argv[3] ?? "12.4");
const url = `${ORIGIN}/capture.html?id=${encodeURIComponent(id)}&t=${t.toFixed(3)}&chromeless=1&w=1440&h=900`;

const userDataDir = resolve(tmpdir(), `motion-probe-${process.pid}-${Date.now()}`);

function send(ws, method, params = {}) {
   const id = send.nextId++;
   ws.send(JSON.stringify({ id, method, params }));
   return new Promise((resolve, reject) => {
      send.pending.set(id, { resolve, reject });
   });
}
send.nextId = 1;
send.pending = new Map();

function wait(ms) {
   return new Promise((r) => setTimeout(r, ms));
}

async function main() {
   const chrome = spawn(
      CHROME,
      [
         "--headless=new",
         "--disable-gpu",
         "--no-first-run",
         "--no-default-browser-check",
         `--user-data-dir=${userDataDir}`,
         "--remote-debugging-port=0",
         "--window-size=1440,900",
         "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
   );

   let stderr = "";
   const browserWs = await new Promise((resolve, reject) => {
      chrome.stderr.on("data", (buf) => {
         stderr += String(buf);
         const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
         if (m) resolve(m[1]);
      });
      chrome.on("error", reject);
   });

   const listUrl = browserWs.replace(/^ws:\/\//, "http://").replace(/\/devtools\/browser\/.*$/, "/json/list");
   let targets;
   for (; ;) {
      try {
         const res = await fetch(listUrl);
         if (res.ok) {
            targets = await res.json();
            break;
         }
      } catch {
         /* still booting */
      }
      await wait(50);
   }
   const pageTarget = targets.find((tg) => tg.type === "page" && tg.webSocketDebuggerUrl);
   const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
   ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && send.pending.has(msg.id)) {
         const { resolve, reject } = send.pending.get(msg.id);
         send.pending.delete(msg.id);
         if (msg.error) reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
         else resolve(msg.result);
      }
   };
   await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
   });

   await send(ws, "Page.enable");
   await send(ws, "Runtime.enable");
   await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
   });
   await send(ws, "Page.navigate", { url });

   for (; ;) {
      const r = await send(ws, "Runtime.evaluate", { expression: "document.title", returnByValue: true });
      const title = String(r.result?.value ?? "");
      if (title.startsWith("READY |")) break;
      if (title.startsWith("ERROR |")) throw new Error(title);
      await wait(60);
   }

   const expression = `(() => {
      const iframe = document.querySelector('iframe');
      const w = iframe.contentWindow;
      const debug = w.__autosanaDebug ?? null;
      return JSON.stringify({ debug, time: w.lfTimeline?.time?.() ?? null }, null, 2);
   })()`;

   const probe = await send(ws, "Runtime.evaluate", { expression, returnByValue: true });
   console.log(probe.result?.value ?? probe.result);

   ws.close();
   chrome.kill();
}

main()
   .catch((err) => {
      console.error(err.stack || err.message || err);
      process.exitCode = 1;
   })
   .finally(() => {
      try {
         rmSync(userDataDir, { recursive: true, force: true });
      } catch {
         /* noop */
      }
   });
