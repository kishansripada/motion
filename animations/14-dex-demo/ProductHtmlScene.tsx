import {
   at,
   cameraLookAtTrack,
   cameraPositionTrack,
   curve,
   CameraPlane,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   xyTrack,
   xyzTrack,
   type CameraPlaneView,
   type MotionElementBinding,
   type MotionStyle,
} from "../../src/framework";
import { BrowserWindow } from "./BrowserWindow";
import { productHtmlBeats, PRODUCT_HTML_FADE_DUR } from "./beats";
import rawProductHtml from "./product-snapshot.html?raw";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

const PRODUCT_W = 1560;
const PRODUCT_H = 900;
const PRODUCT_X = 180;
const PRODUCT_Y = 96;

const PRODUCT_ENTRY_DUR = 0.58;
const CAMERA_TOP_START = 0.3;
const CAMERA_TOP_DUR = 0.86;
// Brief linear-progress window centred on the topLeft waypoint. Both the
// position and look-at tracks share this so the camera "cruises" past the
// corner at constant speed instead of just kissing it — acceleration goes
// to exactly zero across the whole window, which reads as a deliberate
// dwell instead of a kink.
const CAMERA_CORNER_CRUISE_DUR = 0.16;
const CAMERA_PAN_DUR = 0.82;
const CAMERA_CORNER_VELOCITY = 0.05;
const CAMERA_CORNER_INFLUENCE = 0.8;

const TOP_LEFT_FOCUS = { x: 0.2, y: 0.28 } as const;
const BOTTOM_LEFT_FOCUS = { x: 0.2, y: 0.84 } as const;
const ANGLED_CAMERA_OFFSET = { x: -0.05, y: 0.33 } as const;
const CAMERA_DISTANCE = 1200;
const FOCUSED_CAMERA_DISTANCE = 1080;
const FOCUSED_CAMERA_Z = 0.5;

const CAMERA_HEAD_ON = {
   cameraFromX: 0.5,
   cameraFromY: 0.5,
   cameraFromZ: 1,
   cameraTargetX: 0.5,
   cameraTargetY: 0.5,
   cameraDistance: CAMERA_DISTANCE,
   cameraNaturalRoll: 1,
} satisfies MotionStyle;

const CAMERA_TOP_LEFT = {
   cameraFromX: TOP_LEFT_FOCUS.x + ANGLED_CAMERA_OFFSET.x,
   cameraFromY: TOP_LEFT_FOCUS.y + ANGLED_CAMERA_OFFSET.y,
   cameraFromZ: FOCUSED_CAMERA_Z,
   cameraTargetX: TOP_LEFT_FOCUS.x,
   cameraTargetY: TOP_LEFT_FOCUS.y,
   cameraDistance: FOCUSED_CAMERA_DISTANCE,
   cameraNaturalRoll: 1,
} satisfies MotionStyle;

const CAMERA_BOTTOM_LEFT = {
   cameraFromX: BOTTOM_LEFT_FOCUS.x + ANGLED_CAMERA_OFFSET.x,
   cameraFromY: BOTTOM_LEFT_FOCUS.y + ANGLED_CAMERA_OFFSET.y,
   cameraFromZ: FOCUSED_CAMERA_Z,
   cameraTargetX: BOTTOM_LEFT_FOCUS.x,
   cameraTargetY: BOTTOM_LEFT_FOCUS.y,
   cameraDistance: FOCUSED_CAMERA_DISTANCE,
   cameraNaturalRoll: 1,
} satisfies MotionStyle;

const CAMERA_POSITION_TRACK = xyzTrack(
   [
      { id: "headOn", x: CAMERA_HEAD_ON.cameraFromX, y: CAMERA_HEAD_ON.cameraFromY, z: CAMERA_HEAD_ON.cameraFromZ },
      { id: "topLeft", x: CAMERA_TOP_LEFT.cameraFromX, y: CAMERA_TOP_LEFT.cameraFromY, z: CAMERA_TOP_LEFT.cameraFromZ },
      {
         id: "bottomLeft",
         x: CAMERA_BOTTOM_LEFT.cameraFromX,
         y: CAMERA_BOTTOM_LEFT.cameraFromY,
         z: CAMERA_BOTTOM_LEFT.cameraFromZ,
      },
   ],
   { curve: "autoBezier", tension: 0.3 },
);

