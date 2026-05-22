import { useEffect, useRef, useState } from "react";
import type { PureKeyframeView, PureTimeline } from "@framework";

export type TimelineChild = {
   /**
    * Stable path key within the current snapshot, like "0" or "0.2.1".
    * Path segments are the child index at each tree depth — stable across
    * renders within a single timeline instance and used for expansion /
    * focus state that survives re-renders.
    */
   key: string;
   kind: "tween" | "timeline";
   label: string;
   /** Seconds, relative to parent start. */
   start: number;
   /** Absolute seconds from the root timeline's t=0. Convenience for render. */
   absoluteStart: number;
   /** Seconds. For tweens with repeat, reflects totalDuration. */
   duration: number;
   /** Nesting depth (0 = direct child of root). */
   depth: number;
   /** 0–360, derived from label so same-label bars share a color across rebuilds. */
   hue: number;
   /**
    * Recursive children if this row is a sub-timeline; `null` for leaves
    * and for empty sub-timelines. Drives folder expand/collapse in the UI.
    */
   children: TimelineChild[] | null;
   /**
    * Live DOM reference into the animation iframe for the tween's first
    * target, if any. Used by the parent shell to render a selection halo on
    * top of the canvas. `null` for sub-timelines and zero-target tweens.
    */
   targetEl: Element | null;
   /** Extra fields surfaced in the detail panel — not used for rendering bars. */
   detail: TimelineChildDetail;
};

export type TimelineChildDetail = {
   /** Per-target short selector. */
   targets: string[];
   /** List of animated property names (target-dependent vars with control keys stripped). */
   props: string[];
   /** Display-friendly { prop: stringified value } pairs, from vars. */
   propValues: Record<string, string>;
   /** GSAP ease name. */
   ease: string | null;
   /** Repeat count (from vars), if non-zero. */
   repeat: number;
   /** Stagger (number or string), if present. */
   stagger: string | null;
   /** Whether the child is a sub-timeline. */
   isTimeline: boolean;
   /** Nested tween count for sub-timelines. */
   nestedCount: number;
   /**
    * Per-keyframe view, present for native pure tweens. `null` for sub-
    * timelines (their children carry their own keyframes).
    */
   keyframes: PureKeyframeView[] | null;
};

export type TimelineSnapshot = {
   children: TimelineChild[];
   labels: { name: string; t: number }[];
   /** Timeline's total duration at snapshot time. */
   duration: number;
};

export type TimelineState = {
   present: boolean;
   snapshot: TimelineSnapshot | null;
   progress: number;
   time: number;
   duration: number;
   paused: boolean;
};

type FrameHost = Window & {
   lfTimeline?: PureTimeline;
};

function hashHue(s: string): number {
   let h = 0;
   for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
   return Math.abs(h) % 360;
}

function describeEl(el: Element): string {
   if (el.id) return `#${el.id}`;
   const tag = el.tagName.toLowerCase();
   const cls =
      typeof el.className === "string" && el.className
         ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
         : "";
   return `${tag}${cls}`;
}

function describeTargets(targets: unknown[]): string {
   if (!targets || targets.length === 0) return "—";
   const first = targets[0];
   let head = "?";
   if (first instanceof Element) head = describeEl(first);
   else if (first && typeof first === "object") head = "obj";
   else head = String(first);
   return targets.length > 1 ? `${head} +${targets.length - 1}` : head;
}

function describeTargetList(targets: unknown[]): string[] {
   if (!targets) return [];
   const out: string[] = [];
   for (const t of targets) {
      if (t instanceof Element) out.push(describeEl(t));
      else if (t && typeof t === "object") out.push("object");
      else out.push(String(t));
   }
   return out;
}

function stringifyValue(v: unknown): string {
   if (v == null) return String(v);
   if (typeof v === "function") return "fn()";
   if (typeof v === "string") return v.length > 72 ? v.slice(0, 70) + "…" : v;
   if (typeof v === "number") return String(v);
   if (typeof v === "boolean") return String(v);
   try {
      const s = JSON.stringify(v);
      return s.length > 72 ? s.slice(0, 70) + "…" : s;
   } catch {
      return "…";
   }
}

