import type {
   BezierHandleLike,
   BezierTransitionOptions,
   FollowTrack,
   MotionElementBinding,
   MotionStyle,
   MotionStateLike,
   PoseKeyframe,
   ProgressKeyframe,
   ProgressStateLike,
} from "./functionTimeMotion";
import {
   effectiveKeyframeTime,
   isHoldKeyframe,
   isPinKeyframe,
   pose,
   progressPose,
   resolveMotionState,
   resolveProgressState,
   sampleTrackStyle,
} from "./functionTimeMotion";
import { cameraPlaneMatrix } from "./ui";
import type { CameraPlaneSize, CameraPlaneView } from "./ui";

/**
 * Subset of the GSAP-Timeline shape that the React shell + capture harness
 * read from `window.lfTimeline`. Kept intentionally small so the runtime is
 * a single self-contained module — no GSAP dependency.
 */
/**
 * View of a single keyframe surfaced to the timeline UI. `time` is absolute
 * (root-relative seconds), `localTime` is relative to the tween's first
 * keyframe so authors can read it as "0.42s into this track".
 */
export type PureKeyframeView = {
   time: number;
   localTime: number;
   /** Reserved for keyframes whose display time differs from authored time. */
   effectiveTime: number | null;
   /** Property name → display string (e.g. `"opacity": "0.5"`, `"color": "rgb(...)"`). */
   state: Record<string, string>;
   /** True when the segment arriving at this keyframe is an intentional static hold. */
   hold: boolean;
   /** Keyframe role in the motion model. */
   kind: PoseKeyframe["kind"];
   /** Bezier handle label for the segment arriving at this keyframe. */
   curve: string | null;
   /** Raw transition preset, for timeline graphing. */
   transitionData: BezierTransitionOptions | null;
   /**
    * True when the keyframe state is a thunk — re-evaluated every frame the
    * runtime samples it. The snapshot in `state` is build-time only.
    */
   dynamic: boolean;
};

export type PureTimelineChild = {
   _label: string;
   _hue: number;
   _start: number;
   _duration: number;
   _props: Record<string, unknown>;
   keyframes: PureKeyframeView[];
   startTime(): number;
   duration(): number;
   totalDuration(): number;
   targets(): unknown[];
   data: { label: string };
   vars: Record<string, unknown>;
};

export type PureTimeline = {
   readonly vars: Record<string, unknown>;
   readonly data: { label: string };
   readonly labels: Record<string, number>;
   duration(): number;
   totalDuration(): number;
   progress(value?: number, suppressEvents?: boolean): number;
   time(value?: number): number;
   seek(seconds: number, suppressEvents?: boolean): PureTimeline;
   paused(value?: boolean): boolean;
   pause(): PureTimeline;
   resume(): PureTimeline;
   restart(includeDelay?: boolean): PureTimeline;
   kill(): PureTimeline;
   eventCallback(name: string, fn: () => void): PureTimeline;
   getChildren(nested?: boolean, tweens?: boolean, timelines?: boolean): PureTimelineChild[];
};

export type PureSceneAnimation = {
   description: string;
   bind: MotionElementBinding;
   keyframes: PoseKeyframe[];
   /** True if any keyframe specifies a transform component. Otherwise we leave element transforms untouched. */
   touchesTransform: boolean;
};

export type PureSceneFollowTrack = {
   description: string;
   bind: MotionElementBinding;
   track: FollowTrack;
   keyframes: ProgressKeyframe[];
   touchesTransform: true;
};

export type PureSceneEffect = {
   id: string;
   time: number;
   fn: () => void;
};

export type TextTrackTime = {
   /** Absolute time in seconds since the animation's t=0. */
   absolute: number;
   /** Time in seconds since the enclosing scene's start (`absolute - scene.start`). */
   local: number;
};

export type PureSceneTextTrack = {
   id: string;
   bind: MotionElementBinding;
   /** Returns text content for the given times. */
   write: (times: TextTrackTime) => string;
};

export type TypewriteOptions = {
   /** The full text the typewriter eventually displays. */
   text: string;
   /** Absolute time at which typing begins. Use `scene.start + offset`. */
   from: number;
   /** Absolute time at which typing finishes. Either `to` or `duration` is required. */
   to?: number;
   /** Type-out duration in seconds. Either `to` or `duration` is required. */
   duration?: number;
   /**
    * Optional absolute time at which the text reverts to "". Use this when the
    * typewriter content is displayed and then visually replaced — e.g. a chat
    * composer prompt that disappears once it's been "sent" as a bubble.
    */
   clearAt?: number;
};

