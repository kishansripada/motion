import * as React from "react";

export type MotionStyle = Partial<{
   opacity: number;
   x: number;
   y: number;
   z: number;
   scale: number;
   rotationX: number;
   rotationY: number;
   rotationZ: number;
   matrix3d: number[];
   cameraFromX: number;
   cameraFromY: number;
   cameraFromZ: number;
   cameraTargetX: number;
   cameraTargetY: number;
   cameraDistance: number;
   cameraRoll: number;
   cameraNaturalRoll: number;
   color: string;
   backgroundColor: string;
   borderColor: string;
   fontSize: number;
   lineHeight: number;
   maxHeight: number;
}>;

/**
 * A keyframe state can either be a literal `MotionStyle` (a spreadsheet cell —
 * resolved at the moment the keyframe is authored) or a thunk
 * `() => MotionStyle` (a query — re-resolved by the runtime on every frame
 * the keyframe contributes to interpolation). The thunk form is what makes
 * "follow this element no matter where it is" possible without authoring a
 * snapshot of where it was when you wrote the code.
 */
export type MotionStateLike = MotionStyle | (() => MotionStyle);
export type ProgressStateLike = number | (() => number);

export type BezierHandle = {
   /**
    * Boundary velocity in value/second. Use this when the slope itself matters.
    */
   velocity?: number;
   /**
    * Boundary velocity as a multiple of this segment's average velocity.
    * `0` stops, `1` is linear/natural segment speed, values above `1` carry momentum.
    */
   speed?: number;
   /**
    * Horizontal Bezier handle reach as a fraction of segment duration.
    */
   influence?: number;
};

export type BezierHandleLike = BezierHandle | "auto";

export type BezierTransitionOptions = {
   start?: BezierHandleLike;
   end?: BezierHandleLike;
   jump?: boolean;
};

export type MotionKeyframeOptions = {
   /** Transition from the previous keyframe into this keyframe. */
   transition?: BezierTransitionOptions;
};

export type PoseKeyframe = {
   kind: "pin" | "hold";
   time: number;
   state: MotionStateLike;
   transition?: BezierTransitionOptions;
   /**
    * Marks the segment arriving at this keyframe as an intentional static hold.
    * The held state is inferred from the previous keyframe at scene registration time.
    * Use `hold(time)` instead of hand-authoring a no-op `at(...)` segment.
    */
   hold?: true;
};

export type ProgressKeyframe = Omit<PoseKeyframe, "state"> & {
   state: ProgressStateLike;
};

export function resolveMotionState(state: MotionStateLike): MotionStyle {
   return typeof state === "function" ? state() : state;
}

export function resolveProgressState(state: ProgressStateLike): number {
   return typeof state === "function" ? state() : state;
}

export type MotionElementBinding<T extends HTMLElement = HTMLElement> = {
   id?: string;
   ref: React.RefCallback<T>;
   current(): T;
   props: {
      ref: React.RefCallback<T>;
      "data-motion"?: string;
   };
};

const DEFAULT_BEZIER_INFLUENCE = 1 / 3;

export const curve = {
   linear: (): MotionKeyframeOptions => transitionCurve(1, 1),
   jump: (): MotionKeyframeOptions => ({ transition: { jump: true } }),
   in: (power = 2): MotionKeyframeOptions => transitionCurve(0, power, influenceForIn(power)),
   out: (power = 2): MotionKeyframeOptions => transitionCurve(power, 0, influenceForOut(power)),
   inOut: (power = 2): MotionKeyframeOptions => {
      const influence = inOutInfluence(power);
      return transitionCurve(0, 0, { start: influence, end: influence });
   },
   circOut: (): MotionKeyframeOptions => transitionCurve(14.5, 0.05, { start: 0.05, end: 0.446 }),
   circInOut: (): MotionKeyframeOptions => transitionCurve(0, 0, { start: 0.777, end: 0.777 }),
   backOut: (amount = 1.3): MotionKeyframeOptions => transitionCurve(amount + 3, 0),
   auto: (): MotionKeyframeOptions => ({ transition: { start: "auto", end: "auto" } }),
};

function clamp01(value: number) {
   return Math.max(0, Math.min(1, value));
}

export function at(time: number, state: MotionStateLike, options?: MotionKeyframeOptions): PoseKeyframe;
export function at(time: number, state: ProgressStateLike, options?: MotionKeyframeOptions): ProgressKeyframe;
export function at(
   time: number,
   state: MotionStateLike | ProgressStateLike,
   options?: MotionKeyframeOptions,
): PoseKeyframe | ProgressKeyframe {
   const opts = normalizeKeyframeOptions(options);
   return { kind: "pin", time, state, ...opts } as PoseKeyframe | ProgressKeyframe;
}

export function hold(time: number): PoseKeyframe {
   return { kind: "hold", time, state: {}, hold: true };
}

