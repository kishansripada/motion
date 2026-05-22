#!/usr/bin/env node
/**
 * Plot the spatial speed + acceleration of a follow track over time.
 *
 * Usage:
 *   node scripts/plot-track-velocity.mjs <animation-id> --track <substr> [--samples 800] [--out path.png]
 *
 * Example:
 *   node scripts/plot-track-velocity.mjs 14-dex-demo --track "camera position surveys"
 *
 * The script:
 *   1. Boots the animation in headless Chrome at /run/<id>.html.
 *   2. Dynamically imports the framework module from the dev server so we
 *      can call `progressPose(t, keyframes)` and `sampleTrack(track, p)`
 *      with the actual runtime math (no recreation).
 *   3. Samples (x, y, z) over the track's time window at N points.
 *   4. Computes speed and acceleration via finite differences.
 *   5. Renders an SVG chart, then screenshots it via the same Chrome
 *      session so the output is a PNG you can read directly.
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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

const args = process.argv.slice(2);
const id = args[0];
if (!id) {
   console.error(
      "Usage: node scripts/plot-track-velocity.mjs <animation-id> --track <substr> [--samples N] [--out path.png]",
   );
   process.exit(1);
}

let trackFilter = null;
let sampleCount = 800;
let outPath = null;

for (let i = 1; i < args.length; i++) {
   const a = args[i];
   if (a === "--track") trackFilter = args[++i];
   else if (a === "--samples") sampleCount = Number(args[++i]);
   else if (a === "--out") outPath = args[++i];
   else {
      console.error(`unknown arg: ${a}`);
      process.exit(1);
   }
}

if (!trackFilter) {
   console.error("--track <substr> is required (matched against the track description)");
   process.exit(1);
}

const chromePath = CHROME_CANDIDATES.find(Boolean);
if (!chromePath) {
   console.error("Could not find Chrome. Set CHROME_PATH=/path/to/chrome.");
   process.exit(1);
}

const userDataDir = resolve(tmpdir(), `plot-velocity-${process.pid}-${Date.now()}`);
mkdirSync(userDataDir, { recursive: true });

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
   const reqId = send.nextId++;
   ws.send(JSON.stringify({ id: reqId, method, params }));
   return new Promise((resolve, reject) => {
      send.pending.set(reqId, { resolve, reject });
   });
}
send.nextId = 1;
send.pending = new Map();

// -----------------------------------------------------------------------
// Page-side sampler. Dynamically imports the live framework, finds the
// follow track by description substring, and samples (x, y, z) at N times.
// -----------------------------------------------------------------------
async function pageSampleFollowTrack(filter, samples) {
   const tl = window.lfTimeline;
   if (!tl) throw new Error("window.lfTimeline missing");
   const scenes = tl._scenes;
   if (!Array.isArray(scenes)) throw new Error("lfTimeline._scenes missing");

   const fw = await import("/src/framework/index.ts");

   const candidates = [];
   for (const scene of scenes) {
      for (const f of scene.followTracks || []) {
         if (f.description.toLowerCase().includes(filter.toLowerCase())) {
            candidates.push({ scene, follow: f });
         }
      }
   }
   if (candidates.length === 0) throw new Error(`no follow track matched: ${filter}`);
   if (candidates.length > 1) {
      const list = candidates.map((c) => `  - "${c.follow.description}" in ${c.scene.id}`).join("\n");
      throw new Error(`multiple follow tracks matched ${JSON.stringify(filter)}:\n${list}\n(narrow the filter)`);
   }
   const { follow, scene } = candidates[0];

   const kfTimes = follow.keyframes.map((kf) => kf.time);
   const tStart = Math.min(...kfTimes);
   const tEnd = Math.max(...kfTimes);
   if (!(tEnd > tStart)) throw new Error("track has zero time span");

   const points = [];
   for (let i = 0; i < samples; i++) {
      const t = tStart + ((tEnd - tStart) * i) / (samples - 1);
      const p = fw.progressPose(t, follow.keyframes);
      const sampled = fw.sampleTrack(follow.track, p);
      const x = sampled.x ?? sampled.cameraFromX ?? sampled.cameraTargetX ?? 0;
      const y = sampled.y ?? sampled.cameraFromY ?? sampled.cameraTargetY ?? 0;
      const z = sampled.z ?? sampled.cameraFromZ ?? 0;
      points.push({ t, p, x, y, z });
   }

   return {
      description: follow.description,
      sceneId: scene.id,
      trackKind: follow.track?.kind ?? "unknown",
      trackOutput: follow.track?.output ?? "unknown",
      dimension: follow.track?.dimension ?? null,
      length: follow.track?.length ?? null,
      tStart,
      tEnd,
      keyframes: follow.keyframes.map((kf) => {
         let progress = null;
         try {
            const resolved = typeof kf.state === "function" ? kf.state() : kf.state;
            if (typeof resolved === "number") progress = resolved;
         } catch {
            /* dynamic states without context are fine to skip */
         }
         return {
            time: kf.time,
            hold: kf.hold === true || kf.kind === "hold",
            transition: kf.transition ?? null,
            progress,
         };
      }),
      waypoints: (follow.track?.waypoints || []).map((w) => ({ id: w.id, progress: w.progress })),
      points,
   };
}

