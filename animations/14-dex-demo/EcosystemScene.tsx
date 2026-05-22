import {
   at,
   circleTrack,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   xyTrack,
   type MotionElementBinding,
   type MotionStyle,
   type SpatialStyleTrack,
} from "../../src/framework";
import {
   ECO_CHIPS,
   ECO_HEADLINE_DUR,
   ECO_MOTION_DUR,
   ECO_PHASE1_DUR,
   ECO_PHASE1_START_VEL_DEG,
   ECO_PHASE2_VEL_DEG,
   ecoBeats,
   ecoRotationAt,
} from "./beats";
import { logoUrl } from "./logoDev";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

const ORANGE_DEEP = "#E0570A";
const INK = "rgba(20, 24, 32, 0.94)";
const INK_DIM = "rgba(20, 24, 32, 0.58)";

const FONT_STACK =
   '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ─── Geometry ───────────────────────────────────────────────────────────
//
// Canvas is 1920×1080. The ring is a huge circle whose centre sits well
// below the canvas, so only the top arc shows in frame. Logos sit on the
// ring; the apex (top) renders at full size + full opacity; logos toward
// the sides shrink and fade. The whole ring spins clockwise — fast at the
// start, decelerating into a slow linear cruise.
//
// Implementation: ONE circleTrack defines the ring path, ONE custom
// "gradient" style-track defines the scale/opacity falloff curve, and
// each logo uses exactly two scene.follow() calls with three progress
// keyframes apiece. No dense keyframes — the framework maps scalar
// progress to exact circular geometry.

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const RING_RADIUS = 1520;
const RING_CX = CANVAS_W / 2;
const RING_CY = CANVAS_H + RING_RADIUS - 720; // ring centre is below canvas; apex sits at y = CANVAS_H - 720

const LOGO_BASE = 150;
const MAX_SCALE = 1.72;
const MIN_SCALE = 0.22;
const LOGO_PROGRESS_GAP = 0.047;
const VISIBILITY_HALF_WIDTH = 0.155;

// ─── Ring path ──────────────────────────────────────────────────────────
//
// The authored path begins and ends at the bottom seam, which is hidden
// below the visible arc by the scale/opacity gradient. Progress keeps the
// normal track invariant: p=0 is the first authored waypoint, p=1 is the
// last authored waypoint.
const RING_PATH = circleTrack(
   [
      { id: "bottom", angle: Math.PI }, // p=0    — seam (invisible)
      { id: "left", angle: (3 * Math.PI) / 2 }, // p=0.25
      { id: "top", angle: 2 * Math.PI }, // p=0.5  — apex (visible)
      { id: "right", angle: (5 * Math.PI) / 2 }, // p=0.75
      { id: "bottomClose", angle: 3 * Math.PI }, // p=1    — closes the seam
   ] as const,
   {
      center: {
         x: RING_CX - LOGO_BASE / 2,
         y: RING_CY - LOGO_BASE / 2,
      },
      radius: RING_RADIUS,
      wrap: true,
   },
);

// ─── Gradient lookup ───────────────────────────────────────────────────
//
// Maps the logo's progress (0 = bottom seam, 0.5 = apex, 1 = bottom
// close) to a (scale, opacity) pair. The metadata track below keeps the
// inspector readable; the sample() override uses a tight bell curve so
// logos fade hard unless they are close to the visible apex.

const GRADIENT_XY = xyTrack(
   [
      { id: "bottom", x: MIN_SCALE, y: 0 }, // p=0    — invisible at bottom
      { id: "leftSide", x: MIN_SCALE, y: 0 }, // p=0.25 — still fading
      { id: "apex", x: MAX_SCALE, y: 1 }, // p=0.5  — full size, full opacity
      { id: "rightSide", x: MIN_SCALE, y: 0 }, // p=0.75 — fading out
      { id: "bottomClose", x: MIN_SCALE, y: 0 }, // p=1    — closes the loop
   ] as const,
   { curve: "autoBezier", tension: 0.72 },
);