function normalizeKeyframeOptions(options?: MotionKeyframeOptions): MotionKeyframeOptions {
   if (options == null) return {};
   if ("spatial" in options) {
      throw new Error(
         `[motion] at(..., { spatial }) is no longer supported; use scene.follow(..., xyTrack(...)) for spatial paths.`,
      );
   }
   validateTransition(options.transition);
   return { transition: options.transition };
}

function transitionCurve(
   startSpeed: number,
   endSpeed: number,
   influence: number | { start?: number; end?: number } = DEFAULT_BEZIER_INFLUENCE,
): MotionKeyframeOptions {
   const startInfluence = typeof influence === "number" ? influence : (influence.start ?? DEFAULT_BEZIER_INFLUENCE);
   const endInfluence = typeof influence === "number" ? influence : (influence.end ?? DEFAULT_BEZIER_INFLUENCE);
   return {
      transition: {
         start: { speed: startSpeed, influence: startInfluence },
         end: { speed: endSpeed, influence: endInfluence },
      },
   };
}

function influenceForIn(power: number): { start: number; end: number } {
   if (power <= 3) return { start: DEFAULT_BEZIER_INFLUENCE, end: DEFAULT_BEZIER_INFLUENCE };
   if (power <= 4) return { start: 0.4465, end: 0.263 };
   return { start: 0.533, end: 0.2175 };
}

function influenceForOut(power: number): { start: number; end: number } {
   if (power <= 3) return { start: DEFAULT_BEZIER_INFLUENCE, end: DEFAULT_BEZIER_INFLUENCE };
   if (power <= 4) return { start: 0.263, end: 0.4465 };
   return { start: 0.2125, end: 0.5562 };
}

function inOutInfluence(power: number): number {
   if (power <= 2) return 0.446;
   if (power <= 3) return 0.648;
   if (power <= 4) return 0.766;
   return 0.848;
}

function validateHandle(label: string, handle: BezierHandleLike | undefined) {
   if (handle == null || handle === "auto") return;
   if (handle.speed != null && (!Number.isFinite(handle.speed) || handle.speed < 0)) {
      throw new Error(`[motion] ${label}.speed must be a non-negative finite number, got ${handle.speed}`);
   }
   if (handle.velocity != null && !Number.isFinite(handle.velocity)) {
      throw new Error(`[motion] ${label}.velocity must be a finite number, got ${handle.velocity}`);
   }
   if (
      handle.influence != null &&
      (!Number.isFinite(handle.influence) || handle.influence < 0 || handle.influence > 1)
   ) {
      throw new Error(`[motion] ${label}.influence must be a number between 0 and 1, got ${handle.influence}`);
   }
}

function validateTransition(transition: BezierTransitionOptions | undefined) {
   if (!transition) return;
   validateHandle("transition.start", transition.start);
   validateHandle("transition.end", transition.end);
}

export function isHoldKeyframe(frame: PoseKeyframe): boolean {
   return frame.kind === "hold" || frame.hold === true;
}

export function isPinKeyframe(frame: PoseKeyframe): boolean {
   return true;
}

export type TrackPoint2 = {
   id?: string;
   x: number;
   y: number;
};

export type TrackPoint3 = TrackPoint2 & {
   z: number;
};

export type CircleTrackPoint = {
   id?: string;
   /**
    * Angle in radians using screen-space orientation:
    * 0 = top, PI/2 = right, PI = bottom, 3PI/2 = left.
    */
   angle: number;
};

export type TrackCurveKind = "linear" | "autoBezier";

export type TrackCurveOptions = {
   curve?: TrackCurveKind;
   /**
    * Auto-Bezier tangent tightness. 0 is loose Catmull-Rom style smoothing;
    * 1 flattens handles back to straight segments.
    */
   tension?: number;
};

export type TrackWaypoint<TPoint extends TrackPoint2 | TrackPoint3 = TrackPoint2 | TrackPoint3> = {
   index: number;
   id?: string;
   progress: number;
   point: TPoint;
};

type TrackPointIds<TPoints extends readonly { id?: string }[]> = Extract<TPoints[number]["id"], string>;

export type SpatialTrackBase<
   TKind extends string,
   TPoint extends TrackPoint2 | TrackPoint3,
   TIds extends string = string,
> = {
   kind: TKind;
   output: "point";
   dimension: TPoint extends TrackPoint3 ? 3 : 2;
   points: readonly TPoint[];
   waypoints: readonly TrackWaypoint<TPoint>[];
   progress: Record<TIds, number> & Record<string, number>;
   length: number;
   curve: TrackCurveKind;
   tension: number | null;
   progressAt(index: number): number;
   sample(progress: number): TPoint;
};

export type XYTrack<TIds extends string = string> = SpatialTrackBase<"xy", TrackPoint2, TIds>;
export type XYZTrack<TIds extends string = string> = SpatialTrackBase<"xyz", TrackPoint3, TIds>;
export type CircleTrack<TIds extends string = string> = SpatialTrackBase<"circle", TrackPoint2, TIds> & {
   center: TrackPoint2;
   radius: number;
   wrap: boolean;
};