// -----------------------------------------------------------------------
// Boot Chrome, navigate, evaluate, return parsed data.
// -----------------------------------------------------------------------
async function withChrome(fn) {
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
         "--window-size=1600,1120",
         "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
   );

   try {
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

      const targetListUrl = browserWsUrl.replace(/^ws:\/\//, "http://").replace(/\/devtools\/browser\/.*$/, "/json/list");
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

      const result = await fn(ws);
      ws.close();
      return result;
   } finally {
      chrome.kill();
   }
}

async function evalInPage(ws, expression) {
   const res = await send(ws, "Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
   });
   if (res.exceptionDetails) {
      const ex = res.exceptionDetails;
      const message = ex.exception?.description ?? ex.text ?? JSON.stringify(ex);
      throw new Error(`page-side error: ${message}`);
   }
   return res.result?.value;
}

async function loadTrackSamples() {
   return withChrome(async (ws) => {
      const runUrl = `${DEFAULT_ORIGIN}/run/${encodeURIComponent(id)}.html`;
      await send(ws, "Page.navigate", { url: runUrl });

      await withTimeout(
         (async () => {
            while (true) {
               const v = await evalInPage(ws, "Boolean(window.lfTimeline && window.lfTimeline._scenes)");
               if (v === true) return;
               await wait(60);
            }
         })(),
         15000,
         "Animation boot",
      );

      // Pause the timeline so seeking doesn't race playback.
      await evalInPage(ws, "window.lfPause && window.lfPause()");

      const expression = `(${pageSampleFollowTrack.toString()})(${JSON.stringify(trackFilter)}, ${sampleCount})`;
      return evalInPage(ws, expression);
   });
}