const CAMERA_LOOK_AT_TRACK = xyTrack(
   [
      { id: "headOn", x: CAMERA_HEAD_ON.cameraTargetX, y: CAMERA_HEAD_ON.cameraTargetY },
      { id: "topLeft", x: CAMERA_TOP_LEFT.cameraTargetX, y: CAMERA_TOP_LEFT.cameraTargetY },
      { id: "bottomLeft", x: CAMERA_BOTTOM_LEFT.cameraTargetX, y: CAMERA_BOTTOM_LEFT.cameraTargetY },
   ],
   { curve: "autoBezier", tension: 0.3 },
);

const CAMERA_POSITION_FOLLOW = cameraPositionTrack(CAMERA_POSITION_TRACK);
const CAMERA_LOOK_AT_FOLLOW = cameraLookAtTrack(CAMERA_LOOK_AT_TRACK);

const CAMERA_FINAL_VIEW = {
   from: { x: CAMERA_BOTTOM_LEFT.cameraFromX, y: CAMERA_BOTTOM_LEFT.cameraFromY, z: CAMERA_BOTTOM_LEFT.cameraFromZ },
   target: BOTTOM_LEFT_FOCUS,
   distance: CAMERA_BOTTOM_LEFT.cameraDistance,
   naturalRoll: true,
} satisfies CameraPlaneView;