export type CircleTrackOptions = {
   center: TrackPoint2;
   radius: number;
   /**
    * When true, progress outside [0, 1] wraps around the path instead of clamping.
    * Use this for closed rings whose first and last authored points coincide.
    */
   wrap?: boolean;
};

export type SpatialStyleTrack<TIds extends string = string> = {
   kind: "camera-position" | "camera-look-at" | "camera";
   output: "style";
   dimension: 2 | 3;
   points: readonly (TrackPoint2 | TrackPoint3)[];
   waypoints: readonly TrackWaypoint[];
   progress: Record<TIds, number> & Record<string, number>;
   length: number;
   curve: TrackCurveKind;
   tension: number | null;
   progressAt(index: number): number;
   sample(progress: number): MotionStyle;
   parts: readonly { role: "position" | "lookAt"; track: XYTrack | XYZTrack }[];
};

export type SpatialTrack = XYTrack | XYZTrack | CircleTrack;
export type FollowTrack = SpatialTrack | SpatialStyleTrack;

export function xyTrack<const TPoints extends readonly TrackPoint2[]>(
   points: TPoints,
   options?: TrackCurveOptions,
): XYTrack<TrackPointIds<TPoints>> {
   return createSpatialTrack("xy", points, 2, options) as XYTrack<TrackPointIds<TPoints>>;
}

export function xyzTrack<const TPoints extends readonly TrackPoint3[]>(
   points: TPoints,
   options?: TrackCurveOptions,
): XYZTrack<TrackPointIds<TPoints>> {
   return createSpatialTrack("xyz", points, 3, options) as XYZTrack<TrackPointIds<TPoints>>;
}

export function circleTrack<const TPoints extends readonly CircleTrackPoint[]>(
   points: TPoints,
   options: CircleTrackOptions,
): CircleTrack<TrackPointIds<TPoints>> {
   return createCircleTrack(points, options) as CircleTrack<TrackPointIds<TPoints>>;
}

export function cameraPositionTrack<TIds extends string>(track: XYZTrack<TIds>): SpatialStyleTrack<TIds> {
   return styleTrackFrom(track, "camera-position", "position", (point) => ({
      cameraFromX: point.x,
      cameraFromY: point.y,
      cameraFromZ: "z" in point ? point.z : 1,
   }));
}

export function cameraLookAtTrack<TIds extends string>(track: XYTrack<TIds>): SpatialStyleTrack<TIds> {
   return styleTrackFrom(track, "camera-look-at", "lookAt", (point) => ({
      cameraTargetX: point.x,
      cameraTargetY: point.y,
   }));
}

export function cameraTrack<TPositionIds extends string = string, TLookAtIds extends string = string>(opts: {
   position?: XYZTrack<TPositionIds>;
   lookAt?: XYTrack<TLookAtIds>;
   /** @deprecated Use `position` so camera naming stays outside the track abstraction. */
   from?: XYZTrack<TPositionIds>;
   /** @deprecated Use `lookAt` so camera naming stays outside the track abstraction. */
   target?: XYTrack<TLookAtIds>;
}): SpatialStyleTrack<TPositionIds | TLookAtIds> {
   const position = opts.position ?? opts.from;
   const lookAt = opts.lookAt ?? opts.target;
   if (!position && !lookAt) throw new Error("[motion] cameraTrack(...) requires `position` and/or `lookAt` tracks.");
   const primary = position ?? lookAt;
   if (!primary) throw new Error("[motion] cameraTrack(...) could not resolve a source track.");
   const parts = [
      ...(position ? [{ role: "position" as const, track: position }] : []),
      ...(lookAt ? [{ role: "lookAt" as const, track: lookAt }] : []),
   ];
   return {
      kind: "camera",
      output: "style",
      dimension: primary.dimension,
      points: primary.points,
      waypoints: primary.waypoints,
      progress: primary.progress,
      length: primary.length,
      curve: primary.curve,
      tension: primary.tension,
      progressAt: primary.progressAt,
      parts,
      sample(progress) {
         const out: MotionStyle = {};
         if (position) Object.assign(out, cameraPositionTrack(position).sample(progress));
         if (lookAt) Object.assign(out, cameraLookAtTrack(lookAt).sample(progress));
         return out;
      },
   };
}

export function sampleTrack<TTrack extends FollowTrack>(
   track: TTrack,
   progress: number,
): TTrack extends SpatialStyleTrack ? MotionStyle : TTrack extends XYZTrack ? TrackPoint3 : TrackPoint2 {
   return track.sample(progress) as TTrack extends SpatialStyleTrack
      ? MotionStyle
      : TTrack extends XYZTrack
        ? TrackPoint3
        : TrackPoint2;
}

export function sampleTrackStyle(track: FollowTrack, progress: number): MotionStyle {
   const sampled = sampleTrack(track, progress) as MotionStyle | TrackPoint2 | TrackPoint3;
   if (track.output === "style") return sampled as MotionStyle;
   const point = sampled as TrackPoint2 | TrackPoint3;
   return "z" in point ? { x: point.x, y: point.y, z: point.z } : { x: point.x, y: point.y };
}

