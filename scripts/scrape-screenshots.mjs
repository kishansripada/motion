#!/usr/bin/env node
/**
 * scrape-screenshots — capture viewport screenshots of arbitrary public URLs
 * via headless Chrome over CDP. Same approach as capture-frame.mjs (no deps).
 *
 * Usage:
 *   node scripts/scrape-screenshots.mjs <out-dir> <url> <filename> [<url> <filename>]...
 *
 * Example:
 *   node scripts/scrape-screenshots.mjs ./out https://apollo.io apollo.png
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const CHROME_CANDIDATES = [
   process.env.CHROME_PATH,
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
   "/Applications/Chromium.app/Contents/MacOS/Chromium",
   "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
].filter(Boolean);

const WIDTH = 1440;
const HEIGHT = 900;
const NAV_TIMEOUT = 25_000;
const SETTLE_DELAY = 4_500;
const POST_DISMISS_DELAY = 1_500;

const argv = process.argv.slice(2);
if (argv.length < 3 || (argv.length - 1) % 2 !== 0) {
   console.error("Usage: scrape-screenshots <out-dir> <url> <filename> [<url> <filename>]...");
   process.exit(2);
}

const outDir = resolve(argv[0]);
mkdirSync(outDir, { recursive: true });

const tasks = [];
for (let i = 1; i < argv.length; i += 2) tasks.push({ url: argv[i], filename: argv[i + 1] });

const chromePath = CHROME_CANDIDATES.find(Boolean);
if (!chromePath) {
   console.error("Could not find Chrome. Set CHROME_PATH=/path/to/chrome.");
   process.exit(1);
}

function wait(ms) {
   return new Promise((res) => setTimeout(res, ms));
}

function withTimeout(promise, ms, label) {
   let timer;
   const timeout = new Promise((_, rej) => {
      timer = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
   });
   return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function send(ws, method, params = {}) {
   const id = send.nextId++;
   ws.send(JSON.stringify({ id, method, params }));
   return new Promise((resolve, reject) => {
      send.pending.set(id, { resolve, reject });
   });
}
send.nextId = 1;
send.pending = new Map();

async function bootChrome(width, height) {
   const userDataDir = resolve(tmpdir(), `screenshot-scrape-${process.pid}-${Date.now()}`);
   const chrome = spawn(
      chromePath,
      [
         "--headless=new",
         "--disable-gpu",
         "--no-first-run",
         "--no-default-browser-check",
         "--hide-scrollbars",
         "--disable-blink-features=AutomationControlled",
         `--user-data-dir=${userDataDir}`,
         "--remote-debugging-port=0",
         `--window-size=${width},${height}`,
         "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
   );

   let stderr = "";
   const browserWsUrl = await withTimeout(
      new Promise((resolve, reject) => {
         chrome.stderr.on("data", (buf) => {
            stderr += String(buf);
            const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) resolve(match[1]);
         });
         chrome.on("error", reject);
         chrome.on("exit", (code) => {
            if (code != null && code !== 0) reject(new Error(`Chrome exited early with ${code}`));
         });
      }),
      8000,
      "Chrome startup",
   );

   const targetListUrl = browserWsUrl
      .replace(/^ws:\/\//, "http://")
      .replace(/\/devtools\/browser\/.*$/, "/json/list");
   const targets = await withTimeout(
      (async () => {
         for (;;) {
            try {
               const res = await fetch(targetListUrl);
               if (res.ok) return await res.json();
            } catch {
               /* still starting */
            }
            await wait(50);
         }
      })(),
      8000,
      "DevTools target list",
   );
   const pageTarget = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
   if (!pageTarget) throw new Error("No page target found in Chrome DevTools");

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
   await withTimeout(
      new Promise((res, rej) => {
         ws.onopen = res;
         ws.onerror = rej;
      }),
      8000,
      "DevTools websocket",
   );

   await send(ws, "Page.enable");
   await send(ws, "Runtime.enable");
   await send(ws, "Network.enable");
   await send(ws, "Network.setUserAgentOverride", {
      userAgent:
         "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
   });
   await send(ws, "Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
   });

   return {
      ws,
      dispose() {
         try {
            ws.close();
         } catch {}
         chrome.kill();
         try {
            rmSync(userDataDir, { recursive: true, force: true });
         } catch {}
      },
   };
}

