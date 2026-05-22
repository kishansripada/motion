#!/usr/bin/env node
/**
 * Inspect a motion animation as text or JSON.
 *
 * Usage:
 *   npm run inspect -- <animation-id>
 *   npm run inspect -- <animation-id> --json
 *   npm run inspect -- <animation-id> --track "camera"   # filter substring
 *   npm run inspect -- <animation-id> --scene title       # one scene
 *
 * Reads the framework's internal scene graph (`window.lfTimeline._scenes`)
 * after the animation boots in headless Chrome, and prints:
 *   1. A per-scene/per-track keyframe table (poses, Bezier handles, deltas).
 *   2. A velocity-continuity report flagging boundaries where the value's
 *      speed step-changes by more than the configured threshold.
 *
 * The inspector replaces what would otherwise be a build-time lint, because
 * many "discontinuities" are intentional (button-press impacts, spring
 * overshoots). Reading the full motion is the cheapest way to tell the
 * intentional ones from the bugs.
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
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

function usage() {
   console.error(
      "Usage: npm run inspect -- <animation-id> [--json] [--scene <id>] [--track <substr>] [--threshold <pct>]",
   );
   process.exit(1);
}

const args = process.argv.slice(2);
const id = args[0];
if (!id) usage();

let asJson = false;
let sceneFilter = null;
let trackFilter = null;
let driftThreshold = 0.2;

for (let i = 1; i < args.length; i++) {
   const a = args[i];
   if (a === "--json") asJson = true;
   else if (a === "--scene") sceneFilter = args[++i];
   else if (a === "--track") trackFilter = args[++i];
   else if (a === "--threshold") driftThreshold = Number(args[++i]) / 100;
   else usage();
}

const chromePath = CHROME_CANDIDATES.find(Boolean);
if (!chromePath) {
   console.error("Could not find Chrome. Set CHROME_PATH=/path/to/chrome.");
   process.exit(1);
}

const userDataDir = resolve(tmpdir(), `motion-inspect-${process.pid}-${Date.now()}`);
const runUrl = `${DEFAULT_ORIGIN}/run/${encodeURIComponent(id)}.html`;

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

// -----------------------------------------------------------------------
// Page-side extraction. Stringified and shipped to Chrome via Runtime.evaluate.
// Reads the framework's live scene graph and returns a serializable shape.
// -----------------------------------------------------------------------
function extractTimeline() {
   const tl = window.lfTimeline;
   if (!tl) throw new Error("window.lfTimeline missing");
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

   function resolveProgressState(stateLike) {
      try {
         return typeof stateLike === "function" ? stateLike() : stateLike;
      } catch (e) {
         return String(e?.message || e);
      }
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
      return {
         jump: transition.jump === true,
         start: serializeHandle(transition.start),
         end: serializeHandle(transition.end),
      };
   }

   function serializeWaypoint(waypoint, track) {
      const sampled = track && typeof track.sample === "function" ? serializableValue(track.sample(waypoint.progress)) : null;
      return {
         index: waypoint.index,
         id: waypoint.id ?? null,
         progress: waypoint.progress,
         point: serializableValue(waypoint.point),
         sampled,
      };
   }

   function serializeTrack(track) {
      if (!track) return null;
      return {
         kind: track.kind,
         output: track.output,
         dimension: track.dimension,
         length: track.length,
         curve: track.curve ?? null,
         tension: track.tension ?? null,
         waypoints: Array.isArray(track.waypoints) ? track.waypoints.map((waypoint) => serializeWaypoint(waypoint, track)) : [],
         parts: Array.isArray(track.parts)
            ? track.parts.map((part) => ({
                 role: part.role,
                 kind: part.track?.kind ?? null,
                 length: part.track?.length ?? null,
                 curve: part.track?.curve ?? null,
                 tension: part.track?.tension ?? null,
                 waypoints: Array.isArray(part.track?.waypoints)
                    ? part.track.waypoints.map((waypoint) => serializeWaypoint(waypoint, part.track))
                    : [],
              }))
            : [],
      };
   }

   function serializeAnimation(a) {
      const frames = (a.keyframes || []).map((kf) => ({
         raw: kf,
         kind: kf.kind || (kf.hold === true ? "hold" : "pin"),
         time: kf.time,
         transition: serializeTransition(kf.transition),
         hold: kf.hold === true || kf.kind === "hold",
         state: resolveState(kf.state),
         dynamic: typeof kf.state === "function",
      }));
      return {
         description: a.description,
         type: "animate",
         keyframes: frames.map((frame, index) => {
            return {
               time: frame.time,
               effectiveTime: null,
               hold: frame.hold,
               kind: frame.kind,
               transition: frame.transition,
               state: frame.state,
               dynamic: frame.dynamic,
            };
         }),
      };
   }

   function serializeFollowTrack(f) {
      return {
         description: f.description,
         type: "follow",
         track: serializeTrack(f.track),
         keyframes: (f.keyframes || []).map((kf) => ({
            time: kf.time,
            effectiveTime: null,
            transition: serializeTransition(kf.transition),
            hold: kf.hold === true || kf.kind === "hold",
            kind: kf.kind || (kf.hold === true ? "hold" : "pin"),
            state: { progress: resolveProgressState(kf.state) },
            dynamic: typeof kf.state === "function",
         })),
      };
   }

   const result = {
      id: window.lfAnimation?.id ?? null,
      name: window.lfAnimation?.name ?? null,
      duration: typeof tl.duration === "function" ? tl.duration() : null,
      scenes: scenes.map((scene) => ({
         id: scene.id,
         start: scene.start,
         animations: [
            ...(scene.animations || []).map(serializeAnimation),
            ...(scene.followTracks || []).map(serializeFollowTrack),
         ],
         textTracks: (scene.textTracks || []).map((t) => ({ id: t.id })),
         effects: (scene.effects || []).map((e) => ({ id: e.id, time: e.time })),
      })),
   };
   return result;
}

// -----------------------------------------------------------------------
// Boot Chrome, navigate, evaluate, return parsed timeline data.
// -----------------------------------------------------------------------
async function loadTimeline() {
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
         "--window-size=1440,900",
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
            for (; ;) {
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
      await send(ws, "Page.navigate", { url: runUrl });

      // Wait until lfTimeline._scenes exists (boot has finished).
      await withTimeout(
         (async () => {
            while (true) {
               const result = await send(ws, "Runtime.evaluate", {
                  expression: "Boolean(window.lfTimeline && window.lfTimeline._scenes)",
                  returnByValue: true,
               });
               if (result.result?.value === true) return;
               await wait(60);
            }
         })(),
         15000,
         "Animation boot",
      );

      const expression = `JSON.stringify((${extractTimeline.toString()})())`;
      const result = await send(ws, "Runtime.evaluate", { expression, returnByValue: true });
      ws.close();
      const raw = result.result?.value;
      if (typeof raw !== "string") throw new Error("Inspector extraction returned non-string");
      return JSON.parse(raw);
   } finally {
      chrome.kill();
   }
}

// -----------------------------------------------------------------------
// Velocity-continuity math (same formulas the lint would have used). Works
// off the resolved keyframe states so it's pure data — no DOM access.
// -----------------------------------------------------------------------
const NUMERIC_AXES = [
   "progress",
   "opacity",
   "x",
   "y",
   "z",
   "scale",
   "rotationX",
   "rotationY",
   "rotationZ",
   "cameraFromX",
   "cameraFromY",
   "cameraFromZ",
   "cameraTargetX",
   "cameraTargetY",
   "cameraDistance",
   "cameraRoll",
   "cameraNaturalRoll",
   "fontSize",
   "lineHeight",
   "maxHeight",
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

function transitionLabel(transition) {
   if (!transition) return "linear";
   if (transition.jump) return "jump";
   const start = handleLabel(transition.start);
   const end = handleLabel(transition.end);
   return `start(${start}) → end(${end})`;
}

function handleLabel(handle) {
   if (handle == null) return "speed=1";
   if (handle === "auto") return "auto";
   if (typeof handle.velocity === "number") return `velocity=${fmtNum(handle.velocity)}`;
   if (typeof handle.speed === "number") return `speed=${fmtNum(handle.speed)}`;
   return "speed=1";
}

function trackBoundaryAnalysis(keyframes, threshold = 0.2) {
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
         issues.push({
            keyframeIndex: i,
            time: K.time,
            curveIn: transitionLabel(K.transition),
            curveOut: transitionLabel(next.transition),
            offenders,
         });
      }
   }
   return issues;
}

// -----------------------------------------------------------------------
// Text formatter
// -----------------------------------------------------------------------
function fmtTime(t) {
   return `${t.toFixed(2)}s`;
}

function fmtNum(n) {
   if (n === 0) return "0";
   if (Math.abs(n) < 0.01) return n.toExponential(1);
   if (Number.isInteger(n)) return String(n);
   if (Math.abs(n) >= 100) return n.toFixed(0);
   if (Math.abs(n) >= 10) return n.toFixed(1);
   return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

const AXIS_SHORT = {
   progress: "p",
   opacity: "op",
   scale: "sc",
   rotationX: "rX",
   rotationY: "rY",
   rotationZ: "rZ",
   cameraFromX: "cFx",
   cameraFromY: "cFy",
   cameraFromZ: "cFz",
   cameraTargetX: "cTx",
   cameraTargetY: "cTy",
   cameraDistance: "cD",
   cameraRoll: "cR",
   cameraNaturalRoll: "cNR",
   fontSize: "fs",
   lineHeight: "lh",
   maxHeight: "mh",
};

function abbrevState(state) {
   const parts = [];
   for (const axis of NUMERIC_AXES) {
      if (typeof state[axis] === "number") {
         parts.push(`${AXIS_SHORT[axis] ?? axis}=${fmtNum(state[axis])}`);
      }
   }
   for (const k of Object.keys(state)) {
      if (NUMERIC_AXES.includes(k) || k === "__error") continue;
      if (typeof state[k] === "string") parts.push(`${k}=${state[k]}`);
   }
   return parts.join(" ");
}

function deltaSummary(prev, curr) {
   if (!prev || !curr) return "";
   const parts = [];
   for (const axis of NUMERIC_AXES) {
      const a = prev[axis];
      const b = curr[axis];
      if (typeof a === "number" && typeof b === "number" && Math.abs(b - a) > 1e-3) {
         const d = b - a;
         const sign = d > 0 ? "+" : "";
         parts.push(`Δ${AXIS_SHORT[axis] ?? axis}=${sign}${fmtNum(d)}`);
      }
   }
   return parts.join(" ");
}

function formatPoint(point) {
   if (!point || typeof point !== "object") return String(point);
   const parts = [];
   for (const key of ["x", "y", "z", "cameraFromX", "cameraFromY", "cameraFromZ", "cameraTargetX", "cameraTargetY"]) {
      if (typeof point[key] === "number") parts.push(`${AXIS_SHORT[key] ?? key}=${fmtNum(point[key])}`);
   }
   return `{ ${parts.join(", ")} }`;
}

function formatWaypoint(waypoint) {
   const label = waypoint.id ? `${waypoint.id}` : `#${waypoint.index}`;
   const sampled = waypoint.sampled ? ` sampled=${formatPoint(waypoint.sampled)}` : "";
   return `${label.padEnd(12)} p=${fmtNum(waypoint.progress)} point=${formatPoint(waypoint.point)}${sampled}`;
}

function summarizeAxes(keyframes) {
   const seen = new Set();
   for (const kf of keyframes) {
      for (const k of Object.keys(kf.state)) {
         if (k !== "__error") seen.add(k);
      }
   }
   const ordered = [...NUMERIC_AXES.filter((a) => seen.has(a)), ...[...seen].filter((a) => !NUMERIC_AXES.includes(a))];
   return ordered.map((a) => AXIS_SHORT[a] ?? a).join(",");
}

function formatText(data) {
   const lines = [];
   const totalTracks = data.scenes.reduce((n, s) => n + s.animations.length, 0);
   const totalKfs = data.scenes.reduce(
      (n, s) => n + s.animations.reduce((m, a) => m + a.keyframes.length, 0),
      0,
   );

   // Group scenes by their top-level scene id (everything before the first
   // dot). Each `useMotion` call creates its own PureScene with an
   // auto-generated `${parent}.${counter}` id; for inspection we want to
   // see them under the human-named parent (`hero`, `title`, …) sorted by
   // start time, in a single linear narrative.
   const buckets = new Map();
   for (const scene of data.scenes) {
      const key = scene.id.split(".")[0];
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(scene);
   }
   const groups = [...buckets.entries()].map(([key, scenes]) => {
      scenes.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
      const start = Math.min(...scenes.map((s) => s.start));
      const end = Math.max(
         start,
         ...scenes.flatMap((s) => s.animations.flatMap((a) => a.keyframes.map((k) => k.time))),
      );
      const trackCount = scenes.reduce((n, s) => n + s.animations.length, 0);
      return { key, scenes, start, end, trackCount };
   });
   groups.sort((a, b) => a.start - b.start);

   lines.push("═".repeat(72));
   lines.push(`  ${data.name ?? data.id}`);
   lines.push(
      `  duration ${fmtTime(data.duration ?? 0)}  ·  ${groups.length} top-level scenes  ·  ${totalTracks} tracks  ·  ${totalKfs} keyframes`,
   );
   lines.push("═".repeat(72));

   const allDiscont = [];

   for (const group of groups) {
      if (sceneFilter && group.key !== sceneFilter) continue;
      lines.push("");
      lines.push(
         `── [${group.key}]  ${fmtTime(group.start)} → ${fmtTime(group.end)}  (${fmtTime(group.end - group.start)})  ·  ${group.trackCount} tracks ──`,
      );

      // Flatten the group's tracks. Annotate each with its sub-scene id only
      // when more than one sub-scene contributes (so we don't add noise for
      // simple top-level scenes).
      const showSubScene = group.scenes.length > 1;
      const flatTracks = group.scenes.flatMap((scene) =>
         scene.animations.map((track) => ({ scene, track })),
      );

      for (const { scene, track } of flatTracks) {
         if (trackFilter && !track.description.toLowerCase().includes(trackFilter.toLowerCase())) continue;
         const axes = summarizeAxes(track.keyframes);
         const subTag = showSubScene ? ` <${scene.id}>` : "";
         lines.push("");
         lines.push(`  · ${track.description}${subTag}`);
         lines.push(`    props=${axes}  keyframes=${track.keyframes.length}`);
         if (track.type === "follow" && track.track) {
            const tensionLabel = track.track.tension == null ? "" : `  tension=${fmtNum(track.track.tension)}`;
            lines.push(
               `    follow=${track.track.kind}  output=${track.track.output}  curve=${track.track.curve ?? "linear"}${tensionLabel}  length=${fmtNum(track.track.length ?? 0)}  waypoints=${track.track.waypoints.length}`,
            );
            for (const waypoint of track.track.waypoints) {
               lines.push(`      waypoint ${formatWaypoint(waypoint)}`);
            }
            for (const part of track.track.parts ?? []) {
               const partTensionLabel = part.tension == null ? "" : ` tension=${fmtNum(part.tension)}`;
               lines.push(
                  `      part ${part.role}=${part.kind} curve=${part.curve ?? "linear"}${partTensionLabel} length=${fmtNum(part.length ?? 0)}`,
               );
               for (const waypoint of part.waypoints ?? []) {
                  lines.push(`        waypoint ${formatWaypoint(waypoint)}`);
               }
            }
         }
         const sorted = [...track.keyframes].sort((a, b) => a.time - b.time);
         const issues = trackBoundaryAnalysis(track.keyframes, driftThreshold);
         const issuesByIndex = new Map(issues.map((i) => [i.keyframeIndex, i]));

         for (let i = 0; i < sorted.length; i++) {
            const kf = sorted[i];
            const prev = i > 0 ? sorted[i - 1] : null;
            const isHold =
               kf.hold === true ||
               (prev &&
                  Object.keys(kf.state).every((axis) => {
                     const a = prev.state[axis];
                     const b = kf.state[axis];
                     if (typeof a === "number" && typeof b === "number") return Math.abs(b - a) < 1e-3;
                     return Object.is(a, b);
                  }));
            const curve = i === 0 ? "—" : transitionLabel(kf.transition);
            const d = deltaSummary(prev?.state, kf.state);
            const issue = issuesByIndex.get(i);
            const issueTag = issue ? "  ⚠ velocity step" : "";
            const dyn = kf.dynamic ? " [dynamic]" : "";
            const timeLabel = fmtTime(kf.time);

            if (isHold) {
               lines.push(`      ${timeLabel.padStart(9)}  (held)${dyn}`);
            } else {
               const curveCol = curve.padEnd(24);
               const stateCol = abbrevState(kf.state);
               lines.push(`      ${timeLabel.padStart(9)}  ${stateCol}${dyn}`);
               if (prev) {
                  lines.push(`              ${curveCol} ${d}${issueTag}`);
               }
            }
         }

         for (const issue of issues) {
            allDiscont.push({ scene: group.key, sceneId: scene.id, track: track.description, ...issue });
         }
      }

      // Text tracks + effects (compact, not the focus).
      const textTracks = group.scenes.flatMap((s) => s.textTracks);
      const effects = group.scenes.flatMap((s) => s.effects);
      for (const tt of textTracks) {
         lines.push("");
         lines.push(`  · text track: ${tt.id}`);
      }
      for (const eff of effects) {
         lines.push("");
         lines.push(`  · effect: ${eff.id} @ ${fmtTime(eff.time)}`);
      }
   }

   lines.push("");
   lines.push("═".repeat(72));
   lines.push(`  velocity discontinuities (>${(driftThreshold * 100).toFixed(0)}% drift, hold→motion ignored)`);
   lines.push("═".repeat(72));
   if (allDiscont.length === 0) {
      lines.push("  (none)");
   } else {
      for (const d of allDiscont) {
         lines.push("");
         lines.push(
            `  ${d.scene} · ${d.track}  kf#${d.keyframeIndex} @ ${fmtTime(d.time)}  [${d.curveIn} → ${d.curveOut}]`,
         );
         for (const o of d.offenders) {
            lines.push(
               `    ${o.axis.padEnd(10)} vIn=${fmtNum(o.vIn).padStart(7)}  vOut=${fmtNum(o.vOut).padStart(7)}  ${o.driftPct.toFixed(0)}% step`,
            );
         }
      }
   }

   return lines.join("\n");
}

// -----------------------------------------------------------------------
// main
// -----------------------------------------------------------------------
async function main() {
   try {
      const data = await loadTimeline();

      // Compute boundary issues per track and attach to JSON output.
      for (const scene of data.scenes) {
         for (const track of scene.animations) {
            track.discontinuities = trackBoundaryAnalysis(track.keyframes, driftThreshold);
         }
      }

      if (asJson) {
         process.stdout.write(JSON.stringify(data, null, 2));
         process.stdout.write("\n");
      } else {
         process.stdout.write(formatText(data));
         process.stdout.write("\n");
      }
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