export function progressPose(t: number, keyframes: ProgressKeyframe[]): number {
   if (keyframes.length === 0) return 0;
   const sorted = [...keyframes].sort((a, b) => a.time - b.time);
   const first = sorted[0];
   const last = sorted[sorted.length - 1];
   if (t <= first.time) return resolveProgressState(first.state);
   if (t >= last.time) return resolveProgressState(last.state);

   let prevIdx = 0;
   for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].time <= t) prevIdx = i;
   }
   const prev = sorted[prevIdx];
   const nextIdx = Math.min(prevIdx + 1, sorted.length - 1);
   const next = sorted[nextIdx];
   const from = resolveProgressState(prev.state);
   const to = resolveProgressState(next.state);

   const prevPrev = prevIdx > 0 ? sorted[prevIdx - 1] : null;
   const nextNext = nextIdx < sorted.length - 1 ? sorted[nextIdx + 1] : null;
   return sampleBezierValue(t, prev.time, next.time, from, to, {
      transition: next.transition,
      prevValue: progressValueOrUndefined(prevPrev),
      nextValue: progressValueOrUndefined(nextNext),
      dtPrev: prevPrev ? prev.time - prevPrev.time : 0,
      dtNext: nextNext ? nextNext.time - next.time : 0,
   });
}

export function pose(t: number, keyframes: PoseKeyframe[]): MotionStyle {
   if (keyframes.length === 0) return {};
   const sequence = buildFrameOrder(keyframes);
   const firstTimed = sequence.find((frame) => isPinKeyframe(frame.frame));
   const lastTimed = [...sequence].reverse().find((frame) => isPinKeyframe(frame.frame));
   if (!firstTimed || !lastTimed) return {};
   if (t <= firstTimed.time) return { ...resolveMotionState(firstTimed.frame.state) };
   if (t >= lastTimed.time) return { ...resolveMotionState(lastTimed.frame.state) };

   const arc = findArcForTime(sequence, t);
   if (!arc) return { ...resolveMotionState(lastTimed.frame.state) };
   return sampleArc(t, { ...arc, frames: arc.frames.map(resolveFrameEntry) });
}

function isNumberArray(value: unknown): value is number[] {
   return Array.isArray(value) && value.every((entry) => typeof entry === "number");
}

type ResolvedFrame = {
   frame: PoseKeyframe;
   index: number;
   time: number;
   state: MotionStyle;
};

type FrameEntry = {
   frame: PoseKeyframe;
   index: number;
   time: number;
};

type MotionArc = {
   frames: ResolvedFrame[];
   startIndex: number;
   endIndex: number;
};

type Vec = number[];

type ArcLengthSample = {
   u: number;
   s: number;
};

const SPATIAL_LUT_SAMPLES = 64;
const DEFAULT_TRACK_CURVE: TrackCurveKind = "linear";
const DEFAULT_AUTO_BEZIER_TENSION = 0.5;
const UNSUPPORTED_POINT_CURVE_KEYS = new Set([
   "curve",
   "in",
   "out",
   "transition",
   "inHandle",
   "outHandle",
   "handleIn",
   "handleOut",
   "inTangent",
   "outTangent",
]);

function normalizeTrackCurveOptions(
   kind: "xy" | "xyz",
   options: TrackCurveOptions | undefined,
): Required<TrackCurveOptions> {
   const curve = options?.curve ?? DEFAULT_TRACK_CURVE;
   if (curve !== "linear" && curve !== "autoBezier") {
      throw new Error(`[motion] ${kind}Track(...) curve must be "linear" or "autoBezier", got ${String(curve)}`);
   }
   const tension = curve === "autoBezier" ? (options?.tension ?? DEFAULT_AUTO_BEZIER_TENSION) : 1;
   if (!Number.isFinite(tension) || tension < 0 || tension > 1) {
      throw new Error(`[motion] ${kind}Track(...) tension must be a number between 0 and 1, got ${String(tension)}`);
   }
   return { curve, tension };
}

