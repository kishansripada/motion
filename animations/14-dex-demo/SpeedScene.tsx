import {
   at,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import {
   SPEED_CAPTION_DELAY,
   SPEED_CAPTION_DUR,
   SPEED_NUMBER_DUR,
   SPEED_PILL_DUR,
   SPEED_PILL_FIRST,
   SPEED_PILL_STAGGER,
   SPEED_RING_DELAY,
   SPEED_RING_DUR,
   speedBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

const ORANGE = "#FF7A1A";
const ORANGE_DEEP = "#E0570A";
const INK = "rgba(20, 24, 32, 0.94)";
const INK_DIM = "rgba(20, 24, 32, 0.58)";

const FONT_STACK =
   '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const RING_R = 220;
const RING_STROKE = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

// The four status milestones that appear under the headline. Each one
// lands at SPEED_PILL_FIRST + index * SPEED_PILL_STAGGER (scene-local),
// so the cadence reads as "thing 1 just happened, thing 2 just happened…"
// in a tight rhythm that matches the ring's fill.
const MILESTONES = [
   { label: "200 leads found", icon: "search" },
   { label: "187 emails verified", icon: "shield" },
   { label: "intros generated", icon: "pen" },
   { label: "sequence queued", icon: "send" },
] as const;

// "From prompt to pipeline in 5 minutes" — a hero-style callout that
// anchors the speed promise. A big numeral lands first; a circular
// progress ring then fills 0→100% behind it while four milestone pills
// cascade in below. Short and punchy (~3s) — it's a callout, not a
// card grid.

export function SpeedScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const number = useMotionBinding<HTMLDivElement>();
   const numberUnit = useMotionBinding<HTMLDivElement>();
   const ringSpin = useMotionBinding<HTMLDivElement>();
   const caption = useMotionBinding<HTMLDivElement>();
   const eyebrow = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("speed scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.14, { opacity: 1 }, curve.out(2)),
         hold(t + speedBeats.holdEnd),
         at(t + speedBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("eyebrow lifts in", eyebrow, [
         at(t + 0, { opacity: 0, y: 10 }),
         at(t + 0.36, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // Big number — same vocabulary as the SocialProof big number:
      // backOut on scale to "land with weight" (motion-design rule 6).
      scene.animate("big number lands", number, [
         at(t + 0, { opacity: 0, scale: 0.75, y: 16 }),
         at(t + SPEED_NUMBER_DUR, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.25)),
      ]);

      scene.animate("minutes unit fades in slightly behind", numberUnit, [
         at(t + 0, { opacity: 0, x: -10 }),
         hold(t + SPEED_NUMBER_DUR * 0.65),
         at(t + SPEED_NUMBER_DUR + 0.16, { opacity: 1, x: 0 }, curve.out(2)),
      ]);

      // The progress ring lives inside the `ringSpin` wrapper. Rotating
      // the wrapper makes the gradient arc "sweep" around the number —
      // reads as a live progress indicator. Two beats:
      //   1) immediate fade-in around the number landing
      //   2) a continuous ~270° rotation across the scene's hold so the
      //      gradient highlight orbits the figure (instead of freezing).
      const ringStart = t + SPEED_NUMBER_DUR + SPEED_RING_DELAY;
      const ringSpinEnd = ringStart + SPEED_RING_DUR;
      scene.animate("progress ring sweeps around the number", ringSpin, [
         at(t + 0, { opacity: 0, rotationZ: -90 }),
         hold(t + SPEED_NUMBER_DUR - 0.04),
         at(t + SPEED_NUMBER_DUR + 0.2, { opacity: 1, rotationZ: -90 }, curve.out(2)),
         at(ringSpinEnd, { opacity: 1, rotationZ: 180 }, curve.inOut(2)),
      ]);

      const captionStart = speedBeats.numberLand + SPEED_CAPTION_DELAY;
      scene.animate("caption fades in", caption, [
         at(t + 0, { opacity: 0, y: 8 }),
         hold(t + captionStart),
         at(t + captionStart + SPEED_CAPTION_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center">
         <div className="flex flex-col items-center" style={{ width: 1400, fontFamily: FONT_STACK }}>
            <div
               ref={eyebrow.ref}
               className="flex items-center"
               style={{
                  gap: 10,
                  paddingInline: 14,
                  paddingBlock: 6,
                  borderRadius: 999,
                  background: "rgba(255, 122, 26, 0.10)",
                  border: "1px solid rgba(255, 122, 26, 0.20)",
                  color: ORANGE_DEEP,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 18,
               }}
            >
               <span
                  style={{
                     display: "inline-block",
                     width: 6,
                     height: 6,
                     borderRadius: "50%",
                     background: ORANGE,
                     boxShadow: `0 0 0 4px rgba(255,122,26,0.18)`,
                  }}
               />
               from prompt to pipeline
            </div>

            <div
               className="relative flex items-center justify-center"
               style={{ width: RING_R * 2 + RING_STROKE * 2, height: RING_R * 2 + RING_STROKE * 2 }}
            >
               <div
                  ref={ringSpin.ref}
                  className="absolute"
                  style={{
                     left: 0,
                     top: 0,
                     width: "100%",
                     height: "100%",
                     transformOrigin: "50% 50%",
                  }}
               >
                  <ProgressRing />
               </div>

               <div className="absolute flex items-baseline" style={{ gap: 4 }}>
                  <div
                     ref={number.ref}
                     style={{
                        fontSize: 280,
                        fontWeight: 600,
                        letterSpacing: "-0.06em",
                        color: INK,
                        lineHeight: 1,
                        fontFamily: FONT_STACK,
                        transformOrigin: "50% 50%",
                     }}
                  >
                     5
                  </div>
                  <div
                     ref={numberUnit.ref}
                     style={{
                        fontSize: 60,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        color: ORANGE_DEEP,
                        marginLeft: 14,
                     }}
                  >
                     min
                  </div>
               </div>
            </div>

            <div
               ref={caption.ref}
               style={{
                  fontSize: 28,
                  color: INK_DIM,
                  marginTop: 16,
                  letterSpacing: "-0.005em",
                  textAlign: "center",
                  fontWeight: 400,
                  lineHeight: 1.3,
               }}
            >
               from <span style={{ color: INK, fontWeight: 600 }}>"find me leads"</span> to a queued
               outbound sequence — every step automated.
            </div>

            <div
               className="flex items-center justify-center flex-wrap"
               style={{ gap: 14, marginTop: 32, maxWidth: 1200 }}
            >
               {MILESTONES.map((m, i) => (
                  <MilestonePill
                     key={m.label}
                     sceneStart={sceneStart}
                     index={i}
                     label={m.label}
                     icon={m.icon}
                  />
               ))}
            </div>
         </div>
      </div>
   );
}

function ProgressRing() {
   const size = RING_R * 2 + RING_STROKE * 2;
   // A 70% arc — leaves a visible "gap" that orbits the number as the
   // parent wrapper rotates, so the ring reads as a live progress
   // indicator instead of a static donut.
   const arcFraction = 0.7;
   const arcLen = RING_CIRCUMFERENCE * arcFraction;
   const gapLen = RING_CIRCUMFERENCE - arcLen;
   return (
      <svg
         width="100%"
         height="100%"
         viewBox={`0 0 ${size} ${size}`}
         style={{ display: "block" }}
         aria-hidden="true"
      >
         <defs>
            <linearGradient id="speed-ring-grad" x1="0" y1="0" x2="1" y2="1">
               <stop offset="0%" stopColor="#FFB347" />
               <stop offset="100%" stopColor={ORANGE_DEEP} />
            </linearGradient>
         </defs>
         {/* Faint full-circle track for visual stability */}
         <circle
            cx={size / 2}
            cy={size / 2}
            r={RING_R}
            fill="none"
            stroke="rgba(20,24,32,0.06)"
            strokeWidth={RING_STROKE}
         />
         {/* Orange progress arc (~70% of the circumference) */}
         <circle
            cx={size / 2}
            cy={size / 2}
            r={RING_R}
            fill="none"
            stroke="url(#speed-ring-grad)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${gapLen}`}
         />
      </svg>
   );
}

function MilestonePill({
   sceneStart,
   index,
   label,
   icon,
}: {
   sceneStart: number;
   index: number;
   label: string;
   icon: string;
}) {
   const pill = useMotionBinding<HTMLDivElement>();
   const pillStart = SPEED_PILL_FIRST + index * SPEED_PILL_STAGGER;

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`speed milestone ${label} fades in`, pill, [
         at(t + 0, { opacity: 0, y: 14, scale: 0.94 }),
         hold(t + pillStart),
         at(t + pillStart + SPEED_PILL_DUR, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.2)),
      ]);
   });

   return (
      <div
         ref={pill.ref}
         className="flex items-center"
         style={{
            gap: 10,
            paddingInline: 16,
            paddingBlock: 11,
            background: "rgba(255,255,255,0.94)",
            borderRadius: 999,
            border: "1px solid rgba(20,24,32,0.08)",
            boxShadow: "0 10px 24px -14px rgba(28,40,80,0.20)",
            backdropFilter: "blur(6px)",
         }}
      >
         <MilestoneIcon kind={icon} />
         <span
            style={{
               fontSize: 16,
               fontWeight: 500,
               color: INK,
               letterSpacing: "-0.005em",
            }}
         >
            {label}
         </span>
      </div>
   );
}

function MilestoneIcon({ kind }: { kind: string }) {
   const wrap = (path: React.ReactNode) => (
      <span
         style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "rgba(255,122,26,0.14)",
            color: ORANGE_DEEP,
         }}
      >
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            {path}
         </svg>
      </span>
   );
   if (kind === "search") return wrap(<><circle cx="11" cy="11" r="6.8" /><path d="m20 20-4.6-4.6" /></>);
   if (kind === "shield") return wrap(<><path d="M12 2 4 5v7c0 5 3.5 8 8 10 4.5-2 8-5 8-10V5l-8-3z" /><path d="m9 12 2 2 4-4" /></>);
   if (kind === "pen") return wrap(<><path d="M12 19l7-7 3 3-7 7H12v-3z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></>);
   return wrap(<><path d="m4 11 17-7-7 17-2.5-7.5z" /></>);
}