const TRANSFORM_KEYS: readonly (keyof MotionStyle)[] = [
   "x",
   "y",
   "z",
   "scale",
   "rotationX",
   "rotationY",
   "rotationZ",
   "matrix3d",
   "cameraFromX",
   "cameraFromY",
   "cameraFromZ",
   "cameraTargetX",
   "cameraTargetY",
   "cameraDistance",
   "cameraRoll",
   "cameraNaturalRoll",
] as const;

const CAMERA_TRANSFORM_KEYS: readonly (keyof MotionStyle)[] = [
   "cameraFromX",
   "cameraFromY",
   "cameraFromZ",
   "cameraTargetX",
   "cameraTargetY",
   "cameraDistance",
   "cameraRoll",
   "cameraNaturalRoll",
] as const;

function trackTouchesTransform(keyframes: PoseKeyframe[]): boolean {
   for (const frame of keyframes) {
      // Lazy-state keyframes (thunks) might produce transform components at
      // runtime — be conservative and assume they do. Worst case is we set an
      // identity transform on the element each frame, which is harmless.
      if (typeof frame.state === "function") return true;
      for (const key of TRANSFORM_KEYS) {
         if ((frame.state as MotionStyle)[key] !== undefined) return true;
      }
   }
   return false;
}

function styleHasCameraTransform(style: MotionStyle) {
   return CAMERA_TRANSFORM_KEYS.some((key) => style[key] !== undefined);
}

function cameraPlaneSizeForElement(el: HTMLElement): CameraPlaneSize | null {
   const width = el.offsetWidth || el.parentElement?.clientWidth || 0;
   const height = el.offsetHeight || el.parentElement?.clientHeight || 0;
   if (width <= 0 || height <= 0) return null;
   return { width, height };
}

function cameraViewFromStyle(style: MotionStyle): CameraPlaneView {
   return {
      from: {
         x: style.cameraFromX ?? 0.5,
         y: style.cameraFromY ?? 0.5,
         z: style.cameraFromZ ?? 1,
      },
      target: {
         x: style.cameraTargetX ?? 0.5,
         y: style.cameraTargetY ?? 0.5,
      },
      distance: style.cameraDistance,
      roll: style.cameraRoll,
      naturalRoll: style.cameraNaturalRoll === undefined ? undefined : style.cameraNaturalRoll >= 0.5,
   };
}