function createSpatialTrack<TKind extends "xy" | "xyz", TPoint extends TrackPoint2 | TrackPoint3>(
   kind: TKind,
   points: readonly TPoint[],
   dimension: 2 | 3,
   options?: TrackCurveOptions,
): SpatialTrackBase<TKind, TPoint> {
   if (points.length < 2) throw new Error(`[motion] ${kind}Track(...) requires at least two points.`);
   const curveOptions = normalizeTrackCurveOptions(kind, options);
   const normalized = points.map((point, index) => normalizeTrackPoint(point, dimension, index));
   const vectors = normalized.map(pointToVec);
   const tensions = normalized.map(() => curveOptions.tension);
   const pointAt = (u: number) => sampleTrackVec(vectors, tensions, curveOptions.curve, u);
   const { lut, length } = buildArcLengthLUT(vectors, tensions, SPATIAL_LUT_SAMPLES, pointAt);
   const waypoints = normalized.map((point, index) => {
      const u = normalized.length <= 1 ? 0 : index / (normalized.length - 1);
      return {
         index,
         id: point.id,
         progress: arcFractionAtU(lut, u),
         point,
      };
   });
   const progress = Object.create(null) as Record<string, number>;
   for (const waypoint of waypoints) {
      if (!waypoint.id) continue;
      if (progress[waypoint.id] !== undefined) {
         throw new Error(`[motion] ${kind}Track(...) has duplicate waypoint id "${waypoint.id}".`);
      }
      progress[waypoint.id] = waypoint.progress;
   }

   return {
      kind,
      output: "point",
      dimension: dimension as TPoint extends TrackPoint3 ? 3 : 2,
      points: normalized,
      waypoints,
      progress,
      length,
      curve: curveOptions.curve,
      tension: curveOptions.curve === "autoBezier" ? curveOptions.tension : null,
      progressAt(index: number) {
         const waypoint = waypoints[index];
         if (!waypoint) throw new Error(`[motion] ${kind}Track.progressAt(${index}) is out of range.`);
         return waypoint.progress;
      },
      sample(progressValue: number) {
         const u = sampleAtArcFraction(lut, progressValue);
         return vecToPoint(pointAt(u), dimension) as TPoint;
      },
   };
}

function createCircleTrack(
   points: readonly CircleTrackPoint[],
   options: CircleTrackOptions,
): CircleTrack {
   if (points.length < 2) throw new Error("[motion] circleTrack(...) requires at least two points.");
   if (!Number.isFinite(options.center.x) || !Number.isFinite(options.center.y)) {
      throw new Error("[motion] circleTrack(...) center must contain finite x/y coordinates.");
   }
   if (!Number.isFinite(options.radius) || options.radius <= 0) {
      throw new Error(`[motion] circleTrack(...) radius must be a positive finite number, got ${options.radius}.`);
   }

   const normalized = points.map((point, index) => normalizeCircleTrackPoint(point, index));
   const distances = [0];
   let total = 0;
   for (let i = 1; i < normalized.length; i++) {
      total += Math.abs(normalized[i].angle - normalized[i - 1].angle);
      distances.push(total);
   }
   if (total <= 0) throw new Error("[motion] circleTrack(...) points must span a non-zero angle.");

   const resolvedPoints = normalized.map((point) => circlePoint(options.center, options.radius, point.angle, point.id));
   const waypoints = resolvedPoints.map((point, index) => ({
      index,
      id: point.id,
      progress: distances[index] / total,
      point,
   }));
   const progress = Object.create(null) as Record<string, number>;
   for (const waypoint of waypoints) {
      if (!waypoint.id) continue;
      if (progress[waypoint.id] !== undefined) {
         throw new Error(`[motion] circleTrack(...) has duplicate waypoint id "${waypoint.id}".`);
      }
      progress[waypoint.id] = waypoint.progress;
   }

   const wrap = options.wrap ?? false;
   return {
      kind: "circle",
      output: "point",
      dimension: 2,
      center: { ...options.center },
      radius: options.radius,
      wrap,
      points: resolvedPoints,
      waypoints,
      progress,
      length: options.radius * total,
      curve: "linear",
      tension: null,
      progressAt(index: number) {
         const waypoint = waypoints[index];
         if (!waypoint) throw new Error(`[motion] circleTrack.progressAt(${index}) is out of range.`);
         return waypoint.progress;
      },
      sample(progressValue: number) {
         const p = normalizeCircleProgress(progressValue, wrap);
         const angle = angleAtCircleProgress(normalized, distances, total, p);
         return circlePoint(options.center, options.radius, angle);
      },
   };
}

function styleTrackFrom<TIds extends string>(
   track: XYTrack<TIds> | XYZTrack<TIds>,
   kind: SpatialStyleTrack<TIds>["kind"],
   role: "position" | "lookAt",
   map: (point: TrackPoint2 | TrackPoint3) => MotionStyle,
): SpatialStyleTrack<TIds> {
   return {
      kind,
      output: "style",
      dimension: track.dimension,
      points: track.points,
      waypoints: track.waypoints,
      progress: track.progress,
      length: track.length,
      curve: track.curve,
      tension: track.tension,
      progressAt: track.progressAt,
      parts: [{ role, track }],
      sample(progressValue) {
         return map(sampleTrack(track, progressValue) as TrackPoint2 | TrackPoint3);
      },
   };
}

function normalizeCircleTrackPoint(point: CircleTrackPoint, index: number): CircleTrackPoint {
   if (!Number.isFinite(point.angle)) {
      throw new Error(`[motion] circleTrack(...) point ${index} has non-finite angle ${String(point.angle)}.`);
   }
   return { ...point };
}

function normalizeCircleProgress(progressValue: number, wrap: boolean) {
   if (!Number.isFinite(progressValue)) return progressValue;
   if (!wrap) return clamp01(progressValue);
   let p = progressValue % 1;
   if (p < 0) p += 1;
   if (p === 0 && progressValue > 0) return 1;
   return p;
}

