import {
   at,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import { AfricaSilhouette } from "./AfricaSilhouette";
import { Eyebrow } from "./Eyebrow";
import {
   FONT_SANS,
   FONT_SERIF,
   PALETTE,
   POP_CAPTION_DELAY,
   POP_CAPTION_DUR,
   POP_COUNT_DELAY,
   POP_COUNT_DUR,
   POP_COUNT_FROM,
   POP_COUNT_TO,
   POP_EYEBROW_DUR,
   POP_MAP_DELAY,
   POP_MAP_DUR,
   POP_NUMBER_DUR,
   POP_RANGE_DELAY,
   POP_RANGE_DUR,
   popBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Population beat. The hero numeral starts at 100,000 (the early-20th-c.
// wild count) and tallies DOWN over ~1.5s to 7,100 (today's IUCN
// figure). The Africa silhouette to its right shows the historic
// range shrinking into a small cluster of modern pockets in lockstep
// with the count.
//
// Counting DOWN (not up) reinforces "this is being LOST" — the eye
// reads a falling numeral as a loss, a rising numeral as a gain.
// Same shared-timing-anchor (POP_COUNT_DUR) couples the numeric
// rate, the range-opacity crossfade, and the deceleration curve so
// all three resolve on the same frame.

export function PopulationScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const eyebrow = useMotionBinding<HTMLDivElement>();
   const number = useMotionBinding<HTMLDivElement>();
   const counter = useMotionBinding<HTMLSpanElement>();
   const caption = useMotionBinding<HTMLDivElement>();
   const map = useMotionBinding<HTMLDivElement>();
   const historicRange = useMotionBinding<SVGPathElement>();
   const modernRangeGroup = useMotionBinding<SVGGElement>();
   const yearStrip = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("population scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + popBeats.holdEnd),
         at(t + popBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("population eyebrow lifts in", eyebrow, [
         at(t + 0, { opacity: 0, y: 10 }),
         at(t + POP_EYEBROW_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // Big number lands first — same vocabulary as the SpeedScene's
      // 75 mph entry (backOut for "lands with weight"), then the
      // counter takes over.
      scene.animate("population number lands", number, [
         at(t + 0, { opacity: 0, scale: 0.78, y: 16 }),
         at(t + POP_NUMBER_DUR, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.2)),
      ]);

      // Map silhouette fades in just after the number lands.
      scene.animate("africa silhouette emerges", map, [
         at(t + 0, { opacity: 0, scale: 0.94 }),
         hold(t + POP_NUMBER_DUR + POP_MAP_DELAY - 0.04),
         at(t + POP_NUMBER_DUR + POP_MAP_DELAY + POP_MAP_DUR, { opacity: 1, scale: 1 }, curve.out(2)),
      ]);

      // The countdown — text driven by time. Power3InOut so the value
      // rapidly leaves 100k, decelerates into the small final figure
      // (matches the "this loss is settling" perceptual arc).
      const countStart = POP_NUMBER_DUR + POP_COUNT_DELAY;
      const countEnd = countStart + POP_COUNT_DUR;
      scene.text("count down to 7,100", counter, (times) => {
         const localT = times.local;
         if (localT < countStart) return formatPop(POP_COUNT_FROM);
         if (localT >= countEnd) return formatPop(POP_COUNT_TO);
         const u = (localT - countStart) / (countEnd - countStart);
         // power3InOut — fast in the middle, slow at both ends.
         const eased = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
         const current = Math.round(POP_COUNT_FROM - (POP_COUNT_FROM - POP_COUNT_TO) * eased);
         return formatPop(current);
      });

      // Historic range fades out as the count drops; modern range
      // fades in. Both timed to the same range-window so the eye reads
      // a SHRINK (not a swap). The "rangeStart/End" window starts
      // shortly after the count begins.
      const rangeStart = POP_NUMBER_DUR + POP_COUNT_DELAY + POP_RANGE_DELAY;
      const rangeEnd = rangeStart + POP_RANGE_DUR;
      scene.animate("historic range fades out", historicRange, [
         at(t + 0, { opacity: 1 }),
         hold(t + rangeStart),
         at(t + rangeEnd, { opacity: 0.06 }, curve.inOut(2)),
      ]);
      scene.animate("modern range pockets appear", modernRangeGroup, [
         at(t + 0, { opacity: 0 }),
         hold(t + rangeStart + 0.12),
         at(t + rangeEnd, { opacity: 1 }, curve.inOut(2)),
      ]);

      const captionStart = countEnd + POP_CAPTION_DELAY;
      scene.animate("population caption fades in", caption, [
         at(t + 0, { opacity: 0, y: 8 }),
         hold(t + captionStart),
         at(t + captionStart + POP_CAPTION_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("year strip rises in", yearStrip, [
         at(t + 0, { opacity: 0, y: 10 }),
         hold(t + captionStart - 0.08),
         at(t + captionStart + POP_CAPTION_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         {/* Top eyebrow */}
         <div
            className="absolute"
            style={{ top: 120, left: 0, right: 0, display: "flex", justifyContent: "center" }}
         >
            <Eyebrow innerRef={eyebrow.ref}>conservation crisis</Eyebrow>
         </div>

         {/* Number + map layout — side by side. Number on the left
              dominates; the map sits to the right as a supporting
              visualization. */}
         <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: 40 }}>
            <div className="flex items-center" style={{ gap: 96 }}>
               {/* Big counting number */}
               <div className="flex flex-col items-start">
                  <div
                     style={{
                        fontFamily: FONT_SANS,
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: PALETTE.amber,
                     }}
                  >
                     wild cheetahs left
                  </div>
                  <div
                     ref={number.ref}
                     style={{
                        marginTop: 12,
                        fontFamily: FONT_SERIF,
                        fontSize: 280,
                        fontWeight: 600,
                        letterSpacing: "-0.05em",
                        color: PALETTE.ink,
                        lineHeight: 0.92,
                        fontFeatureSettings: '"tnum"',
                        transformOrigin: "0% 50%",
                     }}
                  >
                     <span ref={counter.ref}>{formatPop(POP_COUNT_FROM)}</span>
                  </div>
                  <div
                     ref={yearStrip.ref}
                     className="flex items-center"
                     style={{
                        marginTop: 32,
                        gap: 24,
                        fontFamily: FONT_SANS,
                     }}
                  >
                     <YearPip year="1900" count="100,000" emphasized={false} />
                     <span style={{ color: PALETTE.inkFaint, fontSize: 28, fontWeight: 300 }}>→</span>
                     <YearPip year="today" count="7,100" emphasized={true} />
                  </div>
               </div>

               {/* Africa map. Sized so the continent's height matches
                    the number's cap height — keeps the visual weight
                    of the two halves balanced. */}
               <div ref={map.ref} style={{ width: 440, height: 530, transformOrigin: "50% 50%" }}>
                  <PopulationMap
                     historicRef={historicRange.ref}
                     modernGroupRef={modernRangeGroup.ref}
                  />
               </div>
            </div>
         </div>

         <div
            ref={caption.ref}
            className="absolute"
            style={{
               bottom: 100,
               left: 0,
               right: 0,
               textAlign: "center",
               fontFamily: FONT_SANS,
               fontSize: 26,
               color: PALETTE.inkDim,
               letterSpacing: "0.005em",
               lineHeight: 1.4,
               fontWeight: 400,
            }}
         >
            cheetahs once roamed{" "}
            <span style={{ color: PALETTE.ink, fontWeight: 500 }}>most of Africa</span>. today they hold on in a
            handful of fragmented pockets.
         </div>
      </div>
   );
}

// Africa silhouette + the two range overlays. Built inline so the
// individual <path> refs are easy to bind for the crossfade.
function PopulationMap({
   historicRef,
   modernGroupRef,
}: {
   historicRef?: React.Ref<SVGPathElement>;
   modernGroupRef?: React.Ref<SVGGElement>;
}) {
   const AFRICA_PATH = `
      M 110 30
      C 160 18 230 22 290 36
      C 330 46 358 58 374 80
      C 380 100 372 122 362 138
      C 372 162 388 192 388 220
      C 386 252 374 280 360 304
      C 348 326 332 348 314 374
      C 296 400 274 432 240 458
      C 222 472 200 478 180 470
      C 162 462 152 444 142 426
      C 124 392 104 358 92 320
      C 80 282 70 248 60 214
      C 52 184 48 156 56 128
      C 64 100 78 76 92 56
      C 98 46 102 36 110 30
      Z
   `;
   const HISTORIC_RANGE = `
      M 120 130
      C 150 110 200 100 270 110
      C 330 122 360 140 366 170
      C 366 200 358 230 344 260
      C 332 290 318 314 296 340
      C 274 364 248 384 218 388
      C 190 388 164 376 144 352
      C 124 326 110 296 100 260
      C 92 226 90 196 96 168
      C 102 148 108 138 120 130
      Z
   `;
   const MODERN_BLOBS = [
      `M 290 220 C 310 215 326 232 320 252 C 314 270 294 274 280 264 C 268 250 274 228 290 220 Z`,
      `M 220 350 C 248 345 264 365 256 384 C 248 396 222 396 208 384 C 196 368 204 350 220 350 Z`,
      `M 178 148 C 196 144 208 156 204 170 C 196 180 184 180 176 170 C 172 160 172 152 178 148 Z`,
   ];

   return (
      <svg viewBox="0 0 400 480" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
         <defs>
            <radialGradient id="pop-modern-grad" cx="0.5" cy="0.5" r="0.5">
               <stop offset="0%" stopColor="#FFD27A" />
               <stop offset="100%" stopColor={PALETTE.amberDeep} />
            </radialGradient>
         </defs>

         {/* Continent silhouette: warm wash + soft outline. Slightly more
              opaque than a watermark so the geography reads at a glance
              — the modern range pockets need a recognisable Africa to
              "live in", otherwise they float in undefined space. */}
         <path
            d={AFRICA_PATH}
            fill={PALETTE.ink}
            fillOpacity={0.08}
            stroke={PALETTE.inkDim}
            strokeWidth="2"
            strokeOpacity="0.55"
         />

         {/* Historic range — wash filling most of the interior. */}
         <path ref={historicRef} d={HISTORIC_RANGE} fill={PALETTE.coatDeep} fillOpacity={0.7} />

         {/* Modern range — small saturated pockets that "remain". */}
         <g ref={modernGroupRef}>
            {MODERN_BLOBS.map((d, i) => (
               <g key={i}>
                  <path d={d} fill="url(#pop-modern-grad)" />
                  {/* Ring around each pocket — makes them read as "found
                       here" markers rather than just blobs. */}
                  <path
                     d={d}
                     fill="none"
                     stroke={PALETTE.amber}
                     strokeWidth="1.5"
                     strokeOpacity="0.7"
                  />
               </g>
            ))}
         </g>
      </svg>
   );
}

function YearPip({ year, count, emphasized }: { year: string; count: string; emphasized: boolean }) {
   return (
      <div className="flex flex-col" style={{ alignItems: "flex-start" }}>
         <div
            style={{
               fontFamily: FONT_SANS,
               fontSize: 14,
               fontWeight: 600,
               letterSpacing: "0.12em",
               textTransform: "uppercase",
               color: emphasized ? PALETTE.amber : PALETTE.inkFaint,
            }}
         >
            {year}
         </div>
         <div
            style={{
               marginTop: 4,
               fontFamily: FONT_SERIF,
               fontSize: 32,
               fontWeight: 600,
               letterSpacing: "-0.02em",
               color: emphasized ? PALETTE.ink : PALETTE.inkDim,
               lineHeight: 1,
            }}
         >
            {count}
         </div>
      </div>
   );
}

// 100,000 → "100,000"; 7,100 → "7,100".
function formatPop(value: number): string {
   return value.toLocaleString("en-US");
}