function applyStyle(el: HTMLElement, style: MotionStyle, touchesTransform: boolean) {
   if (style.opacity !== undefined) el.style.opacity = String(style.opacity);
   if (style.color) el.style.color = style.color;
   if (style.backgroundColor) el.style.backgroundColor = style.backgroundColor;
   if (style.borderColor) el.style.borderColor = style.borderColor;
   if (style.fontSize !== undefined) el.style.fontSize = `${style.fontSize}px`;
   if (style.lineHeight !== undefined) el.style.lineHeight = `${style.lineHeight}px`;
   if (style.fontSize !== undefined) el.style.fontSize = `${style.fontSize}px`;
   if (style.lineHeight !== undefined) el.style.lineHeight = `${style.lineHeight}px`;
   if (style.maxHeight !== undefined) el.style.maxHeight = `${style.maxHeight}px`;
   if (touchesTransform) {
      el.style.willChange = "transform";

      if (isMatrix3d(style.matrix3d)) {
         el.style.transform = `matrix3d(${style.matrix3d.map((value) => Number(value.toPrecision(12))).join(", ")})`;
         el.style.transformOrigin = "0 0";
         el.style.transformStyle = "preserve-3d";
         return;
      }

      if (styleHasCameraTransform(style)) {
         const size = cameraPlaneSizeForElement(el);
         el.style.transform = size ? cameraPlaneMatrix(cameraViewFromStyle(style), size) : "none";
         el.style.transformOrigin = "0 0";
         el.style.transformStyle = "preserve-3d";
         return;
      }

      const x = style.x ?? 0;
      const y = style.y ?? 0;
      const z = style.z ?? 0;
      const scale = style.scale ?? 1;
      const rotationX = style.rotationX ?? 0;
      const rotationY = style.rotationY ?? 0;
      const rotationZ = style.rotationZ ?? 0;
      el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(${rotationZ}deg)`;
   }
}

function isMatrix3d(value: unknown): value is number[] {
   return Array.isArray(value) && value.length === 16 && value.every((entry) => typeof entry === "number");
}

export type PureScene = {
   readonly id: string;
   /**
    * Absolute time in seconds at which this scene begins. All animation,
    * text, and effect times must be `>= start` — the scene cannot describe
    * motion that happens before it exists. Use `scene.start + offset` to
    * express scene-relative times.
    */
   readonly start: number;
   /** Add a styled animation for the given binding. */
   animate(description: string, bind: MotionElementBinding, keyframes: PoseKeyframe[]): PureScene;
   /** Follow a spatial track by animating scalar progress through the track. */
   follow(
      description: string,
      bind: MotionElementBinding,
      track: FollowTrack,
      progressKeyframes: (PoseKeyframe | ProgressKeyframe)[],
   ): PureScene;
   /**
    * Add a text-content-over-time track. The writer is called every frame with
    * both `absolute` time and `local` time (= `absolute - scene.start`); use
    * whichever is more convenient. For typewriters use `typewrite` instead.
    */
   text(id: string, bind: MotionElementBinding, write: (times: TextTrackTime) => string): PureScene;
   /**
    * Type a string into an element from `from` to `to` (or `from` for
    * `duration` seconds), holding the full text after. Optionally clear the
    * text at `clearAt`.
    */
   typewrite(id: string, bind: MotionElementBinding, opts: TypewriteOptions): PureScene;
   /** Add a discrete effect that fires when the timeline reaches the given local time. */
   effect(id: string, time: number, fn: () => void): PureScene;
   /** Read-only access for host integration. */
   readonly animations: PureSceneAnimation[];
   readonly followTracks: PureSceneFollowTrack[];
   readonly textTracks: PureSceneTextTrack[];
   readonly effects: PureSceneEffect[];
};

function formatTime(value: number) {
   return Number.isFinite(value) ? Number(value.toFixed(4)).toString() : String(value);
}

function assertTimeAfterStart(sceneId: string, label: string, time: number, start: number) {
   if (time < start) {
      throw new Error(
         `[motion/scene "${sceneId}"] ${label} ${formatTime(time)} is before scene start (${formatTime(start)}). ` +
            `Did you mean scene.start + ${formatTime(time)}?`,
      );
   }
}

/**
 * Reject `scene.animate(...)` calls where two keyframes resolve to the same
 * time. This usually means the author wrote two `at(...)` rows whose time
 * arithmetic happens to collide (e.g. `at(t + a + b)` and `at(t + c)` where
 * `a + b === c`). Such pairs are dead code: `pose()` only ever uses one as
 * the segment boundary, and the timeline editor's keyframe inspector renders
 * both as separate rows — which causes scrubbing through them to feel
 * "stuck" because a chunk of vertical drag space maps to zero seconds.
 *
 * Tolerance is intentionally tight (0.1ms): legitimately-near keyframes that
 * differ by a single sub-frame are not flagged.
 */
const DUPLICATE_KEYFRAME_EPSILON = 1e-4;
function assertNoDuplicateKeyframeTimes(sceneId: string, description: string, keyframes: PoseKeyframe[]) {
   if (keyframes.length < 2) return;
   const sorted = keyframes
      .map((frame, index) => ({ frame, index }))
      .filter(({ frame }) => isPinKeyframe(frame))
      .sort((a, b) => a.frame.time - b.frame.time || a.index - b.index);
   for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (Math.abs(curr.frame.time - prev.frame.time) <= DUPLICATE_KEYFRAME_EPSILON) {
         throw new Error(
            `[motion/scene "${sceneId}"] animate("${description}") has two keyframes at the same time ` +
               `(${formatTime(curr.frame.time)}s — at index ${prev.index} and ${curr.index}). ` +
               `Drop one, or move them apart so each represents a distinct moment.`,
         );
      }
   }
}

function normalizeHoldKeyframes(sceneId: string, description: string, keyframes: PoseKeyframe[]): PoseKeyframe[] {
   if (keyframes.length < 2) return keyframes;
   const sorted = orderKeyframesForScene(keyframes);
   const normalized = new Map<number, PoseKeyframe>();

   for (let i = 0; i < sorted.length; i++) {
      const { frame, index } = sorted[i];
      if (!isHoldKeyframe(frame)) {
         normalized.set(index, frame);
         continue;
      }
      if (i === 0) {
         throw new Error(
            `[motion/scene "${sceneId}"] animate("${description}") starts with hold(...) at ` +
               `${formatTime(frame.time)}s. The first keyframe initializes pose; use at(...) instead.`,
         );
      }
      if (frame.transition != null) {
         throw new Error(
            `[motion/scene "${sceneId}"] animate("${description}") marks ${formatTime(frame.time)}s as hold(...), ` +
               `but also provides a transition. Holds are static; use hold(time) with no transition.`,
         );
      }
      if (typeof frame.state === "function" || Object.keys(resolveMotionState(frame.state)).length > 0) {
         throw new Error(
            `[motion/scene "${sceneId}"] animate("${description}") marks ${formatTime(frame.time)}s as hold(...), ` +
               `but also provides state. Holds infer the previous pose; use hold(time).`,
         );
      }

      const previous = normalized.get(sorted[i - 1].index) ?? sorted[i - 1].frame;
      normalized.set(index, { ...frame, state: previous.state });
   }

   return keyframes.map((frame, index) => normalized.get(index) ?? frame);
}

function canResolveLiteralState(state: MotionStateLike): state is MotionStyle {
   return typeof state !== "function";
}

function declaredStateHasNoChanges(prev: MotionStyle, curr: MotionStyle): boolean {
   const keys = Object.keys(curr);
   if (keys.length === 0) return true;
   for (const key of keys) {
      if (!Object.is((prev as Record<string, unknown>)[key], (curr as Record<string, unknown>)[key])) return false;
   }
   return true;
}

function assertHoldsAreExplicit(sceneId: string, description: string, keyframes: PoseKeyframe[]) {
   if (keyframes.length < 2) return;
   const sorted = orderKeyframesForScene(keyframes);

   for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!canResolveLiteralState(prev.frame.state) || !canResolveLiteralState(curr.frame.state)) continue;
      const noChanges = declaredStateHasNoChanges(
         resolveMotionState(prev.frame.state),
         resolveMotionState(curr.frame.state),
      );
      if (noChanges && !isHoldKeyframe(curr.frame)) {
         throw new Error(
            `[motion/scene "${sceneId}"] animate("${description}") has a no-op keyframe segment ` +
               `${formatTime(prev.frame.time)}s → ${formatTime(curr.frame.time)}s (indices ${prev.index} → ${curr.index}). ` +
               `Use hold(${formatTime(curr.frame.time)}) to mark an intentional static hold.`,
         );
      }
      if (!noChanges && isHoldKeyframe(curr.frame)) {
         throw new Error(
            `[motion/scene "${sceneId}"] animate("${description}") marks ${formatTime(curr.frame.time)}s as hold(...), ` +
               `but its state changes from the previous keyframe. Use at(...) for motion keyframes.`,
         );
      }
   }
}

function orderKeyframesForScene(keyframes: PoseKeyframe[]) {
   return keyframes
      .map((frame, index) => ({ frame, index }))
      .sort((a, b) => a.frame.time - b.frame.time || a.index - b.index);
}

function isProgressStateLike(state: unknown): state is ProgressStateLike {
   return typeof state === "number" || typeof state === "function";
}

function normalizeProgressHoldKeyframes(
   sceneId: string,
   description: string,
   keyframes: (PoseKeyframe | ProgressKeyframe)[],
): ProgressKeyframe[] {
   if (keyframes.length === 0) {
      throw new Error(`[motion/scene "${sceneId}"] follow("${description}") requires at least one progress keyframe.`);
   }
   const sorted = orderKeyframesForScene(keyframes as PoseKeyframe[]);
   const normalized = new Map<number, ProgressKeyframe>();

   for (let i = 0; i < sorted.length; i++) {
      const { frame, index } = sorted[i];
      if (isHoldKeyframe(frame)) {
         if (i === 0) {
            throw new Error(
               `[motion/scene "${sceneId}"] follow("${description}") starts with hold(...) at ` +
                  `${formatTime(frame.time)}s. The first keyframe initializes progress; use at(...) instead.`,
            );
         }
         const previous = normalized.get(sorted[i - 1].index);
         if (!previous) {
            throw new Error(`[motion/scene "${sceneId}"] follow("${description}") could not resolve hold state.`);
         }
         normalized.set(index, { ...frame, state: previous.state } as ProgressKeyframe);
         continue;
      }

      if (!isProgressStateLike(frame.state)) {
         throw new Error(
            `[motion/scene "${sceneId}"] follow("${description}") expects numeric progress keyframes. ` +
               `Use at(time, track.progress.foo) or at(time, track.progressAt(index)).`,
         );
      }

      normalized.set(index, frame as ProgressKeyframe);
   }

   const out = keyframes.map((frame, index) => normalized.get(index) ?? (frame as ProgressKeyframe));
   for (const frame of out) {
      const value = resolveProgressState(frame.state);
      if (!Number.isFinite(value)) {
         throw new Error(`[motion/scene "${sceneId}"] follow("${description}") resolved non-finite progress ${value}.`);
      }
   }
   return out;
}

export function createPureScene(id: string, start = 0): PureScene {
   const animations: PureSceneAnimation[] = [];
   const followTracks: PureSceneFollowTrack[] = [];
   const textTracks: PureSceneTextTrack[] = [];
   const effects: PureSceneEffect[] = [];

   const api: PureScene = {
      id,
      start,
      animate(description, bind, keyframes) {
         for (const frame of keyframes) {
            assertTimeAfterStart(id, `keyframe time for "${description}"`, frame.time, start);
         }
         assertNoDuplicateKeyframeTimes(id, description, keyframes);
         const normalizedKeyframes = normalizeHoldKeyframes(id, description, keyframes);
         assertHoldsAreExplicit(id, description, normalizedKeyframes);
         animations.push({
            description,
            bind,
            keyframes: normalizedKeyframes,
            touchesTransform: trackTouchesTransform(normalizedKeyframes),
         });
         return api;
      },
      follow(description, bind, track, progressKeyframes) {
         for (const frame of progressKeyframes) {
            assertTimeAfterStart(id, `progress keyframe time for "${description}"`, frame.time, start);
         }
         assertNoDuplicateKeyframeTimes(id, description, progressKeyframes as PoseKeyframe[]);
         const normalizedKeyframes = normalizeProgressHoldKeyframes(id, description, progressKeyframes);
         followTracks.push({
            description,
            bind,
            track,
            keyframes: normalizedKeyframes,
            touchesTransform: true,
         });
         return api;
      },
      text(trackId, bind, write) {
         textTracks.push({ id: trackId, bind, write });
         return api;
      },
      typewrite(trackId, bind, opts) {
         const from = opts.from;
         const to = opts.to ?? (opts.duration != null ? from + opts.duration : null);
         if (to == null) {
            throw new Error(`[motion/scene "${id}"] typewrite "${trackId}" requires either \`to\` or \`duration\``);
         }
         if (to < from) {
            throw new Error(
               `[motion/scene "${id}"] typewrite "${trackId}" has \`to\` (${formatTime(to)}) before \`from\` (${formatTime(from)})`,
            );
         }
         assertTimeAfterStart(id, `typewrite "${trackId}" from`, from, start);
         assertTimeAfterStart(id, `typewrite "${trackId}" to`, to, start);
         if (opts.clearAt != null) {
            assertTimeAfterStart(id, `typewrite "${trackId}" clearAt`, opts.clearAt, start);
         }
         const dur = Math.max(0, to - from);
         const text = opts.text;
         const len = text.length;
         const clearAt = opts.clearAt;
         textTracks.push({
            id: trackId,
            bind,
            write({ absolute }) {
               if (absolute < from) return "";
               if (clearAt != null && absolute >= clearAt) return "";
               if (dur === 0 || absolute >= to) return text;
               const progress = (absolute - from) / dur;
               return text.slice(0, Math.round(progress * len));
            },
         });
         return api;
      },
      effect(effectId, time, fn) {
         assertTimeAfterStart(id, `effect "${effectId}" time`, time, start);
         effects.push({ id: effectId, time, fn });
         return api;
      },
      animations,
      followTracks,
      textTracks,
      effects,
   };

   return api;
}