function angleAtCircleProgress(
   points: readonly CircleTrackPoint[],
   distances: readonly number[],
   total: number,
   progressValue: number,
) {
   if (progressValue <= 0) return points[0].angle;
   if (progressValue >= 1) return points[points.length - 1].angle;
   const distance = progressValue * total;
   let prevIndex = 0;
   for (let i = 1; i < distances.length; i++) {
      if (distances[i] >= distance) {
         const segmentDistance = distances[i] - distances[i - 1];
         const segmentProgress = segmentDistance === 0 ? 0 : (distance - distances[i - 1]) / segmentDistance;
         return points[i - 1].angle + (points[i].angle - points[i - 1].angle) * segmentProgress;
      }
      prevIndex = i;
   }
   return points[prevIndex].angle;
}

function circlePoint(center: TrackPoint2, radius: number, angle: number, id?: string): TrackPoint2 {
   return {
      ...(id ? { id } : {}),
      x: center.x + radius * Math.sin(angle),
      y: center.y - radius * Math.cos(angle),
   };
}

function normalizeTrackPoint<TPoint extends TrackPoint2 | TrackPoint3>(
   point: TPoint,
   dimension: 2 | 3,
   index: number,
): TPoint {
   for (const key of Object.keys(point)) {
      if (!UNSUPPORTED_POINT_CURVE_KEYS.has(key)) continue;
      throw new Error(
         `[motion] track point ${index} uses "${key}", but per-waypoint curve handles are not supported yet. ` +
            `Use ${dimension === 3 ? "xyzTrack" : "xyTrack"}(points, { curve: "linear" | "autoBezier" }) instead.`,
      );
   }
   const values = dimension === 3 ? [point.x, point.y, (point as TrackPoint3).z] : [point.x, point.y];
   if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      throw new Error(`[motion] track point ${index} contains a non-finite coordinate.`);
   }
   return { ...point };
}

function pointToVec(point: TrackPoint2 | TrackPoint3): Vec {
   return "z" in point ? [point.x, point.y, point.z] : [point.x, point.y];
}

function vecToPoint(vec: Vec, dimension: 2 | 3): TrackPoint2 | TrackPoint3 {
   return dimension === 3 ? { x: vec[0], y: vec[1], z: vec[2] } : { x: vec[0], y: vec[1] };
}

function sampleTrackVec(points: Vec[], tensions: number[], curve: TrackCurveKind, u: number): Vec {
   return curve === "linear" ? linearPoint(points, u) : catmullRomPoint(points, tensions, u);
}

function buildFrameOrder(keyframes: PoseKeyframe[]): FrameEntry[] {
   return keyframes
      .map((frame, index) => ({ frame, index }))
      .sort((a, b) => a.frame.time - b.frame.time || a.index - b.index)
      .map(({ frame, index }) => ({
         frame,
         index,
         time: frame.time,
      }));
}

function resolveFrameEntry(entry: FrameEntry): ResolvedFrame {
   return {
      ...entry,
      state: resolveMotionState(entry.frame.state),
   };
}

function findArcForTime(sequence: FrameEntry[], t: number): Omit<MotionArc, "frames"> & { frames: FrameEntry[] } | null {
   let start = sequence.findIndex((frame) => isPinKeyframe(frame.frame));
   if (start < 0) return null;
   for (let i = start + 1; i < sequence.length; i++) {
      if (!isPinKeyframe(sequence[i].frame)) continue;
      if (t <= sequence[i].time)
         return { frames: sequence.slice(start, i + 1), startIndex: start, endIndex: i };
      start = i;
   }
   return null;
}

function sampleArc(t: number, arc: MotionArc): MotionStyle {
   const solvedFrames = arc.frames;
   const out: MotionStyle = {};
   const keys = new Set<string>();
   for (const frame of solvedFrames) {
      for (const key of Object.keys(frame.state)) keys.add(key);
   }

   for (const key of keys) {
      (out as Record<string, unknown>)[key] = sampleKey(t, solvedFrames, key);
   }
   return out;
}