// Fire-and-forget JS to dismiss common cookie / consent overlays + hide
// chat-widget / welcome-popup chrome via CSS. Best-effort. Run multiple
// times because some overlays mount late.
const DISMISS_OVERLAYS_JS = `
(() => {
   // 1) Try to click well-known accept/dismiss buttons by id (works on
   //    OneTrust, CookieYes, Cookiebot, Ketch, Axeptio, Quantcast, etc.)
   const KNOWN_IDS = [
      "#onetrust-accept-btn-handler",
      "#onetrust-reject-all-handler",
      ".onetrust-close-btn-handler",
      ".cky-btn-accept",
      ".cky-btn-reject",
      "#CybotCookiebotDialogBodyLevelButtonAccept",
      "#CybotCookiebotDialogBodyButtonAccept",
      "#CybotCookiebotDialogBodyButtonDecline",
      "#truste-consent-button",
      ".ot-pc-refuse-all-handler",
      ".qc-cmp2-summary-buttons button",
      "[data-testid='uc-accept-all-button']",
      "[data-cky-tag='accept-button']",
      ".axeptio_btn_acceptAll",
      "#axeptio_overlay button",
      "#hs-eu-confirmation-button",
      "#hs-eu-decline-button",
      ".cc-allow",
      ".cc-dismiss",
   ];
   for (const sel of KNOWN_IDS) {
      document.querySelectorAll(sel).forEach((el) => { try { el.click(); } catch {} });
   }
   // 2) Heuristic: button text matches accept/dismiss verbs.
   const acceptRe = /^(accept|agree|got it|ok|allow|i understand|yes,? agree|continue|allow all|accept all|reject all|reject|deny|close|x|dismiss|no thanks?|no, thanks?)$/i;
   const candidates = document.querySelectorAll('button, a[role="button"], [role="button"]');
   for (const el of candidates) {
      const txt = (el.innerText || el.textContent || "").trim();
      if (acceptRe.test(txt)) {
         try { el.click(); } catch {}
      }
   }
   // 3) Hide via CSS as a fallback for things we can't click cleanly.
   const STYLE_ID = "__motion_scrape_killbox__";
   if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = \`
         #onetrust-banner-sdk, #onetrust-consent-sdk, .onetrust-pc-dark-filter,
         .ot-sdk-container, #CybotCookiebotDialog, #CybotCookiebotDialogBody,
         .cky-overlay, .cky-consent-container, .cky-consent-bar,
         #ketch-banner, [id^="ketch-"][role="dialog"],
         #axeptio_overlay, #axeptio_main_button, .axeptio_widget,
         #truste-consent-track, .truste_box_overlay, .truste_overlay,
         .qc-cmp2-container, .qc-cmp2-summary-info,
         #drift-widget, #drift-frame-controller, .drift-widget,
         #intercom-container, .intercom-launcher, .intercom-launcher-frame,
         [id^="hubspot-messages"], #hubspot-messages-iframe-container, #hubspot-messages-iframe,
         #hs-eu-cookie-confirmation, .hs-cookie-notification-position-bottom,
         #__cmpwrapper, #cmpbox, #cmpwrapper,
         .cc-window, .cc-banner, .cookie-banner, .cookie-notice, .cookie-policy,
         [class*="CookieConsent"], [class*="cookie-consent"],
         div[role="dialog"][aria-label*="cookie" i], div[role="dialog"][aria-label*="consent" i],
         div[class*="welcome" i][class*="popup" i],
         div[class*="popup" i][role="dialog"]
         { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
      \`;
      document.head.appendChild(s);
   }
})();
`;

async function captureOne(ws, { url, filename }) {
   console.log(`→ ${url}  →  ${filename}`);
   try {
      await send(ws, "Page.navigate", { url });
      // Wait for load event or timeout — we don't need full network idle.
      await withTimeout(
         new Promise((resolve) => {
            const handler = (event) => {
               const msg = JSON.parse(event.data);
               if (msg.method === "Page.loadEventFired") {
                  ws.removeEventListener("message", handler);
                  resolve();
               }
            };
            ws.addEventListener("message", handler);
         }),
         NAV_TIMEOUT,
         `Navigation to ${url}`,
      ).catch((err) => {
         console.warn(`   ! navigation timed out, screenshotting anyway: ${err.message}`);
      });
      await wait(SETTLE_DELAY);
      // Two dismiss passes — second catches popups that mount after the
      // initial settle (welcome modals, chat widgets, late consent banners).
      try { await send(ws, "Runtime.evaluate", { expression: DISMISS_OVERLAYS_JS }); } catch {}
      await wait(POST_DISMISS_DELAY);
      try { await send(ws, "Runtime.evaluate", { expression: DISMISS_OVERLAYS_JS }); } catch {}
      await wait(500);
      try {
         await send(ws, "Runtime.evaluate", {
            expression: "window.scrollTo(0, 0); document.documentElement.scrollTop = 0;",
         });
      } catch {}
      const result = await send(ws, "Page.captureScreenshot", {
         format: "png",
         clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
      });
      const buf = Buffer.from(result.data, "base64");
      const outPath = resolve(outDir, filename);
      writeFileSync(outPath, buf);
      console.log(`   ✓ ${outPath}  (${buf.length.toLocaleString()} bytes)`);
   } catch (err) {
      console.error(`   ✗ FAILED: ${err.message}`);
   }
}

(async () => {
   const browser = await bootChrome(WIDTH, HEIGHT);
   try {
      for (const task of tasks) {
         await captureOne(browser.ws, task);
      }
   } finally {
      browser.dispose();
   }
})();