export type PureAnimationOptions = {
   /** Total length of one playthrough in seconds. */
   duration: number;
   /** Delay before restarting the loop. Default 0.6s. */
   loopDelay?: number;
   /** Optional setup hook called once after refs mount and before the first render. */
   setup?: () => void;
   /** Optional reset hook called every time the loop restarts at t=0. */
   onReset?: () => void;
};

export type PureAnimationHandle = {
   readonly fakeTimeline: PureTimeline;
   /** Render a specific local time without changing playback state. */
   renderAt(time: number): void;
   /** Tear down RAF and detach. */
   dispose(): void;
};

type FakeChild = PureTimelineChild;

function stringifyStateValue(v: unknown): string {
   if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, "");
   if (typeof v === "string") return v;
   if (v == null) return String(v);
   try {
      return JSON.stringify(v);
   } catch {
      return String(v);
   }
}

function handleToString(handle: BezierHandleLike | undefined): string | null {
   if (handle == null) return null;
   if (handle === "auto") return "auto";
   const parts: string[] = [];
   if (handle.speed != null) parts.push(`speed=${formatNumber(handle.speed)}`);
   if (handle.velocity != null) parts.push(`velocity=${formatNumber(handle.velocity)}`);
   if (handle.influence != null) parts.push(`influence=${formatNumber(handle.influence)}`);
   return parts.join(" ") || "default";
}

