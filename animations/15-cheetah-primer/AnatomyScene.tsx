import type { CSSProperties } from "react";
import {
   at,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import { CheetahSilhouette } from "./CheetahSilhouette";
import { Eyebrow } from "./Eyebrow";
import {
   ANATOMY_HEADLINE_DELAY,
   ANATOMY_HEADLINE_DUR,
   ANATOMY_LABELS,
   ANATOMY_LABEL_DOT_DUR,
   ANATOMY_LABEL_DRAW_DUR,
   ANATOMY_LABEL_FADE_DUR,
   ANATOMY_LABEL_FIRST,
   ANATOMY_LABEL_STAGGER,
   ANATOMY_SILHOUETTE_DUR,
   FONT_SANS,
   FONT_SERIF,
   PALETTE,
   anatomyBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Anatomy beat. The cheetah silhouette (mid-stride, all-paws-airborne)
// lands center-stage; four callouts cascade in from the canvas corners,
// each connecting an anchor dot on the body to a heading + caption
// explaining the feature that enables the 75 mph claim from scene 2.
//
// Layout: silhouette is a 1400×510 box centered slightly below the
// canvas midline (the eyebrow + headline live in the top band, ~30%).
// Label cards live in the four canvas corners, each with a connector
// line travelling from corner toward the anchor point on the body.

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const SILHOUETTE_W = 1400;
const SILHOUETTE_H = 510;
const SILHOUETTE_LEFT = (CANVAS_W - SILHOUETTE_W) / 2; // 260
const SILHOUETTE_TOP = 410; // sits below the headline; cheetah's centre at ~y=665

// Where each card sits on the canvas (in canvas-px). The card content
// hugs the corner; the connector dot at the inner end of the line is
// what the body anchor connects to.
const CORNER_INSET_X = 96;
const CORNER_INSET_Y = 60;
const CORNERS: Record<string, { x: number; y: number }> = {
   "top-left": { x: CORNER_INSET_X, y: 330 },
   "top-right": { x: CANVAS_W - CORNER_INSET_X, y: 330 },
   "bottom-left": { x: CORNER_INSET_X, y: CANVAS_H - CORNER_INSET_Y - 140 },
   "bottom-right": { x: CANVAS_W - CORNER_INSET_X, y: CANVAS_H - CORNER_INSET_Y - 140 },
};

export function AnatomyScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const eyebrow = useMotionBinding<HTMLDivElement>();
   const headline = useMotionBinding<HTMLDivElement>();
   const silhouette = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("anatomy scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + anatomyBeats.holdEnd),
         at(t + anatomyBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("anatomy eyebrow lifts in", eyebrow, [
         at(t + 0, { opacity: 0, y: 10 }),
         at(t + 0.42, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      const headlineStart = anatomyBeats.silhouetteLand - 0.32 + ANATOMY_HEADLINE_DELAY;
      scene.animate("anatomy headline rises", headline, [
         at(t + 0, { opacity: 0, y: 12 }),
         hold(t + headlineStart),
         at(t + headlineStart + ANATOMY_HEADLINE_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // Silhouette arrives with a soft fade + scale-up. Outermost wrapper
      // owns the scale so the figure grows toward its centre.
      scene.animate("cheetah silhouette emerges", silhouette, [
         at(t + 0, { opacity: 0, scale: 0.92 }),
         at(t + ANATOMY_SILHOUETTE_DUR, { opacity: 1, scale: 1 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         {/* Top eyebrow + headline strip */}
         <div
            className="absolute"
            style={{
               top: 96,
               left: 0,
               right: 0,
               display: "flex",
               flexDirection: "column",
               alignItems: "center",
            }}
         >
            <Eyebrow innerRef={eyebrow.ref} style={{ marginBottom: 22 }}>
               anatomy of speed
            </Eyebrow>
            <div
               ref={headline.ref}
               style={{
                  fontFamily: FONT_SERIF,
                  fontSize: 68,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: PALETTE.ink,
                  lineHeight: 1.05,
                  textAlign: "center",
                  maxWidth: 1300,
               }}
            >
               every part of a cheetah is{" "}
               <span style={{ fontStyle: "italic", color: PALETTE.amber }}>built for the sprint.</span>
            </div>
         </div>

         {/* Silhouette layer */}
         <div
            ref={silhouette.ref}
            className="absolute"
            style={{
               left: SILHOUETTE_LEFT,
               top: SILHOUETTE_TOP,
               width: SILHOUETTE_W,
               height: SILHOUETTE_H,
               transformOrigin: "50% 50%",
            }}
         >
            <CheetahSilhouette width={SILHOUETTE_W} height={SILHOUETTE_H} />
         </div>

         {/* Connector layer — drawn in canvas-coordinate space so the
              lines reach from corners to anchor points on the silhouette
              without needing percentage-of-parent gymnastics. */}
         <svg
            className="absolute inset-0 pointer-events-none"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            width="100%"
            height="100%"
         >
            {ANATOMY_LABELS.map((label, i) => {
               const anchor = anchorToCanvas(label.anchorX, label.anchorY);
               const corner = CORNERS[label.corner];
               return (
                  <CalloutConnector key={label.id} sceneStart={sceneStart} index={i} anchor={anchor} corner={corner} />
               );
            })}
         </svg>

         {/* Label card layer */}
         {ANATOMY_LABELS.map((label, i) => {
            const corner = CORNERS[label.corner];
            return (
               <CalloutLabel
                  key={label.id}
                  sceneStart={sceneStart}
                  index={i}
                  cornerKind={label.corner}
                  heading={label.heading}
                  body={label.body}
                  style={cardStyle(corner, label.corner)}
               />
            );
         })}
      </div>
   );
}

// Map a silhouette-local fraction to absolute canvas coordinates.
function anchorToCanvas(fracX: number, fracY: number): { x: number; y: number } {
   return {
      x: SILHOUETTE_LEFT + fracX * SILHOUETTE_W,
      y: SILHOUETTE_TOP + fracY * SILHOUETTE_H,
   };
}

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function cardStyle(corner: { x: number; y: number }, kind: string): CSSProperties {
   const base: CSSProperties = {
      position: "absolute",
      width: 320,
   };
   switch (kind as Corner) {
      case "top-left":
         return { ...base, left: corner.x, top: corner.y - 70, transform: "translate(0, 0)", textAlign: "left" };
      case "top-right":
         return {
            ...base,
            right: CANVAS_W - corner.x,
            top: corner.y - 70,
            textAlign: "right",
         };
      case "bottom-left":
         return { ...base, left: corner.x, top: corner.y, textAlign: "left" };
      case "bottom-right":
         return { ...base, right: CANVAS_W - corner.x, top: corner.y, textAlign: "right" };
   }
}

function CalloutConnector({
   sceneStart,
   index,
   anchor,
   corner,
}: {
   sceneStart: number;
   index: number;
   anchor: { x: number; y: number };
   corner: { x: number; y: number };
}) {
   const lineGroup = useMotionBinding<SVGGElement>();
   const dot = useMotionBinding<SVGCircleElement>();
   const start = ANATOMY_LABEL_FIRST + index * ANATOMY_LABEL_STAGGER;

   useMotion((scene) => {
      const t = sceneStart;

      // Stroke-dasharray reveal: the line is dashed at exactly its own
      // length and offset by the same; dropping the offset to 0 makes
      // the visible dash slide in from the anchor end. One easing curve
      // through the dashoffset → one continuous draw.
      const lineLen = Math.hypot(corner.x - anchor.x, corner.y - anchor.y);

      scene.animate(`anatomy connector ${index} draws`, lineGroup, [
         at(t + 0, { opacity: 1, strokeDasharray: `${lineLen} ${lineLen}`, strokeDashoffset: lineLen }),
         hold(t + start),
         at(t + start + ANATOMY_LABEL_DRAW_DUR, { strokeDashoffset: 0 }, curve.inOut(2)),
      ]);

      scene.animate(`anatomy connector ${index} corner dot lands`, dot, [
         at(t + 0, { opacity: 0, scale: 0 }),
         hold(t + start + ANATOMY_LABEL_DRAW_DUR - 0.04),
         at(t + start + ANATOMY_LABEL_DRAW_DUR + ANATOMY_LABEL_DOT_DUR, { opacity: 1, scale: 1 }, curve.backOut(1.5)),
      ]);
   });

   return (
      <g>
         {/* Anchor dot on the cheetah body — soft amber halo + solid
              centre. Sits there for the entire scene. */}
         <circle
            cx={anchor.x}
            cy={anchor.y}
            r={11}
            fill="none"
            stroke={PALETTE.amber}
            strokeOpacity="0.35"
            strokeWidth="2"
         />
         <circle cx={anchor.x} cy={anchor.y} r={6} fill={PALETTE.amber} />

         {/* Connector line, drawn from anchor toward corner. */}
         <g ref={lineGroup.ref}>
            <line
               x1={anchor.x}
               y1={anchor.y}
               x2={corner.x}
               y2={corner.y}
               stroke={PALETTE.amber}
               strokeWidth="1.8"
               strokeLinecap="round"
               opacity={0.7}
            />
         </g>

         {/* Card-side endpoint dot — lights up once the line is fully
              drawn so the eye knows the connector "lands". */}
         <circle
            ref={dot.ref}
            cx={corner.x}
            cy={corner.y}
            r={4}
            fill={PALETTE.amber}
            style={{ transformOrigin: `${corner.x}px ${corner.y}px` }}
         />
      </g>
   );
}

function CalloutLabel({
   sceneStart,
   index,
   cornerKind,
   heading,
   body,
   style,
}: {
   sceneStart: number;
   index: number;
   cornerKind: string;
   heading: string;
   body: string;
   style: CSSProperties;
}) {
   const wrap = useMotionBinding<HTMLDivElement>();
   const start = ANATOMY_LABEL_FIRST + index * ANATOMY_LABEL_STAGGER;
   // Card lights up once the connector has finished drawing.
   const cardStart = start + ANATOMY_LABEL_DRAW_DUR - 0.06;

   useMotion((scene) => {
      const t = sceneStart;
      // Card slides in from "outside the corner" so it lands toward
      // the silhouette — reinforces the read of "the line PULLED the
      // label toward the cheetah". Tiny offsets so the slide is felt
      // not seen.
      const entry: Record<Corner, { x: number; y: number }> = {
         "top-left": { x: -14, y: -8 },
         "top-right": { x: 14, y: -8 },
         "bottom-left": { x: -14, y: 10 },
         "bottom-right": { x: 14, y: 10 },
      };
      const dir = entry[cornerKind as Corner];

      scene.animate(`anatomy label ${index} fades up`, wrap, [
         at(t + 0, { opacity: 0, x: dir.x, y: dir.y }),
         hold(t + cardStart),
         at(t + cardStart + ANATOMY_LABEL_FADE_DUR, { opacity: 1, x: 0, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={wrap.ref} style={{ ...style, fontFamily: FONT_SANS }}>
         <div
            style={{
               fontFamily: FONT_SERIF,
               fontSize: 30,
               fontWeight: 600,
               letterSpacing: "-0.018em",
               color: PALETTE.ink,
               lineHeight: 1.15,
            }}
         >
            {heading}
         </div>
         <div
            style={{
               marginTop: 8,
               fontSize: 17,
               fontWeight: 400,
               letterSpacing: "0.005em",
               color: PALETTE.inkDim,
               lineHeight: 1.42,
            }}
         >
            {body}
         </div>
      </div>
   );
}
