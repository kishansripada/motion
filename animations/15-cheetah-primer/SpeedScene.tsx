import {
   at,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import { Eyebrow } from "./Eyebrow";
import {
   FONT_SANS,
   FONT_SERIF,
   PALETTE,
   SPEED_ARC_DUR,
   SPEED_CAPTION_DELAY,
   SPEED_CAPTION_DUR,
   SPEED_COUNT_DUR,
   SPEED_COUNT_FROM,
   SPEED_COUNT_TO,
   SPEED_EYEBROW_DUR,
   SPEED_NUMBER_DUR,
   SPEED_STATS,
   SPEED_STAT_DUR,
   SPEED_STAT_FIRST,
   SPEED_STAT_STAGGER,
   SPEED_UNIT_DELAY,
   SPEED_UNIT_DUR,
   speedBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// "75 mph" hero beat. Layout: eyebrow → big numeral → mph unit beside it
// → horizontal speedometer bar that fills 0→100% in lockstep with the
// numeral's count-up → 3-column stat strip below.
//
// The numeral and bar are deliberately coupled to one named duration
// (SPEED_COUNT_DUR) so the visual fill and the numeric value land on
// "75" at the exact same frame (motion-design rule 8 — shared timing
// anchor).

export function SpeedScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const eyebrow = useMotionBinding<HTMLDivElement>();
   const number = useMotionBinding<HTMLDivElement>();
   const counter = useMotionBinding<HTMLSpanElement>();
   const unit = useMotionBinding<HTMLDivElement>();
   const bar = useMotionBinding<HTMLDivElement>();
   const barFill = useMotionBinding<HTMLDivElement>();
   const caption = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("speed scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.16, { opacity: 1 }, curve.out(2)),
         hold(t + speedBeats.holdEnd),
         at(t + speedBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("speed eyebrow lifts in", eyebrow, [
         at(t + 0, { opacity: 0, y: 10 }),
         at(t + SPEED_EYEBROW_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // Big number: lands with weight, then the counter takes over and
      // counts 0→75 in lockstep with the bar fill below. backOut on the
      // initial scale gives the "75" a punctuation feel (rule 6).
      scene.animate("big speed number lands", number, [
         at(t + 0, { opacity: 0, scale: 0.78, y: 18 }),
         at(t + SPEED_NUMBER_DUR, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.25)),
      ]);

      // "mph" unit fades in a beat after the numeral has stuck — keeps
      // the unit subordinate and prevents the eye from reading
      // "75-mph" as a compound word.
      scene.animate("speed unit slides in", unit, [
         at(t + 0, { opacity: 0, x: -16 }),
         hold(t + SPEED_NUMBER_DUR + SPEED_UNIT_DELAY),
         at(t + SPEED_NUMBER_DUR + SPEED_UNIT_DELAY + SPEED_UNIT_DUR, { opacity: 1, x: 0 }, curve.out(2)),
      ]);

      // The horizontal counter — text content driven by time. Power3Out
      // matches the bar's ease so the number's perceived velocity tracks
      // the visual fill exactly.
      scene.text("count up to 75", counter, (times) => {
         const localT = times.local;
         const startAt = SPEED_NUMBER_DUR;
         const endAt = startAt + SPEED_COUNT_DUR;
         if (localT < startAt) return String(SPEED_COUNT_FROM);
         if (localT >= endAt) return String(SPEED_COUNT_TO);
         const u = (localT - startAt) / (endAt - startAt);
         const eased = 1 - Math.pow(1 - u, 3);
         return String(Math.round(SPEED_COUNT_FROM + (SPEED_COUNT_TO - SPEED_COUNT_FROM) * eased));
      });

      // Track container fades in just before the fill starts (its inner
      // fill bar uses scaleX from 0→1 to draw the speed value).
      scene.animate("speed bar track fades in", bar, [
         at(t + 0, { opacity: 0, y: 10 }),
         hold(t + SPEED_NUMBER_DUR - 0.04),
         at(t + SPEED_NUMBER_DUR + 0.24, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // Fill scales horizontally 0→1 across the count window. transform-
      // origin is left so it grows rightward (set inline on the element).
      scene.animate("speed bar fills 0 to 75", barFill, [
         at(t + 0, { scale: 0 }),
         hold(t + SPEED_NUMBER_DUR),
         at(t + SPEED_NUMBER_DUR + SPEED_ARC_DUR, { scale: 1 }, curve.out(3)),
      ]);

      const captionStart = speedBeats.numberLand + SPEED_CAPTION_DELAY;
      scene.animate("speed caption fades in", caption, [
         at(t + 0, { opacity: 0, y: 8 }),
         hold(t + captionStart),
         at(t + captionStart + SPEED_CAPTION_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 flex items-center justify-center">
         <div className="flex flex-col items-center" style={{ width: 1500 }}>
            <Eyebrow innerRef={eyebrow.ref} style={{ marginBottom: 32 }}>
               top land speed
            </Eyebrow>

            <div className="flex items-baseline" style={{ gap: 26 }}>
               <div
                  ref={number.ref}
                  style={{
                     fontFamily: FONT_SERIF,
                     fontSize: 360,
                     fontWeight: 600,
                     letterSpacing: "-0.05em",
                     color: PALETTE.ink,
                     lineHeight: 0.92,
                     // The counter text is monospaced via fontFeatureSettings
                     // tabular-nums so the digits don't jitter horizontally
                     // as values cross digit-width boundaries.
                     fontFeatureSettings: '"tnum"',
                     transformOrigin: "50% 50%",
                  }}
               >
                  <span ref={counter.ref}>0</span>
               </div>
               <div
                  ref={unit.ref}
                  style={{
                     fontFamily: FONT_SANS,
                     fontSize: 72,
                     fontWeight: 500,
                     letterSpacing: "-0.01em",
                     color: PALETTE.amber,
                     lineHeight: 1,
                  }}
               >
                  mph
               </div>
            </div>

            {/* Speedometer bar. Track is a faint hairline rounded rect;
                 the fill is an amber gradient that scales rightward. The
                 right end has a glowing "tip" so the moment the fill
                 lands at 75 is visually punctuated. */}
            <div
               ref={bar.ref}
               className="relative"
               style={{
                  marginTop: 26,
                  width: 720,
                  height: 14,
                  borderRadius: 999,
                  background: PALETTE.hairlineSoft,
                  border: `1px solid ${PALETTE.hairlineSoft}`,
                  overflow: "hidden",
               }}
            >
               <div
                  ref={barFill.ref}
                  className="absolute inset-y-0 left-0"
                  style={{
                     width: "100%",
                     transformOrigin: "0% 50%",
                     borderRadius: 999,
                     background: `linear-gradient(to right, ${PALETTE.amberDeep} 0%, ${PALETTE.amber} 60%, #FFD27A 100%)`,
                     boxShadow: `0 0 24px rgba(232, 155, 44, 0.50)`,
                  }}
               />
            </div>

            <div
               ref={caption.ref}
               style={{
                  marginTop: 22,
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  letterSpacing: "0.005em",
                  color: PALETTE.inkDim,
                  textAlign: "center",
                  fontWeight: 400,
                  lineHeight: 1.4,
               }}
            >
               at full sprint a cheetah outruns
               <span style={{ color: PALETTE.ink, fontWeight: 500 }}> every other animal alive</span>.
            </div>

            <div
               className="grid"
               style={{
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  marginTop: 56,
                  gap: 0,
                  width: 1320,
               }}
            >
               {SPEED_STATS.map((stat, i) => (
                  <StatColumn
                     key={stat.label}
                     sceneStart={sceneStart}
                     index={i}
                     value={stat.value}
                     label={stat.label}
                     caption={stat.caption}
                     isLast={i === SPEED_STATS.length - 1}
                  />
               ))}
            </div>
         </div>
      </div>
   );
}

function StatColumn({
   sceneStart,
   index,
   value,
   label,
   caption,
   isLast,
}: {
   sceneStart: number;
   index: number;
   value: string;
   label: string;
   caption: string;
   isLast: boolean;
}) {
   const wrap = useMotionBinding<HTMLDivElement>();
   const start = SPEED_STAT_FIRST + index * SPEED_STAT_STAGGER;

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`speed stat ${label} rises in`, wrap, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + start),
         at(t + start + SPEED_STAT_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div
         ref={wrap.ref}
         className="flex flex-col items-center text-center"
         style={{
            paddingInline: 24,
            borderRight: isLast ? "none" : `1px solid ${PALETTE.hairline}`,
         }}
      >
         <div
            style={{
               fontFamily: FONT_SERIF,
               fontSize: 78,
               fontWeight: 600,
               letterSpacing: "-0.035em",
               color: PALETTE.ink,
               lineHeight: 1,
            }}
         >
            {value}
         </div>
         <div
            style={{
               marginTop: 12,
               fontFamily: FONT_SANS,
               fontSize: 16,
               fontWeight: 600,
               textTransform: "uppercase",
               letterSpacing: "0.10em",
               color: PALETTE.amber,
            }}
         >
            {label}
         </div>
         <div
            style={{
               marginTop: 8,
               fontFamily: FONT_SANS,
               fontSize: 16,
               fontWeight: 400,
               letterSpacing: "0.005em",
               color: PALETTE.inkDim,
               lineHeight: 1.4,
               maxWidth: 280,
            }}
         >
            {caption}
         </div>
      </div>
   );
}