function transitionToString(transition: BezierTransitionOptions | undefined): string | null {
   if (!transition) return null;
   if (transition.jump) return "jump";
   const start = handleToString(transition.start) ?? "linear";
   const end = handleToString(transition.end) ?? "linear";
   return `start(${start}) → end(${end})`;
}

function formatNumber(value: number): string {
   return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
}

function buildKeyframesView(sorted: PoseKeyframe[], start: number): PureKeyframeView[] {
   return sorted.map((frame) => {
      const effectiveTime = effectiveKeyframeTime(frame, sorted);
      const displayTime = Number.isFinite(effectiveTime) ? effectiveTime : frame.time;
      const stateOut: Record<string, string> = {};
      // Resolve thunks once at build time so the timeline UI has SOMETHING to
      // show. The runtime still re-resolves on every frame for actual
      // interpolation; this snapshot is for the inspector display only.
      let snapshot: MotionStyle;
      try {
         snapshot = resolveMotionState(frame.state);
      } catch {
         snapshot = {};
      }
      for (const [key, value] of Object.entries(snapshot)) {
         stateOut[key] = stringifyStateValue(value);
      }
      return {
         time: displayTime,
         localTime: displayTime - start,
         effectiveTime: null,
         state: stateOut,
         curve: transitionToString(frame.transition),
         hold: isHoldKeyframe(frame),
         kind: frame.kind,
         transitionData: frame.transition ?? null,
         /** True if the runtime will re-evaluate this state every frame. */
         dynamic: typeof frame.state === "function",
      };
   });
}