export function ProductHtmlScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const cameraPlane = useMotionBinding<HTMLDivElement>();
   const productOpacity = useMotionBinding<HTMLDivElement>();
   const productY = useMotionBinding<HTMLDivElement>();
   const productScale = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const cameraTopStart = t + CAMERA_TOP_START;
      const cameraTopEnd = cameraTopStart + CAMERA_TOP_DUR;
      const cameraPanEnd = cameraTopEnd + CAMERA_CORNER_CRUISE_DUR + CAMERA_PAN_DUR;
      const cruiseHalf = CAMERA_CORNER_CRUISE_DUR / 2;
      const cruiseEnter = cameraTopEnd - cruiseHalf;
      const cruiseExit = cameraTopEnd + cruiseHalf;
      // Progress endpoints around the corner: pick them so the middle
      // segment's average slope is exactly CAMERA_CORNER_VELOCITY. With
      // matched boundary velocities at that same value the cubic bezier
      // collapses to a straight line — acceleration = 0 across the window.
      const positionCruiseDelta = CAMERA_CORNER_VELOCITY * cruiseHalf;
      const lookAtCruiseDelta = CAMERA_CORNER_VELOCITY * cruiseHalf;
      const positionTopLeftP = CAMERA_POSITION_TRACK.progress.topLeft;
      const lookAtTopLeftP = CAMERA_LOOK_AT_TRACK.progress.topLeft;

      // Scene root owns its own envelope: fades up at the start, then
      // settles back to 0 over the last PRODUCT_HTML_FADE_DUR so the agent
      // loop scene can claim the cloud bg without a stacking-order flash.
      scene.animate("product-html scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.08, { opacity: 1 }, curve.out(2)),
         hold(t + productHtmlBeats.holdEnd),
         at(t + productHtmlBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("product raw html fades in", productOpacity, [
         at(t + 0, { opacity: 0 }),
         at(t + PRODUCT_ENTRY_DUR, { opacity: 1 }, curve.out(2)),
      ]);

      scene.animate("product raw html rises into view", productY, [
         at(t + 0, { y: 92 }),
         at(t + PRODUCT_ENTRY_DUR + 0.1, { y: 0 }, curve.out(3)),
      ]);

      scene.animate("product raw html settles at full size", productScale, [
         at(t + 0, { scale: 0.965 }),
         at(t + PRODUCT_ENTRY_DUR + 0.18, { scale: 1 }, curve.out(3)),
      ]);

      scene.animate("camera scalar fields settle with product survey", cameraPlane, [
         at(t + 0, {
            cameraDistance: CAMERA_HEAD_ON.cameraDistance,
            cameraNaturalRoll: CAMERA_HEAD_ON.cameraNaturalRoll,
         }),
         hold(cameraTopStart),
         at(
            cameraTopEnd,
            { cameraDistance: CAMERA_TOP_LEFT.cameraDistance, cameraNaturalRoll: CAMERA_TOP_LEFT.cameraNaturalRoll },
            curve.auto(),
         ),
         hold(cameraPanEnd),
      ]);

      // TOP_LEFT is a waypoint, not a landing beat — the camera cruises
      // through it at constant speed during a brief linear window so the
      // corner reads as a deliberate dwell instead of a kink.
      scene.follow("camera position surveys product left side", cameraPlane, CAMERA_POSITION_FOLLOW, [
         at(t + 0, CAMERA_POSITION_TRACK.progress.headOn),
         hold(cameraTopStart),
         at(cruiseEnter, positionTopLeftP - positionCruiseDelta, {
            transition: {
               start: { speed: 0 },
               end: { velocity: CAMERA_CORNER_VELOCITY, influence: CAMERA_CORNER_INFLUENCE },
            },
         }),
         at(cruiseExit, positionTopLeftP + positionCruiseDelta, {
            transition: {
               start: { velocity: CAMERA_CORNER_VELOCITY, influence: 1 / 3 },
               end: { velocity: CAMERA_CORNER_VELOCITY, influence: 1 / 3 },
            },
         }),
         at(cameraPanEnd, CAMERA_POSITION_TRACK.progress.bottomLeft, {
            transition: {
               start: { velocity: CAMERA_CORNER_VELOCITY, influence: CAMERA_CORNER_INFLUENCE },
               end: { speed: 0 },
            },
         }),
      ]);

      scene.follow("camera look-at surveys product left side", cameraPlane, CAMERA_LOOK_AT_FOLLOW, [
         at(t + 0, CAMERA_LOOK_AT_TRACK.progress.headOn),
         hold(cameraTopStart),
         at(cruiseEnter, lookAtTopLeftP - lookAtCruiseDelta, {
            transition: {
               start: { speed: 0 },
               end: { velocity: CAMERA_CORNER_VELOCITY, influence: CAMERA_CORNER_INFLUENCE },
            },
         }),
         at(cruiseExit, lookAtTopLeftP + lookAtCruiseDelta, {
            transition: {
               start: { velocity: CAMERA_CORNER_VELOCITY, influence: 1 / 3 },
               end: { velocity: CAMERA_CORNER_VELOCITY, influence: 1 / 3 },
            },
         }),
         at(cameraPanEnd, CAMERA_LOOK_AT_TRACK.progress.bottomLeft, {
            transition: {
               start: { velocity: CAMERA_CORNER_VELOCITY, influence: CAMERA_CORNER_INFLUENCE },
               end: { speed: 0 },
            },
         }),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         <CameraPlane planeRef={cameraPlane.ref} view={CAMERA_FINAL_VIEW}>
            <div
               ref={productOpacity.ref}
               className="absolute"
               style={{
                  left: PRODUCT_X,
                  top: PRODUCT_Y,
                  width: PRODUCT_W,
                  height: PRODUCT_H,
               }}
            >
               <div ref={productY.ref} style={{ width: "100%", height: "100%", transformStyle: "preserve-3d" }}>
                  <div
                     ref={productScale.ref}
                     style={{
                        width: "100%",
                        height: "100%",
                        transformOrigin: "50% 72%",
                        transformStyle: "preserve-3d",
                     }}
                  >
                     <BrowserWindow url="orangeslice.ai" width={PRODUCT_W} height={PRODUCT_H}>
                        <div className="relative size-full">
                           <iframe
                              title="Product snapshot"
                              srcDoc={rawProductHtml}
                              sandbox=""
                              style={{
                                 display: "block",
                                 width: "100%",
                                 height: "100%",
                                 border: 0,
                                 background: "#ffffff",
                                 pointerEvents: "none",
                              }}
                           />
                        </div>
                     </BrowserWindow>
                  </div>
               </div>
            </div>
         </CameraPlane>
      </div>
   );
}