function sampleKey(t: number, frames: ResolvedFrame[], key: string): unknown {
   const sorted = [...frames].sort((a, b) => a.time - b.time || a.index - b.index);
   if (t <= sorted[0].time) return (sorted[0].state as Record<string, unknown>)[key];
   if (t >= sorted[sorted.length - 1].time) return (sorted[sorted.length - 1].state as Record<string, unknown>)[key];

   let prevIdx = 0;
   for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].time <= t) prevIdx = i;
   }
   const prev = sorted[prevIdx];
   const nextIdx = Math.min(prevIdx + 1, sorted.length - 1);
   const next = sorted[nextIdx];
   const from = (prev.state as Record<string, unknown>)[key];
   const to = (next.state as Record<string, unknown>)[key];

   if (typeof from === "number" && typeof to === "number") {
      const prevPrev = prevIdx > 0 ? sorted[prevIdx - 1] : null;
      const nextNext = nextIdx < sorted.length - 1 ? sorted[nextIdx + 1] : null;
      return sampleBezierValue(t, prev.time, next.time, from, to, {
         transition: next.frame.transition,
         prevValue: valueOrUndefined(prevPrev?.state ?? null, key),
         nextValue: valueOrUndefined(nextNext?.state ?? null, key),
         dtPrev: prevPrev ? prev.time - prevPrev.time : 0,
         dtNext: nextNext ? nextNext.time - next.time : 0,
      });
   }

   if (isNumberArray(from) && isNumberArray(to) && from.length === to.length) {
      const prevPrev = prevIdx > 0 ? sorted[prevIdx - 1] : null;
      const nextNext = nextIdx < sorted.length - 1 ? sorted[nextIdx + 1] : null;
      return from.map((value, index) =>
         sampleBezierValue(t, prev.time, next.time, value, to[index], {
            transition: next.frame.transition,
            prevValue: numberArrayValueOrUndefined(prevPrev?.state ?? null, key, index),
            nextValue: numberArrayValueOrUndefined(nextNext?.state ?? null, key, index),
            dtPrev: prevPrev ? prev.time - prevPrev.time : 0,
            dtNext: nextNext ? nextNext.time - next.time : 0,
         }),
      );
   }

   return t >= next.time ? to : from;
}

function valueOrUndefined(state: MotionStyle | null, key: string): number | undefined {
   if (!state) return undefined;
   const v = (state as Record<string, unknown>)[key];
   return typeof v === "number" ? v : undefined;
}

function numberArrayValueOrUndefined(state: MotionStyle | null, key: string, index: number): number | undefined {
   if (!state) return undefined;
   const v = (state as Record<string, unknown>)[key];
   return isNumberArray(v) ? v[index] : undefined;
}

function progressValueOrUndefined(frame: ProgressKeyframe | null): number | undefined {
   if (!frame) return undefined;
   const value = resolveProgressState(frame.state);
   return Number.isFinite(value) ? value : undefined;
}

type BezierSampleOptions = {
   transition?: BezierTransitionOptions;
   prevValue?: number;
   nextValue?: number;
   dtPrev: number;
   dtNext: number;
};

function sampleBezierValue(
   t: number,
   t0: number,
   t1: number,
   p0: number,
   p1: number,
   options: BezierSampleOptions,
): number {
   if (t1 === t0) return t >= t1 ? p1 : p0;
   if (options.transition?.jump) return t >= t1 ? p1 : p0;

   const dt = t1 - t0;
   const avgVelocity = (p1 - p0) / dt;
   const startHandle = options.transition?.start;
   const endHandle = options.transition?.end;
   const startVelocity = resolveHandleVelocity(startHandle, avgVelocity, options.prevValue, p0, p1, options.dtPrev, dt);
   const endVelocity = resolveHandleVelocity(endHandle, avgVelocity, p0, p1, options.nextValue, dt, options.dtNext);
   const startInfluence = resolveHandleInfluence(startHandle);
   const endInfluence = resolveHandleInfluence(endHandle);
   return cubicBezierValueAtTime(t, t0, t1, p0, p1, startVelocity, endVelocity, startInfluence, endInfluence);
}

function resolveHandleVelocity(
   handle: BezierHandleLike | undefined,
   avgVelocity: number,
   prevValue: number | undefined,
   currValue: number,
   nextValue: number | undefined,
   dtPrev: number,
   dtNext: number,
): number {
   if (handle === "auto") return autoTemporalTangent(prevValue, currValue, nextValue, dtPrev, dtNext);
   if (handle?.velocity != null) return handle.velocity;
   return avgVelocity * (handle?.speed ?? 1);
}

function resolveHandleInfluence(handle: BezierHandleLike | undefined): number {
   if (handle === "auto") return DEFAULT_BEZIER_INFLUENCE;
   return handle?.influence ?? DEFAULT_BEZIER_INFLUENCE;
}