function buildProgressKeyframesView(sorted: ProgressKeyframe[], start: number): PureKeyframeView[] {
   return sorted.map((frame) => {
      let value = 0;
      try {
         value = resolveProgressState(frame.state);
      } catch {
         value = Number.NaN;
      }
      return {
         time: frame.time,
         localTime: frame.time - start,
         effectiveTime: null,
         state: { progress: stringifyStateValue(value) },
         curve: transitionToString(frame.transition),
         hold: isHoldKeyframe(frame as PoseKeyframe),
         kind: frame.kind,
         transitionData: frame.transition ?? null,
         dynamic: typeof frame.state === "function",
      };
   });
}

function makeFakeChildFromAnimation(animation: PureSceneAnimation, sceneStart: number): FakeChild | null {
   if (animation.keyframes.length < 2) return null;
   const sorted = [...animation.keyframes].sort(
      (a, b) => effectiveKeyframeTime(a, animation.keyframes) - effectiveKeyframeTime(b, animation.keyframes),
   );
   const pinned = sorted.filter(isPinKeyframe);
   if (pinned.length < 2) return null;
   const start = pinned[0].time + sceneStart;
   const end = pinned[pinned.length - 1].time + sceneStart;
   const duration = Math.max(0, end - start);
   if (duration <= 0) return null;
   const props: Record<string, unknown> = {};
   for (const frame of sorted) {
      try {
         Object.assign(props, resolveMotionState(frame.state));
      } catch {
         /* thunk threw at build time — fine, it'll resolve at runtime */
      }
   }
   const targetEl = (() => {
      try {
         return animation.bind.current();
      } catch {
         return null;
      }
   })();
   return {
      _label: animation.description,
      _hue: 200,
      _start: start,
      _duration: duration,
      _props: props,
      keyframes: buildKeyframesView(sorted, start),
      startTime: () => start,
      duration: () => duration,
      totalDuration: () => duration,
      targets: () => (targetEl ? [targetEl] : []),
      data: { label: animation.description },
      vars: { id: animation.description, ...props },
   };
}

