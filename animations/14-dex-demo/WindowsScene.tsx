import {
   at,
   curve,
   CameraPlane,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type CameraPlaneView,
   type MotionElementBinding,
   type MotionStyle,
} from "../../src/framework";
import { SalesWindow } from "./SalesWindow";
import { WINDOWS_SCALE_IN_DUR, WINDOWS_STAGGER, windowsBeats } from "./beats";

import gongSrc from "./assets/sales-tools/gong.png";
import clariSrc from "./assets/sales-tools/clari.png";
import hubspotSrc from "./assets/sales-tools/hubspot-sales.png";
import lemlistSrc from "./assets/sales-tools/lemlist.png";
import outreachSrc from "./assets/sales-tools/outreach.png";
import salesloftSrc from "./assets/sales-tools/salesloft.png";
import pipedriveSrc from "./assets/sales-tools/pipedrive.png";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Window dimensions: ~1/3 of the 1920 canvas. 432 = 410 content + 22 title bar
// (the 1440:900 source = 1.6:1; content is slightly taller so chrome reads smaller).
const WIN_W = 640;
const WIN_H = 432;
const CAMERA_PULLBACK_DUR = 0.76;
const SCENE_FADE_IN_DUR = 0.04;
const PRE_EXPANDED_WINDOW_COUNT = 3;
const CAMERA_PULLBACK_END = SCENE_FADE_IN_DUR + CAMERA_PULLBACK_DUR;
const CAMERA_CENTER_DELAY = 0.14;
const CAMERA_CENTER_DUR = 0.54;
const WINDOWS_FADE_IN_DUR = 0.34;
const PRE_EXPANDED_FADE_STAGGER = 0.055;
const WINDOWS_DROP_DELAY = 0.08;
const WINDOWS_DROP_STAGGER = 0.045;
const WINDOWS_DROP_DUR = 0.48;
const WINDOWS_DROP_DISTANCE = 1120;

const CAMERA_TARGET = { x: 0.3, y: 0.5 } as const;
const CAMERA_CENTER_TARGET = { x: 0.36, y: 0.48 } as const;
const CAMERA_DISTANCE = 1200;
const CAMERA_FINAL_VIEW = {
   from: { x: 0.2, y: 0.8, z: 1 },
   target: CAMERA_TARGET,
   distance: CAMERA_DISTANCE,
   naturalRoll: true,
} satisfies CameraPlaneView;
const CAMERA_CLOSE_POSE = {
   cameraFromX: CAMERA_TARGET.x,
   cameraFromY: CAMERA_TARGET.y,
   cameraFromZ: 0.35,
   cameraTargetX: CAMERA_TARGET.x,
   cameraTargetY: CAMERA_TARGET.y,
   cameraDistance: CAMERA_DISTANCE,
   cameraNaturalRoll: 1,
} satisfies MotionStyle;
const CAMERA_HEAD_ON_POSE = {
   cameraFromX: CAMERA_CENTER_TARGET.x,
   cameraFromY: CAMERA_CENTER_TARGET.y,
   cameraFromZ: 1,
   cameraTargetX: CAMERA_CENTER_TARGET.x,
   cameraTargetY: CAMERA_CENTER_TARGET.y,
   cameraDistance: CAMERA_DISTANCE,
   cameraNaturalRoll: 1,
} satisfies MotionStyle;
const CAMERA_FINAL_POSE = {
   cameraFromX: CAMERA_FINAL_VIEW.from.x,
   cameraFromY: CAMERA_FINAL_VIEW.from.y,
   cameraFromZ: CAMERA_FINAL_VIEW.from.z,
   cameraTargetX: CAMERA_TARGET.x,
   cameraTargetY: CAMERA_TARGET.y,
   cameraDistance: CAMERA_DISTANCE,
   cameraNaturalRoll: 1,
} satisfies MotionStyle;

