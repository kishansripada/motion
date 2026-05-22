export { definePureAnimation, useMotion, useMotionBinding, useStartTime, Scene } from "./definePureAnimation";
export type { PureAnimationDefinitionProps, SceneProps } from "./definePureAnimation";

export {
   at,
   bindMotionElement,
   cameraLookAtTrack,
   cameraPositionTrack,
   cameraTrack,
   circleTrack,
   curve,
   effectiveKeyframeTime,
   hold,
   isHoldKeyframe,
   isPinKeyframe,
   pose,
   progressPose,
   resolveMotionState,
   resolveProgressState,
   sampleTrack,
   sampleTrackStyle,
   styleToGsapVars,
   xyTrack,
   xyzTrack,
} from "./functionTimeMotion";
export type {
   BezierHandle,
   BezierHandleLike,
   BezierTransitionOptions,
   CircleTrack,
   CircleTrackOptions,
   CircleTrackPoint,
   FollowTrack,
   MotionKeyframeOptions,
   MotionElementBinding,
   MotionStateLike,
   MotionStyle,
   PoseKeyframe,
   ProgressKeyframe,
   ProgressStateLike,
   SpatialStyleTrack,
   SpatialTrack,
   TrackCurveKind,
   TrackCurveOptions,
   TrackPoint2,
   TrackPoint3,
   TrackWaypoint,
   XYTrack,
   XYZTrack,
} from "./functionTimeMotion";

export { createPureScene, runPureAnimation } from "./pureMotion";
export type {
   PureAnimationHandle,
   PureAnimationOptions,
   PureKeyframeView,
   PureScene,
   PureSceneAnimation,
   PureSceneEffect,
   PureSceneFollowTrack,
   PureSceneTextTrack,
   PureTimeline,
   PureTimelineChild,
   TextTrackTime,
   TypewriteOptions,
} from "./pureMotion";

export { useElementFlight } from "./elementFlight";
export type { ElementFlight, ElementFlightCapture, ElementFlightOptions, ElementFlightPose } from "./elementFlight";

export { useAnchoredPosition, useElementAnchor } from "./elementAnchor";
export type {
   AnchoredPosition,
   AnchoredPositionOffset,
   AnchoredPositionOptions,
   ElementAnchor,
   ElementAnchorMeasurement,
   ElementAnchorName,
   ElementAnchorOptions,
   ElementAnchorPoint,
} from "./elementAnchor";

export { measureRect } from "./measureRect";
export type { MeasureOptions, Rect } from "./measureRect";

export type { AnimationDefinition, AnimationMountResult } from "./types";

export {
   CameraPlane,
   cameraPlaneMatrix,
   cameraPlaneStyles,
   Canvas,
   cn,
   Portal,
} from "./ui";
export type {
   CameraPlaneProps,
   CameraPlanePoint,
   CameraPlaneSize,
   CameraPlaneView,
   CanvasProps,
   PortalProps,
} from "./ui";