// -----------------------------------------------------------------------
// Finite-difference speed + acceleration in Node from the sampled points.
// The framework's spatial track sampling uses a 64-entry arc-length LUT,
// so direct second derivatives of (x, y, z)(t) are dominated by LUT
// quantization noise. We use a wide-stencil central difference (effectively
// a low-pass filter) for both velocity and acceleration to recover the
// shape an animator actually perceives.
// -----------------------------------------------------------------------
function dist(a, b) {
   const dx = a.x - b.x;
   const dy = a.y - b.y;
   const dz = (a.z ?? 0) - (b.z ?? 0);
   return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function smoothedDerivative(values, times, halfWindow) {
   const N = values.length;
   const out = new Array(N);
   for (let i = 0; i < N; i++) {
      const lo = Math.max(0, i - halfWindow);
      const hi = Math.min(N - 1, i + halfWindow);
      const dt = times[hi] - times[lo];
      out[i] = dt > 0 ? (values[hi] - values[lo]) / dt : 0;
   }
   return out;
}

function computeKinematics(points) {
   const N = points.length;
   const times = points.map((p) => p.t);

   // Cumulative arc-length over the spatial samples — its derivative is
   // the spatial speed and avoids quantization artefacts from finite
   // differencing each axis separately.
   const arc = new Array(N).fill(0);
   for (let i = 1; i < N; i++) arc[i] = arc[i - 1] + dist(points[i], points[i - 1]);
   const progressArr = points.map((p) => p.p);

   // The full window spans ~25ms — well inside one rendered frame at 60fps
   // and wider than the spatial LUT segment width, so we filter the
   // sub-frame noise the viewer can't see anyway.
   const dtAvg = (times[N - 1] - times[0]) / (N - 1);
   const velocityWin = Math.max(2, Math.round(0.013 / dtAvg));
   const accelWin = Math.max(velocityWin * 2, Math.round(0.05 / dtAvg));

   const speed = smoothedDerivative(arc, times, velocityWin);
   const accel = smoothedDerivative(speed, times, accelWin);
   const progressSpeed = smoothedDerivative(progressArr, times, velocityWin);
   const progressAccel = smoothedDerivative(progressSpeed, times, accelWin);

   return { speed, accel, progressSpeed, progressAccel, smoothingMs: { speed: dtAvg * velocityWin * 1000, accel: dtAvg * accelWin * 1000 } };
}

// -----------------------------------------------------------------------
// SVG renderer — three stacked panels:
//   1) scalar progress velocity      (this is the quantity that the
//      transition `speed`/`velocity` handles in the API set directly)
//   2) spatial speed |dP/dt|         (what the eye sees moving through 3D)
//   3) spatial acceleration          (smoothed; the LUT noise that survives
//                                     is annotated, not hidden)
//
// Vertical guides mark every keyframe; non-hold keyframes also get the
// transition handle (e.g. v=0.05 | speed=1) printed at the top, so you
// can connect "API value" → "what actually happens".
// -----------------------------------------------------------------------
function renderSvg(data, kin) {
   const W = 1600;
   const H = 1120;
   const PADL = 110;
   const PADR = 200;
   const PADT = 120;
   const PADB = 130;
   const GAP = 28;
   const plotW = W - PADL - PADR;
   const plotH = (H - PADT - PADB - 2 * GAP) / 3;

   const { points, keyframes, waypoints, tStart, tEnd } = data;
   const { speed, accel, progressSpeed, smoothingMs } = kin;

   const sMax = Math.max(...speed, 1e-9);
   const aAbsMax = Math.max(...accel.map(Math.abs), 1e-9);
   const psMax = Math.max(...progressSpeed, 1e-9);

   const panelTop = [PADT, PADT + plotH + GAP, PADT + 2 * (plotH + GAP)];

   const tToX = (t) => PADL + ((t - tStart) / (tEnd - tStart)) * plotW;
   const psToY = (v) => panelTop[0] + plotH - (v / psMax) * plotH;
   const sToY = (v) => panelTop[1] + plotH - (v / sMax) * plotH;
   const aToY = (v) => panelTop[2] + plotH / 2 - (v / aAbsMax) * (plotH / 2);

   const linePath = (ys, yMap) =>
      points.map((p, i) => `${i === 0 ? "M" : "L"}${tToX(p.t).toFixed(2)} ${yMap(ys[i]).toFixed(2)}`).join(" ");

   const psPath = linePath(progressSpeed, psToY);
   const spPath = linePath(speed, sToY);
   const acPath = linePath(accel, aToY);

   const fmtRel = (t) => `${(t - tStart).toFixed(2)}s`;
   const fmtAbs = (t) => `${t.toFixed(2)}s`;

   const panelBgs = panelTop
      .map((top) => `<rect x="${PADL}" y="${top}" width="${plotW}" height="${plotH}" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>`)
      .join("");

   function yAxis(top, max, signed, ticks, fmt, labelColour) {
      const lines = [];
      const lo = signed ? -ticks : 0;
      for (let i = lo; i <= ticks; i++) {
         const v = (max * i) / ticks;
         const y = signed ? top + plotH / 2 - (v / max) * (plotH / 2) : top + plotH - (v / max) * plotH;
         lines.push(
            `<line x1="${PADL}" y1="${y}" x2="${PADL + plotW}" y2="${y}" stroke="#1f2937" stroke-width="0.5"/>`,
            `<text x="${PADL - 8}" y="${y + 3}" text-anchor="end" fill="${labelColour}" font-size="11" font-family="ui-monospace,monospace">${fmt(v)}</text>`,
         );
      }
      return lines.join("");
   }

   const yGrid = [
      yAxis(panelTop[0], psMax, false, 4, (v) => v.toFixed(3), "#94a3b8"),
      yAxis(panelTop[1], sMax, false, 4, (v) => v.toFixed(3), "#94a3b8"),
      yAxis(panelTop[2], aAbsMax, true, 3, (v) => v.toFixed(2), "#94a3b8"),
   ].join("");

   const xTicks = 8;
   const xGrid = [];
   for (let i = 0; i <= xTicks; i++) {
      const t = tStart + ((tEnd - tStart) * i) / xTicks;
      const x = tToX(t);
      for (const top of panelTop) {
         xGrid.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + plotH}" stroke="#1f2937" stroke-width="0.3"/>`);
      }
      xGrid.push(
         `<text x="${x}" y="${panelTop[2] + plotH + 16}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="ui-monospace,monospace">${fmtRel(t)}</text>`,
      );
   }

   // ---- Waypoint crossings ------------------------------------------
   // A waypoint is "hit" at the moment the track first lands on it. In
   // practice that's whenever a keyframe explicitly targets that
   // waypoint's progress value — the case the API is built around. For
   // robustness we additionally find any *crossings* between samples
   // (sign-change of p - target) that aren't already covered by a
   // keyframe, in case progress overshoots/oscillates through a
   // waypoint without a keyframe at that exact value.
   const WAYPOINT_PROGRESS_EPS = 1e-3;
   const waypointHits = [];
   const pushHit = (id, progress, t) => {
      for (const h of waypointHits) {
         if (h.id === id) return;
      }
      waypointHits.push({ id, progress, t });
   };

   for (const w of waypoints || []) {
      if (w.id == null) continue;
      // First matching keyframe is the canonical "the camera lands here" beat.
      // Subsequent matches inside a hold are skipped — we don't want a marker
      // at both the start and end of a held headOn region.
      const kfMatch = keyframes.find(
         (kf) => typeof kf.progress === "number" && Math.abs(kf.progress - w.progress) < WAYPOINT_PROGRESS_EPS,
      );
      if (kfMatch) pushHit(w.id, w.progress, kfMatch.time);

      // Catch additional crossings that aren't on a keyframe (overshoots,
      // oscillation through the waypoint).
      for (let i = 1; i < points.length; i++) {
         const d0 = points[i - 1].p - w.progress;
         const d1 = points[i].p - w.progress;
         if (d0 === 0 || d1 === 0) continue;
         if ((d0 < 0) === (d1 < 0)) continue;
         const frac = -d0 / (d1 - d0);
         const t = points[i - 1].t + frac * (points[i].t - points[i - 1].t);
         pushHit(w.id, w.progress, t);
      }
   }
   // pushHit's per-id time-tolerance already kept overshoot+keyframe pairs
   // from double-marking; sort for stable label layout.
   waypointHits.sort((a, b) => a.t - b.t);

   // Vertical keyframe markers + handle annotations at the top, with the
   // waypoint id prepended when the keyframe lands on a known waypoint.
   const WAYPOINT_EPS = 1e-3;
   const kfLines = keyframes
      .map((kf, idx) => {
         const x = tToX(kf.time);
         const colour = kf.hold ? "#475569" : "#fbbf24";
         const dash = kf.hold ? `stroke-dasharray="2 4"` : "";
         const matched = typeof kf.progress === "number"
            ? (waypoints || []).find((w) => Math.abs(w.progress - kf.progress) < WAYPOINT_EPS)
            : null;
         const name = matched?.id ? `${matched.id} · ` : "";
         const labelTop = `${name}${fmtRel(kf.time)}${kf.hold ? " · hold" : ""}`;
         const tr = kf.transition;
         const handleLine = tr ? `start: ${handleLabel(tr.start)}   end: ${handleLabel(tr.end)}` : "";
         const labelY = PADT - 64 + (idx % 2) * 26;
         return [
            `<line x1="${x}" y1="${panelTop[0]}" x2="${x}" y2="${panelTop[2] + plotH}" stroke="${colour}" stroke-width="0.9" ${dash} opacity="0.65"/>`,
            `<text x="${x}" y="${labelY}" text-anchor="middle" fill="${colour}" font-size="11" font-weight="600">${escapeXml(labelTop)}</text>`,
            handleLine
               ? `<text x="${x}" y="${labelY + 12}" text-anchor="middle" fill="#fde68a" font-size="9.5" font-family="ui-monospace,monospace">${handleLine}</text>`
               : "",
         ].join("");
      })
      .join("");

   // ---- Waypoint dots on each curve ---------------------------------
   // A filled marker on each panel at the moment the track crosses the
   // waypoint's progress value. Coloured cyan so it doesn't clash with
   // the curves or the yellow keyframe verticals.
   const WAYPOINT_COLOUR = "#22d3ee";
   const waypointMarks = waypointHits
      .map((hit) => {
         const x = tToX(hit.t);
         // Sample the smoothed series at the nearest index for marker placement.
         let idx = 0;
         let bestDt = Infinity;
         for (let i = 0; i < points.length; i++) {
            const d = Math.abs(points[i].t - hit.t);
            if (d < bestDt) { bestDt = d; idx = i; }
         }
         const yPs = psToY(progressSpeed[idx]);
         const ySp = sToY(speed[idx]);
         const yAc = aToY(accel[idx]);
         return [
            `<line x1="${x}" y1="${panelTop[0]}" x2="${x}" y2="${panelTop[2] + plotH}" stroke="${WAYPOINT_COLOUR}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.55"/>`,
            `<circle cx="${x}" cy="${yPs}" r="4" fill="${WAYPOINT_COLOUR}" stroke="#0b0f17" stroke-width="1.5"/>`,
            `<circle cx="${x}" cy="${ySp}" r="4" fill="${WAYPOINT_COLOUR}" stroke="#0b0f17" stroke-width="1.5"/>`,
            `<circle cx="${x}" cy="${yAc}" r="4" fill="${WAYPOINT_COLOUR}" stroke="#0b0f17" stroke-width="1.5"/>`,
            // Label centred under the bottom panel so it never collides
            // with the keyframe row up top.
            `<text x="${x}" y="${panelTop[2] + plotH + 36}" text-anchor="middle" fill="${WAYPOINT_COLOUR}" font-size="13" font-weight="700">${escapeXml(hit.id)}</text>`,
            `<text x="${x}" y="${panelTop[2] + plotH + 52}" text-anchor="middle" fill="${WAYPOINT_COLOUR}" font-size="11" font-family="ui-monospace,monospace" opacity="0.85">p=${hit.progress.toFixed(3)} · ${fmtRel(hit.t)}</text>`,
         ].join("");
      })
      .join("");

   // Zero axis for acceleration panel.
   const accelZero = `<line x1="${PADL}" y1="${aToY(0)}" x2="${PADL + plotW}" y2="${aToY(0)}" stroke="#475569" stroke-width="1"/>`;

   const title = data.description;
   const sub = `${data.sceneId}  ·  ${data.trackKind} (${data.trackOutput}, ${data.dimension}D)  ·  track length ${(data.length ?? 0).toFixed(4)}  ·  window ${fmtAbs(tStart)}→${fmtAbs(tEnd)} (${(tEnd - tStart).toFixed(2)}s)  ·  ${data.points.length} samples`;

   const panelHeaders = [
      { top: panelTop[0], colour: "#34d399", text: "progress velocity  dP/dt  (this is what `speed=` and `velocity=` in the API control)" },
      { top: panelTop[1], colour: "#60a5fa", text: `spatial speed  |d(x,y,z)/dt|  (≈ progress velocity × track length ${(data.length ?? 0).toFixed(3)})` },
      { top: panelTop[2], colour: "#a78bfa", text: `spatial acceleration  d|·|/dt  (smoothed over ±${smoothingMs.accel.toFixed(0)}ms)` },
   ]
      .map((p) => `<text x="${PADL}" y="${p.top - 6}" fill="${p.colour}" font-size="12">${escapeXml(p.text)}</text>`)
      .join("");

   // Legend on the right summarising waypoints' progress values (so you
   // can locate `headOn`, `topLeft`, `bottomLeft` on the timeline).
   const legendEntries = (waypoints || [])
      .map(
         (w, i) =>
            `<text x="${PADL + plotW + 16}" y="${panelTop[0] + 14 + i * 16}" fill="#cbd5e1" font-size="11" font-family="ui-monospace,monospace">${escapeXml(w.id ?? "")}  p=${w.progress.toFixed(3)}</text>`,
      )
      .join("");

   return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0b0f17"/>
  <text x="${PADL}" y="24" fill="#fff" font-size="16" font-weight="700">${escapeXml(title)}</text>
  <text x="${PADL}" y="42" fill="#94a3b8" font-size="11" font-family="ui-monospace,monospace">${escapeXml(sub)}</text>

  ${panelBgs}
  <g>${yGrid}</g>
  <g>${xGrid.join("")}</g>
  ${accelZero}
  <g>${kfLines}</g>
  ${panelHeaders}

  <path d="${psPath}" fill="none" stroke="#34d399" stroke-width="1.6"/>
  <path d="${spPath}" fill="none" stroke="#60a5fa" stroke-width="1.6"/>
  <path d="${acPath}" fill="none" stroke="#a78bfa" stroke-width="1.6"/>

  <g>${waypointMarks}</g>

  <text x="${PADL + plotW + 16}" y="${panelTop[0] - 6}" fill="#cbd5e1" font-size="11" font-weight="600">waypoints</text>
  ${legendEntries}
</svg>`;
}

function handleLabel(handle) {
   if (handle == null) return "speed=1";
   if (handle === "auto") return "auto";
   if (typeof handle.velocity === "number") return `v=${handle.velocity}`;
   if (typeof handle.speed === "number") return `s=${handle.speed}`;
   return "speed=1";
}

function escapeXml(s) {
   return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
}

// Render SVG → PNG using a fresh Chrome navigation to a data URL.
async function rasteriseSvg(svg, outFile) {
   const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#0b0f17;}</style></head><body><div id="root"></div><script>document.getElementById('root').innerHTML=${JSON.stringify(svg)};</script></body></html>`;
   const dataUrl = `data:text/html;base64,${Buffer.from(html, "utf8").toString("base64")}`;

   await withChrome(async (ws) => {
      await send(ws, "Page.navigate", { url: dataUrl });
      await withTimeout(
         (async () => {
            while (true) {
               const v = await evalInPage(ws, "document.readyState === 'complete'");
               if (v === true) return;
               await wait(40);
            }
         })(),
         5000,
         "data: navigation",
      );
      // small settle
      await wait(80);
      const shot = await send(ws, "Page.captureScreenshot", {
         format: "png",
         clip: { x: 0, y: 0, width: 1600, height: 1120, scale: 1 },
      });
      writeFileSync(outFile, Buffer.from(shot.data, "base64"));
   });
}