function makeFakeChildFromFollowTrack(follow: PureSceneFollowTrack, sceneStart: number): FakeChild | null {
   if (follow.keyframes.length < 2) return null;
   const sorted = [...follow.keyframes].sort((a, b) => a.time - b.time);
   const start = sorted[0].time + sceneStart;
   const end = sorted[sorted.length - 1].time + sceneStart;
   const duration = Math.max(0, end - start);
   if (duration <= 0) return null;
   const targetEl = (() => {
      try {
         return follow.bind.current();
      } catch {
         return null;
      }
   })();
   return {
      _label: follow.description,
      _hue: 165,
      _start: start,
      _duration: duration,
      _props: { progress: true, track: follow.track.kind },
      keyframes: buildProgressKeyframesView(sorted, start),
      startTime: () => start,
      duration: () => duration,
      totalDuration: () => duration,
      targets: () => (targetEl ? [targetEl] : []),
      data: { label: follow.description },
      vars: { id: follow.description, progress: true, track: follow.track.kind },
   };
}

function safeRunEffect(fn: () => void) {
   try {
      fn();
   } catch (err) {
      console.error("[motion/pure] effect threw:", err);
   }
}

/**
 * Run a pure scene as the iframe's "current timeline". Returns a GSAPTimeline-shaped
 * object the existing host shell expects — pause/resume/progress/seek/etc. — plus
 * a hook to render a specific time without playback.
 */