// Wrap an xyTrack so it emits scale+opacity from its (x, y) sample. The
// runtime only checks `output === "style"`; the `kind` field is a label.
// `parts: []` is fine — `parts` is only consumed by camera-aware UI bits
// we don't render here.
const GRADIENT_TRACK: SpatialStyleTrack = {
   ...GRADIENT_XY,
   kind: "camera-position",
   output: "style",
   parts: [],
   sample(progress: number): MotionStyle {
      // Wrap progress around the unit circle so the gradient repeats
      // each full revolution and never clamps at the path edges.
      let p = progress % 1;
      if (p < 0) p += 1;
      const distanceFromApex = Math.abs(p - 0.5);
      const normalized = Math.max(0, 1 - distanceFromApex / VISIBILITY_HALF_WIDTH);
      const eased = normalized * normalized * (3 - 2 * normalized);
      return {
         scale: MIN_SCALE + (MAX_SCALE - MIN_SCALE) * eased,
         opacity: eased * eased,
      };
   },
} satisfies SpatialStyleTrack;

// ─── Rotation arc ──────────────────────────────────────────────────────
//
// Total rotation as progress (in cycles, where 1 = full revolution).
// Phase 1: fast deceleration from PHASE1_START_VEL to PHASE2_VEL.
// Phase 2: linear cruise at PHASE2_VEL.
// `ecoRotationAt(...)` already integrates the piecewise-linear velocity
// profile in degrees — we just divide by 360 to land in cycle units.
const PHASE_1_END_PROGRESS = ecoRotationAt(ECO_PHASE1_DUR) / 360;
const TOTAL_PROGRESS = ecoRotationAt(ECO_MOTION_DUR) / 360;

// Boundary velocity speed multipliers for the three-keyframe progress
// track. `speed` is the boundary velocity expressed as a multiple of the
// segment's average velocity (1 = linear, 0 = stop, 3 = 3×average).
//
// Phase 1 [0 → phase1Dur]:
//   avgV = phase1Dist / phase1Dur
//   start.speed = startVel / avgV
//   end.speed   = phase2Vel / avgV   ← matches phase 2's incoming velocity
//
// Phase 2 [phase1Dur → motionEnd]:
//   avgV = phase2Vel  (constant, by construction)
//   start.speed = end.speed = 1   (linear pass-through; velocity stays at phase2Vel)
const PHASE_1_AVG_VEL_DEG = ecoRotationAt(ECO_PHASE1_DUR) / ECO_PHASE1_DUR;
const PHASE_1_START_SPEED = ECO_PHASE1_START_VEL_DEG / PHASE_1_AVG_VEL_DEG;
const PHASE_1_END_SPEED = ECO_PHASE2_VEL_DEG / PHASE_1_AVG_VEL_DEG;