/**
 * Keys on a GSAP tween vars object that are NOT animated properties —
 * they control timing, callbacks, or lifecycle. Everything else in vars
 * is (probably) a property being tweened.
 */
const GSAP_CONTROL_KEYS = new Set([
   "duration",
   "delay",
   "ease",
   "repeat",
   "yoyo",
   "repeatDelay",
   "yoyoEase",
   "stagger",
   "immediateRender",
   "runBackwards",
   "startAt",
   "keyframes",
   "overwrite",
   "paused",
   "inherit",
   "lazy",
   "callbackScope",
   "onStart",
   "onComplete",
   "onUpdate",
   "onRepeat",
   "onReverseComplete",
   "onInterrupt",
   "onStartParams",
   "onCompleteParams",
   "onUpdateParams",
   "onRepeatParams",
   "onReverseCompleteParams",
   "onInterruptParams",
   "id",
   "data",
   "smoothOrigin",
   "reversed",
   // timeline-only
   "repeatRefresh",
   "parent",
   "scrollTrigger",
   "defaults",
   "autoRemoveChildren",
   "smoothChildTiming",
]);

function animatedProps(vars: unknown): string[] {
   if (!vars || typeof vars !== "object") return [];
   const out: string[] = [];
   for (const k of Object.keys(vars as Record<string, unknown>)) {
      if (GSAP_CONTROL_KEYS.has(k)) continue;
      out.push(k);
   }
   return out;
}

function labelFor(child: any): string {
   const data = child.data;
   if (data && typeof data === "object" && typeof data.label === "string") {
      return data.label;
   }
   const id = child.vars?.id;
   if (typeof id === "string" && id) return id;

   if (typeof child.getChildren === "function") {
      // Sub-timeline. Count its immediate children to give a sense of size.
      const n = child.getChildren(false, true, true).length;
      return `timeline · ${n}`;
   }

   // Leaf tween — build "<target> · <props>".
   let target = "—";
   try {
      target = describeTargets(child.targets?.() ?? []);
   } catch {
      target = "tween";
   }

   const props = animatedProps(child.vars);
   if (props.length === 0) {
      // Probably a .call() / .set() / .addLabel() etc. with no animated props.
      return target;
   }

   // Keep it readable: first 3 props, then "+N".
   const shown = props.slice(0, 3).join(", ");
   const extra = props.length > 3 ? ` +${props.length - 3}` : "";
   return `${target} · ${shown}${extra}`;
}

function detailOf(child: any): TimelineChildDetail {
   const isTimeline = typeof child.getChildren === "function";
   const vars = (child.vars ?? {}) as Record<string, unknown>;
   const props: string[] = [];
   const propValues: Record<string, string> = {};
   for (const k of Object.keys(vars)) {
      if (GSAP_CONTROL_KEYS.has(k)) continue;
      props.push(k);
      propValues[k] = stringifyValue(vars[k]);
   }
   let targets: string[] = [];
   try {
      targets = describeTargetList(child.targets?.() ?? []);
   } catch {
      targets = [];
   }
   const ease = typeof vars.ease === "string" ? vars.ease : null;
   const repeat = typeof vars.repeat === "number" ? vars.repeat : 0;
   const stagger =
      vars.stagger == null
         ? null
         : typeof vars.stagger === "number"
           ? String(vars.stagger)
           : stringifyValue(vars.stagger);
   const nestedCount = isTimeline ? child.getChildren(false, true, true).length : 0;
   const keyframes = Array.isArray(child.keyframes) ? (child.keyframes as PureKeyframeView[]) : null;
   return { targets, props, propValues, ease, repeat, stagger, isTimeline, nestedCount, keyframes };
}

/**
 * Walk a GSAP (timeline | tween) and produce a TimelineChild tree. The
 * `parentAbsStart` parameter is the absolute root-relative time at which
 * this node's local t=0 starts, so each child's `absoluteStart` can be
 * computed in one pass without requiring the UI to walk ancestors.
 */