// Hand-picked layout. Positions are top-left of each window in the FLAT
// (un-tilted) canvas coords. The 3D tilt below transforms these positions
// into the final on-screen layout. Kept hand-curated rather than random
// so the composition reads as "scattered but balanced" instead of "random
// blob". All windows share the parent's perspective — no per-window
// rotation; they're all flat against the same tilted plane.
const WINDOWS = [
   { key: "hubspot", src: hubspotSrc, url: "hubspot.com/sales", x: 320, y: 290, zIndex: 7 },
   { key: "outreach", src: outreachSrc, url: "outreach.io", x: 480, y: 30, zIndex: 1 },
   { key: "pipedrive", src: pipedriveSrc, url: "pipedrive.com", x: 40, y: 80, zIndex: 2 },
   { key: "salesloft", src: salesloftSrc, url: "salesloft.com", x: 980, y: 100, zIndex: 3 },
   { key: "lemlist", src: lemlistSrc, url: "lemlist.com", x: 40, y: 520, zIndex: 4 },
   { key: "gong", src: gongSrc, url: "gong.io", x: 1080, y: 540, zIndex: 5 },
   { key: "clari", src: clariSrc, url: "clari.com", x: 520, y: 580, zIndex: 6 },
] as const;

export function WindowsScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const cameraPlane = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const cameraCenterStart = t + CAMERA_PULLBACK_END + CAMERA_CENTER_DELAY;

      // The runtime holds the first keyframe before a track begins, so this
      // scene must start transparent or it covers the cold-open.
      scene.animate("windows scene fades in", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + SCENE_FADE_IN_DUR, { opacity: 1 }, curve.out(2)),
      ]);

      scene.animate("camera pulls back to reveal windows", cameraPlane, [
         at(t + 0, CAMERA_CLOSE_POSE),
         hold(t + SCENE_FADE_IN_DUR),
         at(t + CAMERA_PULLBACK_END, CAMERA_FINAL_POSE, curve.out(4)),
         hold(cameraCenterStart),
         at(cameraCenterStart + CAMERA_CENTER_DUR, CAMERA_HEAD_ON_POSE, curve.inOut(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         <CameraPlane planeRef={cameraPlane.ref} view={CAMERA_FINAL_VIEW}>
            {WINDOWS.map((w, i) => (
               <PoppingWindow
                  key={w.key}
                  index={i}
                  sceneStart={sceneStart}
                  x={w.x}
                  y={w.y}
                  zIndex={w.zIndex}
                  src={w.src}
                  url={w.url}
               />
            ))}
         </CameraPlane>
      </div>
   );
}

type PoppingWindowProps = {
   index: number;
   sceneStart: number;
   x: number;
   y: number;
   zIndex: number;
   src: string;
   url: string;
};

// Each window owns six nested wrappers, OUTER → INNER:
//   dropY     — gravity drop, after the camera squares up
//   dropPivot — top-left pivot while falling
//   driftX    — continuous x drift (idle)
//   driftY    — continuous y drift (idle)
//   opacity   — reveal fade during camera pullback
//   scaleWrap — entry scale (0 → 1 with backOut)
//
// Decomposed across wrappers per motion-design rule 7: each axis on its
// own track. The two idle axes (x, y) drift on independent slow sin waves
// with different periods so windows never sync into a collective rhythm.
// No rotation drift — all windows share the parent's 3D perspective and
// stay aligned to its tilted plane.
function PoppingWindow({ index, sceneStart, x, y, zIndex, src, url }: PoppingWindowProps) {
   const dropY = useMotionBinding<HTMLDivElement>();
   const dropPivot = useMotionBinding<HTMLDivElement>();
   const driftX = useMotionBinding<HTMLDivElement>();
   const driftY = useMotionBinding<HTMLDivElement>();
   const opacity = useMotionBinding<HTMLDivElement>();
   const scaleWrap = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      // A few windows are already expanded before the camera moves; the rest
      // cascade in during the pullback so the reveal still keeps building.
      const startsExpanded = index < PRE_EXPANDED_WINDOW_COUNT;
      const myStart = startsExpanded
         ? t
         : t + SCENE_FADE_IN_DUR + (index - PRE_EXPANDED_WINDOW_COUNT) * WINDOWS_STAGGER;
      const myLand = startsExpanded ? t : myStart + WINDOWS_SCALE_IN_DUR;
      const idleStart = myLand;
      const cameraCenterEnd = t + CAMERA_PULLBACK_END + CAMERA_CENTER_DELAY + CAMERA_CENTER_DUR;
      const dropStart = cameraCenterEnd + WINDOWS_DROP_DELAY + index * WINDOWS_DROP_STAGGER;
      const dropEnd = dropStart + WINDOWS_DROP_DUR;
      const idleEnd = Math.min(dropStart, t + windowsBeats.end);
      const idleSpan = idleEnd - idleStart;
      const dropDistance = WINDOWS_DROP_DISTANCE + index * 55;
      const dropRotation = 16 + index * 3;
      const scaleKeys = startsExpanded
         ? [at(t + 0, { scale: 1 })]
         : [at(t + 0, { scale: 0 }), hold(myStart), at(myLand, { scale: 1 }, curve.backOut(1.6))];
      const fadeStart = startsExpanded ? t + index * PRE_EXPANDED_FADE_STAGGER : myStart;
      const fadeEnd = startsExpanded ? fadeStart + WINDOWS_FADE_IN_DUR : myLand;
      const opacityKeys = [
         at(t + 0, { opacity: 0 }),
         ...(fadeStart > t ? [hold(fadeStart)] : []),
         at(fadeEnd, { opacity: 1 }, curve.out(2)),
      ];

      // ENTRY — opacity is its own track so the pullback reveals the full
      // constellation instead of hard-cutting the pre-expanded windows on.
      scene.animate(`window ${index} fades in`, opacity, opacityKeys);

      // ENTRY — scale 0 → 1 with backOut. This is the canonical "lands
      // with weight" case where bounce reads correctly (motion-design
      // rule 6). It's a UI artefact arriving, not body copy.
      scene.animate(`window ${index} pops in`, scaleWrap, scaleKeys);

      // IDLE — continuous gentle drift on x and y. Each axis is sampled
      // as a slow sin wave; we emit ~14 keyframes over the idle span so
      // the pose() interpolator produces a smooth curve through them.
      // Per-window phase + period offsets keep windows out of sync so
      // the stack as a whole never settles into a collective rhythm.
      const xPhase = (index * 1.7) % (Math.PI * 2);
      const yPhase = (index * 2.3 + 0.9) % (Math.PI * 2);
      const xPeriod = 5.5 + (index % 3) * 0.7;
      const yPeriod = 6.3 + (index % 4) * 0.5;
      const xAmp = 5;
      const yAmp = 4;
      const SAMPLES = 14;

      // Hold the rest pose from scene-start through idleStart (the runtime
      // asserts same-value at→at segments must be explicit holds). The
      // sample loop below appends sin-driven keyframes after idleStart.
      const xKeys = [at(t + 0, { x: 0 })];
      const yKeys = [at(t + 0, { y: 0 })];
      if (idleStart > t) {
         xKeys.push(hold(idleStart));
         yKeys.push(hold(idleStart));
      }
      for (let i = 1; i <= SAMPLES; i += 1) {
         const localT = (i / SAMPLES) * idleSpan;
         const phase = (localT / idleSpan) * Math.PI * 2;
         xKeys.push(
            at(idleStart + localT, { x: xAmp * Math.sin(phase * (idleSpan / xPeriod) + xPhase) }, curve.inOut(2)),
         );
         yKeys.push(
            at(idleStart + localT, { y: yAmp * Math.sin(phase * (idleSpan / yPeriod) + yPhase) }, curve.inOut(2)),
         );
      }

      scene.animate(`window ${index} idle x drift`, driftX, xKeys);
      scene.animate(`window ${index} idle y drift`, driftY, yKeys);
      scene.animate(`window ${index} drops under gravity`, dropY, [
         at(t + 0, { y: 0 }),
         hold(dropStart),
         at(dropEnd, { y: dropDistance }, curve.in(3)),
      ]);
      scene.animate(`window ${index} pivots from top-left pin`, dropPivot, [
         at(t + 0, { rotationZ: 0 }),
         hold(dropStart + 0.04),
         at(dropEnd + 0.08, { rotationZ: dropRotation }, curve.in(3)),
      ]);
   });

   return (
      <div
         className="absolute"
         style={{
            left: x,
            top: y,
            width: WIN_W,
            height: WIN_H,
            zIndex,
            // The window is centred at (x + W/2, y + H/2). For scale to grow
            // FROM the centre of each window, transform-origin needs to be
            // 50% 50% on every wrapper.
         }}
      >
         <div ref={dropY.ref} style={{ width: "100%", height: "100%" }}>
            <div ref={dropPivot.ref} style={{ width: "100%", height: "100%", transformOrigin: "0 0" }}>
               <div ref={driftX.ref} style={{ width: "100%", height: "100%" }}>
                  <div ref={driftY.ref} style={{ width: "100%", height: "100%" }}>
                     <div ref={opacity.ref} style={{ width: "100%", height: "100%" }}>
                        <div ref={scaleWrap.ref} style={{ width: "100%", height: "100%" }}>
                           <SalesWindow src={src} url={url} width={WIN_W} height={WIN_H} />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