// -----------------------------------------------------------------------
// main
// -----------------------------------------------------------------------
async function main() {
   try {
      const data = await loadTrackSamples();
      const kin = computeKinematics(data.points);

      const svg = renderSvg(data, kin);
      const safeDesc = data.description.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60);
      const out = outPath ?? resolve(ROOT, ".captures", `velocity-${id}-${safeDesc}.png`);
      mkdirSync(dirname(out), { recursive: true });
      const svgOut = out.replace(/\.png$/, ".svg");
      writeFileSync(svgOut, svg);

      await rasteriseSvg(svg, out);

      const sMax = Math.max(...kin.speed);
      const aMax = Math.max(...kin.accel.map(Math.abs));

      console.log(`track: ${data.description}`);
      console.log(`  scene=${data.sceneId} kind=${data.trackKind} length=${(data.length ?? 0).toFixed(4)}`);
      console.log(`  window=[${data.tStart.toFixed(3)}s, ${data.tEnd.toFixed(3)}s]  samples=${data.points.length}`);
      console.log(`  max speed = ${sMax.toFixed(5)} units/s`);
      console.log(`  max |accel| = ${aMax.toFixed(5)} units/s²`);
      console.log(`wrote ${svgOut}`);
      console.log(`wrote ${out}`);
   } finally {
      try {
         rmSync(userDataDir, { recursive: true, force: true });
      } catch {
         /* noop */
      }
   }
}

main().catch((err) => {
   console.error(err.stack || err.message || err);
   process.exitCode = 1;
});