function walkNode(c: any, pathKey: string, depth: number, parentAbsStart: number): TimelineChild | null {
   const start = c.startTime();
   const dur = typeof c.totalDuration === "function" ? c.totalDuration() : c.duration();
   // Skip zero-duration entries — tl.call / tl.set / 0-length tweens.
   if (!(dur > 0.0001)) return null;

   const isTl = typeof c.getChildren === "function";
   const label = labelFor(c);
   const absoluteStart = parentAbsStart + start;

   let children: TimelineChild[] | null = null;
   if (isTl) {
      const kids = c.getChildren(false, true, true) as any[];
      const collected: TimelineChild[] = [];
      kids.forEach((kid, i) => {
         const node = walkNode(kid, `${pathKey}.${i}`, depth + 1, absoluteStart);
         if (node) collected.push(node);
      });
      children = collected.length > 0 ? collected : null;
   }

   let targetEl: Element | null = null;
   try {
      const targets = typeof c.targets === "function" ? c.targets() : [];
      const first = Array.isArray(targets) ? targets[0] : undefined;
      // Cross-realm safe: nodes from the iframe fail `instanceof Element` in
      // the parent shell because the iframe has its own Element constructor.
      // Duck-type instead.
      if (
         first &&
         typeof first === "object" &&
         typeof (first as { getBoundingClientRect?: unknown }).getBoundingClientRect === "function" &&
         typeof (first as { nodeType?: unknown }).nodeType === "number"
      ) {
         targetEl = first as Element;
      }
   } catch {
      targetEl = null;
   }

   return {
      key: pathKey,
      kind: isTl ? "timeline" : "tween",
      label,
      start,
      absoluteStart,
      duration: Math.max(0, dur),
      depth,
      hue: hashHue(label),
      children,
      targetEl,
      detail: detailOf(c),
   };
}

function snapshotOf(tl: PureTimeline): TimelineSnapshot {
   const topChildren = (tl as any).getChildren(false, true, true) as any[];
   const rows: TimelineChild[] = [];
   topChildren.forEach((c, i) => {
      const node = walkNode(c, String(i), 0, 0);
      if (node) rows.push(node);
   });
   const labels: { name: string; t: number }[] = Object.entries(tl.labels ?? {}).map(([name, t]) => ({
      name,
      t: t as number,
   }));
   return { children: rows, labels, duration: tl.duration() };
}

/**
 * Polls the animation iframe's `lfTimeline` every rAF.
 *
 * - Re-introspects structure (children, labels, duration) only when the
 *   timeline *instance* changes — which happens on loop rebuilds.
 * - Updates dynamic fields (progress/time/paused) every tick.
 */
export function useTimeline(getWindow: () => Window | null): TimelineState {
   const [state, setState] = useState<TimelineState>({
      present: false,
      snapshot: null,
      progress: 0,
      time: 0,
      duration: 0,
      paused: false,
   });
   const lastTlRef = useRef<PureTimeline | null>(null);

   useEffect(() => {
      let raf = 0;
      const tick = () => {
         const win = getWindow() as FrameHost | null;
         const tl = win?.lfTimeline ?? null;
         if (tl) {
            if (tl !== lastTlRef.current) {
               lastTlRef.current = tl;
               const snap = snapshotOf(tl);
               setState({
                  present: true,
                  snapshot: snap,
                  duration: snap.duration,
                  progress: tl.progress(),
                  time: tl.time(),
                  paused: tl.paused(),
               });
            } else {
               const progress = tl.progress();
               const time = tl.time();
               const paused = tl.paused();
               setState((s) => {
                  if (s.present && s.paused === paused && Math.abs(s.progress - progress) < 0.0005) {
                     return s;
                  }
                  return { ...s, present: true, progress, time, paused };
               });
            }
         } else if (lastTlRef.current) {
            lastTlRef.current = null;
            setState({
               present: false,
               snapshot: null,
               progress: 0,
               time: 0,
               duration: 0,
               paused: false,
            });
         }
         raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
   }, [getWindow]);

   return state;
}