export function EcosystemScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const headline = useMotionBinding<HTMLDivElement>();
   const caption = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("ecosystem scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + ecoBeats.holdEnd),
         at(t + ecoBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("ecosystem headline arrives", headline, [
         at(t + 0, { opacity: 0, y: 14 }),
         at(t + ECO_HEADLINE_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      const captionStart = ecoBeats.motionEnd - 0.55;
      scene.animate("ecosystem caption fades in", caption, [
         at(t + 0, { opacity: 0, y: 10 }),
         hold(t + captionStart),
         at(t + captionStart + 0.42, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         <div
            ref={headline.ref}
            className="absolute"
            style={{
               left: 0,
               right: 0,
               top: 120,
               textAlign: "center",
               fontFamily: FONT_STACK,
               fontSize: 56,
               fontWeight: 500,
               letterSpacing: "-0.025em",
               color: INK,
               lineHeight: 1.1,
            }}
         >
            built to live <span style={{ color: ORANGE_DEEP, fontWeight: 600 }}>where your data lives</span>
         </div>

         <div className="absolute inset-0">
            {ECO_CHIPS.map((chip, i) => (
               <RingLogo key={chip.id} chip={chip} baseProgress={i * LOGO_PROGRESS_GAP} sceneStart={sceneStart} />
            ))}
         </div>

         <div
            ref={caption.ref}
            className="absolute"
            style={{
               left: 0,
               right: 0,
               bottom: 96,
               textAlign: "center",
               fontFamily: FONT_STACK,
               fontSize: 22,
               color: INK_DIM,
               letterSpacing: "0.005em",
               lineHeight: 1.4,
               paddingInline: 200,
            }}
         >
            150+ integrations · CRMs, sequencers, data providers, search engines, your internal APIs — Orange Slice is
            the layer that connects them all.
         </div>
      </div>
   );
}

type RingLogoProps = {
   chip: (typeof ECO_CHIPS)[number];
   baseProgress: number; // 0..1 — where this logo sits on the ring before any rotation
   sceneStart: number;
};

// One logo riding the ring. Two follow tracks ride the same shared
// progress arc: RING_PATH writes {x, y} translates; GRADIENT_TRACK writes
// {scale, opacity}. The framework merges both per-frame so the element
// gets a single `transform: translate(x, y) scale(s)` + `opacity: o`
// write per render tick.
//
// The progress arc itself is the rotation curve — three keyframes:
//   t=0           → progress = baseProgress         (entry)
//   t=phase1End   → progress = base + phase1Cycles  (decelerating segment)
//   t=motionEnd   → progress = base + totalCycles   (linear cruise segment)
// with boundary `speed` multipliers chosen so the inspector's velocity
// continuity check is C¹.
function RingLogo({ chip, baseProgress, sceneStart }: RingLogoProps) {
   const wrapper = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const startP = baseProgress;
      const phase1P = baseProgress + PHASE_1_END_PROGRESS;
      const motionP = baseProgress + TOTAL_PROGRESS;

      const progressKeyframes = [
         at(t + 0, startP),
         at(t + ECO_PHASE1_DUR, phase1P, {
            transition: {
               start: { speed: PHASE_1_START_SPEED },
               end: { speed: PHASE_1_END_SPEED },
            },
         }),
         at(t + ECO_MOTION_DUR, motionP, {
            transition: {
               start: { speed: 1 },
               end: { speed: 1 },
            },
         }),
         hold(t + ecoBeats.holdEnd),
      ];

      scene.follow(`logo ${chip.id} rides the ring path`, wrapper, RING_PATH, progressKeyframes);
      scene.follow(`logo ${chip.id} samples gradient`, wrapper, GRADIENT_TRACK, progressKeyframes);
   });

   return (
      <div
         ref={wrapper.ref}
         style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: LOGO_BASE,
            height: LOGO_BASE,
            transformOrigin: "center center",
            willChange: "transform, opacity",
         }}
      >
         <LogoCard domain={chip.domain} />
      </div>
   );
}

// Logos-only chip — no text. White rounded square with the brand mark
// inside. Sized at LOGO_BASE; the parent's `scale` track grows / shrinks
// it relative to its centre.
function LogoCard({ domain }: { domain: string }) {
   return (
      <div
         style={{
            width: "100%",
            height: "100%",
            background: "#ffffff",
            borderRadius: 28,
            border: "1px solid rgba(20,24,32,0.08)",
            boxShadow: ["0 28px 56px -24px rgba(28,40,80,0.30)", "0 10px 22px -10px rgba(0,0,0,0.20)"].join(", "),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
         }}
      >
         <img
            src={logoUrl(domain, { size: 256, retina: true, format: "png" })}
            alt=""
            width={LOGO_BASE * 0.72}
            height={LOGO_BASE * 0.72}
            style={{
               width: LOGO_BASE * 0.72,
               height: LOGO_BASE * 0.72,
               objectFit: "contain",
               display: "block",
            }}
            draggable={false}
         />
      </div>
   );
}