// AE-style automatic value/time tangent for a property at the middle of a
// (prev -> curr -> next) triple, expressed in units of value/second.
//
// The tangent is continuous through the keyframe, but clamped per-axis:
// if a value flattens or reverses direction, the tangent is zero so the
// curve cannot overshoot the authored keyframe. Otherwise use a weighted
// harmonic mean of adjacent chord velocities, which stays between them.
function autoTemporalTangent(
   prevValue: number | undefined,
   currValue: number,
   nextValue: number | undefined,
   dtPrev: number,
   dtNext: number,
): number {
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

export function effectiveKeyframeTime(frame: PoseKeyframe, _keyframes: PoseKeyframe[]): number {
   return frame.time;
}

function catmullRomPoint(points: Vec[], tensions: number[], u: number): Vec {
   if (points.length === 0) return [];
   if (points.length === 1) return [...points[0]];
   const segmentCount = points.length - 1;
   const scaled = clamp01(u) * segmentCount;
   const segment = Math.min(segmentCount - 1, Math.floor(scaled));
   const local = scaled - segment;
   const p0 = points[segment];
   const p1 = points[segment + 1];
   const m0 = spatialTangent(points, tensions, segment);
   const m1 = spatialTangent(points, tensions, segment + 1);
   return p0.map((value, index) => hermiteUnit(local, value, p1[index], m0[index], m1[index]));
}

function linearPoint(points: Vec[], u: number): Vec {
   if (points.length === 0) return [];
   if (points.length === 1) return [...points[0]];
   const segmentCount = points.length - 1;
   const scaled = clamp01(u) * segmentCount;
   const segment = Math.min(segmentCount - 1, Math.floor(scaled));
   const local = scaled - segment;
   const p0 = points[segment];
   const p1 = points[segment + 1];
   return p0.map((value, index) => value + (p1[index] - value) * local);
}

function spatialTangent(points: Vec[], tensions: number[], index: number): Vec {
   const prev = points[index - 1] ?? points[index];
   const next = points[index + 1] ?? points[index];
   const scale = (1 - (tensions[index] ?? DEFAULT_AUTO_BEZIER_TENSION)) / 2;
   return points[index].map((_, axis) => (next[axis] - prev[axis]) * scale);
}

function buildArcLengthLUT(
   points: Vec[],
   tensions: number[],
   samples = SPATIAL_LUT_SAMPLES,
   pointAt: (u: number) => Vec = (u) => catmullRomPoint(points, tensions, u),
): { lut: ArcLengthSample[]; length: number } {
   const count = Math.max(2, samples);
   const out: ArcLengthSample[] = [{ u: 0, s: 0 }];
   let length = 0;
   let prev = pointAt(0);
   for (let i = 1; i <= count; i++) {
      const u = i / count;
      const next = pointAt(u);
      length += distance(prev, next);
      out.push({ u, s: length });
      prev = next;
   }
   const lut =
      length <= 0
         ? out.map((sample) => ({ ...sample, s: sample.u }))
         : out.map((sample) => ({ ...sample, s: sample.s / length }));
   return { lut, length };
}

function sampleAtArcFraction(lut: ArcLengthSample[], fraction: number): number {
   const target = clamp01(fraction);
   if (target <= 0) return 0;
   if (target >= 1) return 1;
   for (let i = 1; i < lut.length; i++) {
      if (lut[i].s < target) continue;
      const prev = lut[i - 1];
      const next = lut[i];
      const span = next.s - prev.s;
      const local = span > 0 ? (target - prev.s) / span : 0;
      return prev.u + (next.u - prev.u) * local;
   }
   return 1;
}

function arcFractionAtU(lut: ArcLengthSample[], u: number): number {
   const target = clamp01(u);
   if (target <= 0) return 0;
   if (target >= 1) return 1;
   for (let i = 1; i < lut.length; i++) {
      if (lut[i].u < target) continue;
      const prev = lut[i - 1];
      const next = lut[i];
      const span = next.u - prev.u;
      const local = span > 0 ? (target - prev.u) / span : 0;
      return prev.s + (next.s - prev.s) * local;
   }
   return 1;
}

function distance(a: Vec, b: Vec): number {
   let sum = 0;
   for (let i = 0; i < a.length; i++) sum += (b[i] - a[i]) ** 2;
   return Math.sqrt(sum);
}

function hermiteUnit(u: number, p0: number, p1: number, m0: number, m1: number): number {
   const u2 = u * u;
   const u3 = u2 * u;
   const h00 = 2 * u3 - 3 * u2 + 1;
   const h10 = u3 - 2 * u2 + u;
   const h01 = -2 * u3 + 3 * u2;
   const h11 = u3 - u2;
   return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

function cubicBezierValueAtTime(
   t: number,
   t0: number,
   t1: number,
   p0: number,
   p1: number,
   outVelocity: number,
   inVelocity: number,
   outInfluence: number,
   inInfluence: number,
): number {
   const dt = t1 - t0;
   const x = clamp01((t - t0) / dt);
   const x1 = outInfluence;
   const x2 = 1 - inInfluence;
   const y1 = p0 + outVelocity * outInfluence * dt;
   const y2 = p1 - inVelocity * inInfluence * dt;
   let lo = 0;
   let hi = 1;
   for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (bezierUnit(mid, 0, x1, x2, 1) < x) lo = mid;
      else hi = mid;
   }
   return bezierUnit((lo + hi) / 2, p0, y1, y2, p1);
}

function bezierUnit(u: number, p0: number, p1: number, p2: number, p3: number): number {
   const a = 1 - u;
   return a * a * a * p0 + 3 * a * a * u * p1 + 3 * a * u * u * p2 + u * u * u * p3;
}

export function bindMotionElement<T extends HTMLElement = HTMLElement>(id?: string): MotionElementBinding<T> {
   let node: T | null = null;
   const ref: React.RefCallback<T> = (value) => {
      node = value;
   };
   return {
      id,
      ref,
      current() {
         if (!node) throw new Error(`[motion] binding${id ? ` "${id}"` : ""} is not mounted`);
         return node;
      },
      props: {
         ref,
         ...(id ? { "data-motion": id } : {}),
      },
   };
}

export function styleToGsapVars(style: MotionStyle): Record<string, unknown> {
   return { ...style };
}
