#!/usr/bin/env node
/**
 * capture — fast frame capture + velocity inspector for motion animations.
 *
 * One Chrome boot, many seeks. When you ask for >1 frame the script also
 * stitches a labelled contact sheet so you can read the strip in one
 * glance. Velocity discontinuities are extracted from the same browser
 * session the captures used and printed at the end (no second boot).
 *
 * Usage:
 *   # Single frame (legacy form preserved):
 *   npm run capture -- <id> <seconds> [--out path] [--w 1440] [--h 900] [--open]
 *
 *   # Multiple frames → contact sheet:
 *   npm run capture -- <id> 3.7 7.0 11.5 19.5 25.0 29.5
 *
 *   # Sweep within a top-level scene (auto-derives [start,end] from the
 *   # timeline). --every gives a fixed step, --frames gives a fixed count.
 *   npm run capture -- <id> --scene loop --every 0.4
 *   npm run capture -- <id> --scene loop --frames 8
 *
 *   # Sweep within an arbitrary time range:
 *   npm run capture -- <id> --range 22 26 --every 0.5
 *   npm run capture -- <id> --range 22 26 --frames 10
 *
 *   # No times given → midpoint of each top-level scene (cheap "did
 *   # anything obviously break" check). Specify exact times when you
 *   # actually want to verify motion.
 *   npm run capture -- <id>
 *
 *   # Misc:
 *   --no-sheet      keep individual PNGs, skip the stitched contact sheet
 *   --no-inspect    skip the velocity-discontinuity summary
 *   --no-individuals  with a sheet, delete the per-frame PNGs after stitching
 *   --threshold N   velocity drift threshold for the inspector, default 20 (%)
 *   MOTION_ORIGIN=…  override dev server (default http://localhost:5174)
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DEFAULT_ORIGIN = process.env.MOTION_ORIGIN ?? "http://localhost:5174";

const CHROME_CANDIDATES = [
   process.env.CHROME_PATH,
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
   "/Applications/Chromium.app/Contents/MacOS/Chromium",
   "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
].filter(Boolean);

// -----------------------------------------------------------------------
// Argv parsing
// -----------------------------------------------------------------------
function usage(msg) {
   if (msg) console.error(msg);
   console.error(
      [
         "Usage: npm run capture -- <id> [<t1> <t2> ...]",
         "                              [--scene <id> [--every <s> | --frames <n>]]",
         "                              [--range <start> <end> [--every <s> | --frames <n>]]",
         "                              [--out path] [--w 1440] [--h 900] [--open]",
         "                              [--no-sheet] [--no-inspect] [--no-individuals]",
         "                              [--threshold <pct>]",
      ].join("\n"),
   );
   process.exit(1);
}

const argv = process.argv.slice(2);
const id = argv[0];
if (!id || id.startsWith("--")) usage();

const opts = {
   times: [], // explicit floats
   sceneFilter: null, // --scene name
   range: null, // [start, end]
   every: null, // step seconds
   frames: null, // count
   width: 1440,
   height: 900,
   out: null,
   open: false,
   makeSheet: true,
   keepIndividuals: true,
   runInspect: true,
   driftThreshold: 0.2,
};

for (let i = 1; i < argv.length; i++) {
   const a = argv[i];
   if (a === "--w") opts.width = Number(argv[++i]);
   else if (a === "--h") opts.height = Number(argv[++i]);
   else if (a === "--out") opts.out = resolve(process.cwd(), argv[++i]);
   else if (a === "--open") opts.open = true;
   else if (a === "--scene") opts.sceneFilter = argv[++i];
   else if (a === "--every") opts.every = Number(argv[++i]);
   else if (a === "--frames") opts.frames = Number(argv[++i]);
   else if (a === "--range") {
      opts.range = [Number(argv[++i]), Number(argv[++i])];
   } else if (a === "--no-sheet") opts.makeSheet = false;
   else if (a === "--no-individuals") opts.keepIndividuals = false;
   else if (a === "--no-inspect") opts.runInspect = false;
   else if (a === "--threshold") opts.driftThreshold = Number(argv[++i]) / 100;
   else if (Number.isFinite(Number(a))) opts.times.push(Number(a));
   else usage(`Unknown arg: ${a}`);
}

const chromePath = CHROME_CANDIDATES.find(Boolean);
if (!chromePath) {
   console.error("Could not find Chrome. Set CHROME_PATH=/path/to/chrome.");
   process.exit(1);
}

// -----------------------------------------------------------------------
// Tiny utilities
// -----------------------------------------------------------------------
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

function fmtTime(t) {
   return `${t.toFixed(2)}s`;
}

// -----------------------------------------------------------------------
// Chrome session — boot once, reuse for many seeks. The expensive part is
// (a) Chrome startup ~1s and (b) the first navigation that compiles the
// animation module ~1–2s. Subsequent seeks are ~50ms each so a 12-frame
// sweep finishes in ~3s after the initial boot.
// -----------------------------------------------------------------------
async function bootChrome(width, height) {
   const userDataDir = resolve(tmpdir(), `motion-capture-${process.pid}-${Date.now()}`);
   const chrome = spawn(
      chromePath,
      [
         "--headless=new",
         "--disable-gpu",
         "--no-first-run",
         "--no-default-browser-check",
         "--hide-scrollbars",
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
      6000,
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
      6000,
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
      6000,
      "DevTools websocket",
   );

   await send(ws, "Page.enable");
   await send(ws, "Runtime.enable");
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

async function navigateAndBoot(ws, id, width, height, t0) {
   const url =
      `${DEFAULT_ORIGIN}/capture.html?id=${encodeURIComponent(id)}` +
      `&t=${encodeURIComponent(t0.toFixed(3))}&chromeless=1&w=${width}&h=${height}`;
   await send(ws, "Page.navigate", { url });
   await withTimeout(
      (async () => {
         while (true) {
            const result = await send(ws, "Runtime.evaluate", {
               expression: "document.title",
               returnByValue: true,
            });
            const title = String(result.result?.value ?? "");
            if (title.startsWith("READY |")) return;
            if (title.startsWith("ERROR |")) throw new Error(title);
            await wait(60);
         }
      })(),
      15000,
      "Frame readiness",
   );
   return url;
}

async function seekTo(ws, t) {
   // Tells the iframe's animation runtime to pause + seek + render twice.
   // Two RAF ticks give onUpdate-driven state (e.g. three.js cameras) a
   // chance to settle on the new playhead.
   const expr = `
      (async () => {
         const f = document.getElementById('capture-frame');
         const w = f.contentWindow;
         if (!w) throw new Error('iframe gone');
         if (typeof w.lfPause === 'function') w.lfPause();
         const tick = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
         const clamped = typeof w.lfSeek === 'function' ? w.lfSeek(${t}) : ${t};
         const syncVideos = async () => {
            const videos = Array.from(w.document.querySelectorAll('video'));
            await Promise.all(videos.map((video) => new Promise((resolve) => {
               const finish = () => {
                  video.removeEventListener('seeked', finish);
                  video.removeEventListener('loadedmetadata', seek);
                  resolve();
               };
               const seek = () => {
                  const duration = Number.isFinite(video.duration) ? video.duration : clamped;
                  const target = Math.max(0, Math.min(duration, clamped));
                  if (Math.abs(video.currentTime - target) < 0.035 && video.readyState >= 2) {
                     finish();
                     return;
                  }
                  video.pause();
                  video.addEventListener('seeked', finish, { once: true });
                  video.currentTime = target;
                  setTimeout(finish, 1200);
               };
               if (video.readyState >= 1) seek();
               else {
                  video.addEventListener('loadedmetadata', seek, { once: true });
                  video.load();
                  setTimeout(finish, 1200);
               }
            })));
         };
         await tick();
         if (typeof w.lfSeek === 'function') w.lfSeek(clamped);
         await syncVideos();
         await tick();
         document.title = 'READY | ' + (w.lfAnimation?.id ?? 'anim') + ' @ ' + clamped.toFixed(2) + 's';
         return clamped;
      })()
   `;
   const result = await send(ws, "Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
   });
   if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "seek failed");
   }
   return Number(result.result?.value ?? t);
}

async function screenshotPng(ws) {
   const shot = await send(ws, "Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
   });
   return Buffer.from(shot.data, "base64");
}

// -----------------------------------------------------------------------
// Timeline extraction (same shape as inspect-motion.mjs, just running in
// the iframe context exposed on window.frame.contentWindow).
// -----------------------------------------------------------------------
function extractTimelineSrc() {
   return `(${(function extract() {
      const f = document.getElementById("capture-frame");
      const w = f.contentWindow;
      const tl = w.lfTimeline;
      if (!tl) throw new Error("window.lfTimeline missing in iframe");
      const scenes = tl._scenes;
      if (!Array.isArray(scenes)) throw new Error("lfTimeline._scenes missing");

      function resolveState(stateLike) {
         const out = {};
         try {
            const raw = typeof stateLike === "function" ? stateLike() : stateLike;
            if (raw && typeof raw === "object") {
               for (const k of Object.keys(raw)) {
                  const v = raw[k];
                  if (typeof v === "number" || typeof v === "string") out[k] = v;
               }
            }
         } catch (e) {
            out.__error = String(e?.message || e);
         }
         return out;
      }
      function serializableValue(value) {
         if (value && typeof value === "object") {
            const out = {};
            for (const key of Object.keys(value)) {
               const entry = value[key];
               if (typeof entry === "number" || typeof entry === "string" || typeof entry === "boolean") out[key] = entry;
            }
            return out;
         }
         return value;
      }
      function serializeHandle(handle) {
         if (handle == null || handle === "auto") return handle ?? null;
         return serializableValue(handle);
      }
      function serializeTransition(transition) {
         if (!transition) return null;
         return { jump: transition.jump === true, start: serializeHandle(transition.start), end: serializeHandle(transition.end) };
      }

      return JSON.stringify({
         id: w.lfAnimation?.id ?? null,
         name: w.lfAnimation?.name ?? null,
         duration: typeof tl.duration === "function" ? tl.duration() : null,
         scenes: scenes.map((scene) => ({
            id: scene.id,
            start: scene.start,
            animations: (scene.animations || []).map((a) => ({
               description: a.description,
               keyframes: (a.keyframes || []).map((kf) => ({
                  time: kf.time,
                  transition: serializeTransition(kf.transition),
                  hold: kf.hold === true,
                  state: resolveState(kf.state),
                  dynamic: typeof kf.state === "function",
               })),
            })),
         })),
      });
   }).toString()})()`;
}

async function loadTimeline(ws) {
   const result = await send(ws, "Runtime.evaluate", {
      expression: extractTimelineSrc(),
      returnByValue: true,
   });
   if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "timeline extraction failed");
   }
   return JSON.parse(result.result.value);
}

// -----------------------------------------------------------------------
// Velocity-continuity math (mirrors inspect-motion.mjs). We only print
// violations here, not the full track dump — for the full report run
// `npm run inspect`.
// -----------------------------------------------------------------------
const NUMERIC_AXES = [
   "opacity", "x", "y", "z", "scale",
   "rotationX", "rotationY", "rotationZ",
   "fontSize", "lineHeight", "maxHeight",
];
function autoTemporalTangent(prevValue, currValue, nextValue, dtPrev, dtNext) {
   const hasPrev = typeof prevValue === "number";
   const hasNext = typeof nextValue === "number";
   if (hasPrev && hasNext) {
      if (dtPrev <= 0 || dtNext <= 0) return 0;
      const inSlope = (currValue - prevValue) / dtPrev;
      const outSlope = (nextValue - currValue) / dtNext;
      if (inSlope === 0 || outSlope === 0 || Math.sign(inSlope) !== Math.sign(outSlope)) return 0;
      const w1 = 2 * dtNext + dtPrev;
      const w2 = dtNext + 2 * dtPrev;
      return (w1 + w2) / (w1 / inSlope + w2 / outSlope);
   }
   if (hasPrev) return dtPrev > 0 ? (currValue - prevValue) / dtPrev : 0;
   if (hasNext) return dtNext > 0 ? (nextValue - currValue) / dtNext : 0;
   return 0;
}
function resolveBoundaryVelocity(handle, avgVelocity, prevValue, currValue, nextValue, dtPrev, dtNext) {
   if (handle === "auto") return autoTemporalTangent(prevValue, currValue, nextValue, dtPrev, dtNext);
   if (handle && typeof handle.velocity === "number") return handle.velocity;
   return avgVelocity * (typeof handle?.speed === "number" ? handle.speed : 1);
}
function handleLabel(handle) {
   if (handle == null) return "speed=1";
   if (handle === "auto") return "auto";
   if (typeof handle.velocity === "number") return `velocity=${fmtNum(handle.velocity)}`;
   if (typeof handle.speed === "number") return `speed=${fmtNum(handle.speed)}`;
   return "speed=1";
}
function transitionLabel(transition) {
   if (!transition) return "linear";
   if (transition.jump) return "jump";
   return `start(${handleLabel(transition.start)}) → end(${handleLabel(transition.end)})`;
}
function trackBoundaryAnalysis(keyframes, threshold) {
   const HOLD_EPS = 1e-3;
   const issues = [];
   if (keyframes.length < 3) return issues;
   const sorted = [...keyframes].sort((a, b) => a.time - b.time);
   for (let i = 1; i < sorted.length - 1; i++) {
      const prev = sorted[i - 1];
      const K = sorted[i];
      const next = sorted[i + 1];
      const dIn = K.time - prev.time;
      const dOut = next.time - K.time;
      if (dIn <= 0 || dOut <= 0) continue;
      const offenders = [];
      for (const axis of NUMERIC_AXES) {
         const a = prev.state?.[axis];
         const b = K.state?.[axis];
         const c = next.state?.[axis];
         if (typeof a !== "number" || typeof b !== "number" || typeof c !== "number") continue;
         const ΔIn = b - a;
         const ΔOut = c - b;
         if (Math.abs(ΔIn) < HOLD_EPS || Math.abs(ΔOut) < HOLD_EPS) continue;
         const vIn = resolveBoundaryVelocity(K.transition?.end, ΔIn / dIn, a, b, c, dIn, dOut);
         const vOut = resolveBoundaryVelocity(next.transition?.start, ΔOut / dOut, a, b, c, dIn, dOut);
         const m = Math.max(Math.abs(vIn), Math.abs(vOut));
         if (m === 0) continue;
         const drift = Math.abs(vIn - vOut) / m;
         if (drift > threshold) {
            offenders.push({ axis, vIn, vOut, driftPct: drift * 100 });
         }
      }
      if (offenders.length > 0) {
         issues.push({ keyframeIndex: i, time: K.time, curveIn: transitionLabel(K.transition), curveOut: transitionLabel(next.transition), offenders });
      }
   }
   return issues;
}

// -----------------------------------------------------------------------
// Scene-range derivation. Each `useMotion(...)` produces a sub-scene with
// id `${parent}.${counter}`. Group by the part before the first `.` to
// recover the author's <Scene id="..."> roots, with [start, end] derived
// from contributing tracks.
// -----------------------------------------------------------------------
function topLevelScenes(timeline) {
   const buckets = new Map();
   for (const scene of timeline.scenes) {
      const key = scene.id.split(".")[0];
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(scene);
   }
   const out = [];
   for (const [key, scenes] of buckets.entries()) {
      const start = Math.min(...scenes.map((s) => s.start));
      const lastKf = Math.max(
         start,
         ...scenes.flatMap((s) => s.animations.flatMap((a) => a.keyframes.map((k) => k.time))),
      );
      out.push({ id: key, start, end: lastKf });
   }
   out.sort((a, b) => a.start - b.start);
   return out;
}

function expandTimes(opts, timeline) {
   const explicit = opts.times.slice().sort((a, b) => a - b);

   // sweep modes (when no explicit times):
   if (explicit.length === 0) {
      let range = opts.range;
      if (!range && opts.sceneFilter) {
         const tops = topLevelScenes(timeline);
         const match = tops.find((s) => s.id === opts.sceneFilter);
         if (!match) {
            throw new Error(
               `--scene ${opts.sceneFilter}: not found. Top-level scenes: ${tops.map((s) => s.id).join(", ")}`,
            );
         }
         range = [match.start, match.end];
      }
      if (range) {
         const [a, b] = range;
         if (!(b > a)) throw new Error(`--range invalid: ${a} → ${b}`);
         if (opts.frames != null) {
            const n = Math.max(2, Math.floor(opts.frames));
            return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
         }
         const step = opts.every ?? 0.5;
         const out = [];
         for (let t = a; t <= b + 1e-6; t += step) out.push(Math.min(b, t));
         return out;
      }
      // Default: midpoint of every top-level scene. Cheapest possible
      // "did anything obviously break" sanity check; LLM authors should
      // override with explicit times for any motion-with-trajectory.
      const tops = topLevelScenes(timeline);
      return tops.map((s) => (s.start + s.end) / 2);
   }

   // explicit + --scene means "filter explicit times to those inside the
   // scene range" (mostly useless, but harmless).
   if (opts.sceneFilter) {
      const tops = topLevelScenes(timeline);
      const match = tops.find((s) => s.id === opts.sceneFilter);
      if (!match) throw new Error(`--scene ${opts.sceneFilter} not found`);
      return explicit.filter((t) => t >= match.start && t <= match.end);
   }
   return explicit;
}

// -----------------------------------------------------------------------
// Contact sheet composition. We compose by feeding the captured PNGs as
// data URLs into a tiny HTML grid, screenshotting that page once at a
// size that fits all of them. No third-party deps.
// -----------------------------------------------------------------------
function chooseGrid(n) {
   if (n <= 1) return { cols: 1 };
   if (n <= 2) return { cols: 2 };
   if (n <= 4) return { cols: 2 };
   if (n <= 6) return { cols: 3 };
   if (n <= 9) return { cols: 3 };
   if (n <= 12) return { cols: 4 };
   if (n <= 16) return { cols: 4 };
   return { cols: 5 };
}

async function composeSheet(ws, frames, animationId, frameW, frameH) {
   const cols = chooseGrid(frames.length).cols;
   const rows = Math.ceil(frames.length / cols);
   // Half-scale thumbs are crisp enough to read fine type at 1440×900
   // without producing absurdly huge sheets. 1440/2=720 per thumb.
   const thumbW = Math.round(frameW / 2);
   const thumbH = Math.round(frameH / 2);
   const PAD = 14;
   const LABEL_H = 28;
   const sheetW = cols * thumbW + (cols + 1) * PAD;
   const sheetH = rows * (thumbH + LABEL_H) + (rows + 1) * PAD;

   const cells = frames
      .map((f, i) => {
         const r = Math.floor(i / cols);
         const c = i % cols;
         const left = PAD + c * (thumbW + PAD);
         const top = PAD + r * (thumbH + LABEL_H + PAD);
         const dataUrl = `data:image/png;base64,${f.png.toString("base64")}`;
         const label = f.label ?? fmtTime(f.t);
         return `
            <div class="cell" style="left:${left}px;top:${top}px;width:${thumbW}px;">
               <img src="${dataUrl}" width="${thumbW}" height="${thumbH}" />
               <div class="label">${label}</div>
            </div>
         `;
      })
      .join("\n");

   const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>sheet</title>
<style>
   html,body{margin:0;padding:0;background:#0a0a0a;color:#e7e9ee;
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
   .sheet{position:relative;width:${sheetW}px;height:${sheetH}px;}
   .cell{position:absolute;}
   .cell img{display:block;border:1px solid #222;}
   .label{margin-top:6px;font-size:13px;color:#9aa0aa;letter-spacing:0.04em;
      display:flex;justify-content:space-between;align-items:center;}
</style></head>
<body><div class="sheet">${cells}</div></body></html>`;

   // Resize viewport to the sheet, navigate to a data URL, screenshot.
   await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: sheetW, height: sheetH, deviceScaleFactor: 1, mobile: false,
   });
   const url = `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
   await send(ws, "Page.navigate", { url });
   // Wait until the body has rendered. data: URLs load fast; one tick is
   // usually enough but we poll on document.readyState to be safe.
   await withTimeout(
      (async () => {
         while (true) {
            const r = await send(ws, "Runtime.evaluate", {
               expression: "document.readyState === 'complete'",
               returnByValue: true,
            });
            if (r.result?.value === true) return;
            await wait(40);
         }
      })(),
      5000,
      "sheet readiness",
   );
   await wait(120); // let images decode
   const png = await screenshotPng(ws);
   return { png, width: sheetW, height: sheetH, animationId };
}

// -----------------------------------------------------------------------
// Inspector summary — one-line per discontinuity, no full track dump.
// -----------------------------------------------------------------------
function inspectorSummary(timeline, threshold) {
   const issues = [];
   for (const scene of timeline.scenes) {
      for (const track of scene.animations) {
         const sceneKey = scene.id.split(".")[0];
         const found = trackBoundaryAnalysis(track.keyframes, threshold);
         for (const f of found) {
            issues.push({ scene: sceneKey, track: track.description, ...f });
         }
      }
   }
   return issues;
}

function fmtNum(n) {
   if (n === 0) return "0";
   if (Math.abs(n) < 0.01) return n.toExponential(1);
   if (Number.isInteger(n)) return String(n);
   if (Math.abs(n) >= 100) return n.toFixed(0);
   if (Math.abs(n) >= 10) return n.toFixed(1);
   return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

// -----------------------------------------------------------------------
// main
// -----------------------------------------------------------------------
async function main() {
   const session = await bootChrome(opts.width, opts.height);
   const { ws, dispose } = session;

   try {
      // Boot at t=0 first so the timeline is loaded; we'll seek per-frame.
      const seedTime = opts.times[0] ?? 0;
      await navigateAndBoot(ws, id, opts.width, opts.height, seedTime);

      const timeline = await loadTimeline(ws);
      const times = expandTimes(opts, timeline).map((t) => Math.max(0, t));
      if (times.length === 0) {
         throw new Error("No frames to capture (filter produced empty list).");
      }

      mkdirSync(resolve(ROOT, ".captures"), { recursive: true });

      // Capture each frame. Reuse the same iframe; just lfSeek between shots.
      const frames = [];
      for (const t of times) {
         const clamped = await seekTo(ws, t);
         const png = await screenshotPng(ws);
         const filePath = resolve(ROOT, ".captures", `${id}-${clamped.toFixed(2)}.png`);
         writeFileSync(filePath, png);
         frames.push({ t: clamped, path: filePath, png, label: fmtTime(clamped) });
      }

      // Single-frame mode preserves legacy behaviour: print path + URL only.
      if (frames.length === 1) {
         const f = frames[0];
         const outPath = opts.out ?? f.path;
         if (outPath !== f.path) writeFileSync(outPath, f.png);
         console.log(outPath);
         console.log(
            `${DEFAULT_ORIGIN}/capture.html?id=${encodeURIComponent(id)}&t=${f.t.toFixed(3)}&chromeless=1&w=${opts.width}&h=${opts.height}`,
         );
         if (opts.open) spawn("open", [outPath], { detached: true, stdio: "ignore" }).unref();
      }

      // Multi-frame mode: stitch a contact sheet.
      let sheetPath = null;
      if (frames.length > 1 && opts.makeSheet) {
         const sheet = await composeSheet(ws, frames, id, opts.width, opts.height);
         sheetPath = opts.out ?? resolve(ROOT, ".captures", `${id}-sheet.png`);
         writeFileSync(sheetPath, sheet.png);
         if (!opts.keepIndividuals) {
            for (const f of frames) {
               try { unlinkSync(f.path); } catch {}
            }
         }
      }

      if (frames.length > 1) {
         console.log(`captured ${frames.length} frames @ ${times.map(fmtTime).join(" ")}`);
         if (sheetPath) console.log(`sheet: ${sheetPath}`);
         if (opts.keepIndividuals && opts.makeSheet) {
            console.log(`individuals: .captures/${id}-<t>.png`);
         } else if (!opts.makeSheet) {
            for (const f of frames) console.log(f.path);
         }
         if (opts.open && sheetPath) spawn("open", [sheetPath], { detached: true, stdio: "ignore" }).unref();
      }

      // Inspector summary. Cheap because we already have the timeline.
      if (opts.runInspect) {
         const issues = inspectorSummary(timeline, opts.driftThreshold);
         console.log("");
         console.log(
            `── inspector  ·  ${(timeline.duration ?? 0).toFixed(2)}s  ·  ${(timeline.name ?? id)}`,
         );
         if (issues.length === 0) {
            console.log(`   velocity: ✓ none (>${(opts.driftThreshold * 100).toFixed(0)}% drift)`);
         } else {
            console.log(
               `   velocity: ⚠ ${issues.length} discontinuit${issues.length === 1 ? "y" : "ies"}`,
            );
            for (const d of issues) {
               console.log(
                  `     · ${d.scene} · ${d.track}  @ ${fmtTime(d.time)}  [${d.curveIn} → ${d.curveOut}]`,
               );
               for (const o of d.offenders) {
                  console.log(
                     `         ${o.axis.padEnd(10)} vIn=${fmtNum(o.vIn).padStart(7)}  vOut=${fmtNum(o.vOut).padStart(7)}  ${o.driftPct.toFixed(0)}% step`,
                  );
               }
            }
            console.log(`   (full report: npm run inspect -- ${id})`);
         }
      }
   } finally {
      dispose();
   }
}

main().catch((err) => {
   console.error(err.stack || err.message || err);
   process.exitCode = 1;
});