export function runPureAnimation(scenes: PureScene[], options: PureAnimationOptions): PureAnimationHandle {
   const loopDelay = options.loopDelay ?? 0.6;
   const totalDuration = Math.max(0, options.duration);

   const state = {
      time: 0,
      paused: false,
      lastTime: -1,
      raf: 0 as number | 0,
      lastFrameMs: 0,
      onComplete: null as null | (() => void),
      disposed: false,
      delayHoldMs: 0,
   };

   let firstRender = true;

   function resetEffectsForTime(targetTime: number) {
      // Effects are fire-on-cross-forward. After a backward jump (or initial render),
      // we want a clean replay of effects whose time <= targetTime so the DOM ends
      // up in the right "side effect" state. Effects must therefore be idempotent.
      for (const scene of scenes) {
         for (const effect of scene.effects) {
            if (effect.time <= targetTime) safeRunEffect(effect.fn);
         }
      }
   }

   function renderTracks(targetTime: number) {
      for (const scene of scenes) {
         const pendingStyles = new Map<HTMLElement, { style: MotionStyle; touchesTransform: boolean }>();
         const queueStyle = (el: HTMLElement, style: MotionStyle, touchesTransform: boolean) => {
            const existing = pendingStyles.get(el);
            if (existing) {
               Object.assign(existing.style, style);
               existing.touchesTransform = existing.touchesTransform || touchesTransform;
            } else {
               pendingStyles.set(el, { style: { ...style }, touchesTransform });
            }
         };

         for (const animation of scene.animations) {
            const el = animation.bind.current();
            const style = pose(targetTime, animation.keyframes);
            queueStyle(el, style, animation.touchesTransform);
         }
         for (const follow of scene.followTracks) {
            const el = follow.bind.current();
            const progress = progressPose(targetTime, follow.keyframes);
            const style = sampleTrackStyle(follow.track, progress);
            queueStyle(el, style, follow.touchesTransform);
         }
         for (const [el, pending] of pendingStyles) {
            applyStyle(el, pending.style, pending.touchesTransform);
         }
         for (const tt of scene.textTracks) {
            const el = tt.bind.current();
            el.textContent = tt.write({ absolute: targetTime, local: targetTime - scene.start });
         }
      }
   }

   function fireForwardEffects(prev: number, next: number) {
      if (prev === next) return;
      const ascending = next > prev;
      if (!ascending) {
         // Backward — defer to resetEffectsForTime which will be invoked by the seek path.
         return;
      }
      for (const scene of scenes) {
         for (const effect of scene.effects) {
            if (effect.time > prev && effect.time <= next) safeRunEffect(effect.fn);
         }
      }
   }

   function render(targetTime: number, mode: "tick" | "seek") {
      if (firstRender) {
         options.setup?.();
         firstRender = false;
      }
      if (mode === "seek") {
         options.onReset?.();
         resetEffectsForTime(targetTime);
      } else {
         fireForwardEffects(state.lastTime, targetTime);
      }
      renderTracks(targetTime);
      state.lastTime = targetTime;
   }

   function tick(now: number) {
      if (state.disposed) return;
      if (!state.paused) {
         if (state.lastFrameMs === 0) state.lastFrameMs = now;
         const deltaMs = now - state.lastFrameMs;
         state.lastFrameMs = now;
         if (state.delayHoldMs > 0) {
            state.delayHoldMs -= deltaMs;
            if (state.delayHoldMs <= 0) {
               state.delayHoldMs = 0;
               state.time = 0;
               render(0, "seek");
               state.onComplete?.();
            }
         } else {
            state.time = state.time + deltaMs / 1000;
            if (state.time >= totalDuration) {
               render(totalDuration, "tick");
               state.delayHoldMs = loopDelay * 1000;
            } else {
               render(state.time, "tick");
            }
         }
      }
      state.raf = requestAnimationFrame(tick);
   }

   const fakeTimeline = {
      _scenes: scenes,
      _state: state,
      vars: {},
      data: { label: "pure-root" },
      labels: {} as Record<string, number>,
      duration() {
         return totalDuration;
      },
      totalDuration() {
         return totalDuration;
      },
      progress(value?: number, _suppressEvents?: boolean) {
         if (typeof value === "number") {
            const clamped = Math.max(0, Math.min(1, value));
            state.time = clamped * totalDuration;
            state.delayHoldMs = 0;
            render(state.time, "seek");
            return clamped;
         }
         return totalDuration > 0 ? state.time / totalDuration : 0;
      },
      time(value?: number) {
         if (typeof value === "number") {
            state.time = Math.max(0, Math.min(totalDuration, value));
            state.delayHoldMs = 0;
            render(state.time, "seek");
            return state.time;
         }
         return state.time;
      },
      seek(seconds: number, _suppressEvents?: boolean) {
         state.time = Math.max(0, Math.min(totalDuration, seconds));
         state.delayHoldMs = 0;
         render(state.time, "seek");
         return this;
      },
      paused(value?: boolean) {
         if (typeof value === "boolean") state.paused = value;
         return state.paused;
      },
      pause() {
         state.paused = true;
         return this;
      },
      resume() {
         state.paused = false;
         state.lastFrameMs = 0;
         return this;
      },
      restart(_includeDelay?: boolean) {
         state.time = 0;
         state.delayHoldMs = 0;
         state.paused = false;
         state.lastFrameMs = 0;
         render(0, "seek");
         return this;
      },
      kill() {
         state.disposed = true;
         if (state.raf) cancelAnimationFrame(state.raf);
         return this;
      },
      eventCallback(name: string, fn: () => void) {
         if (name === "onComplete") state.onComplete = fn;
         return this;
      },
      getChildren(_nested = false, _tweens = true, _timelines = true) {
         const children: FakeChild[] = [];
         for (const scene of scenes) {
            for (const animation of scene.animations) {
               const child = makeFakeChildFromAnimation(animation, 0);
               if (child) children.push(child);
            }
            for (const follow of scene.followTracks) {
               const child = makeFakeChildFromFollowTrack(follow, 0);
               if (child) children.push(child);
            }
         }
         return children;
      },
   } as unknown as PureTimeline;

   render(0, "seek");
   state.raf = requestAnimationFrame(tick);

   return {
      fakeTimeline,
      renderAt(time: number) {
         state.time = time;
         render(time, "seek");
      },
      dispose() {
         state.disposed = true;
         if (state.raf) cancelAnimationFrame(state.raf);
      },
   };
}
