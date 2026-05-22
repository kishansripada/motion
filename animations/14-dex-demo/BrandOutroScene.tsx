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
   OUTRO_LOGO_ENTRY,
   OUTRO_TAGLINE_DELAY,
   OUTRO_TAGLINE_DUR,
   OUTRO_URL_DELAY,
   OUTRO_URL_DUR,
   OUTRO_WORDMARK_REVEAL_DUR,
   OUTRO_WORDMARK_WORDS,
   OUTRO_WORDMARK_WORD_GAP,
   outroBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

const ORANGE = "#FF7A1A";
const ORANGE_DEEP = "#E0570A";

// Brand outro. Cloud bg is still doing its slow drift in the background;
// this scene adds a warm orange "rim" wash centered on the wordmark so
// the palette continuity (rule 3) doesn't flip — but the colour temperature
// at the centre of frame goes warm to land the brand. The wordmark is
// composed exactly like the cold-open hero text but at a larger size and
// with the brand glyph (a stylized orange slice) tucked to the left.

export function BrandOutroScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const warmth = useMotionBinding<HTMLDivElement>();
   const composition = useMotionBinding<HTMLDivElement>();
   const glyph = useMotionBinding<HTMLDivElement>();
   const tagline = useMotionBinding<HTMLDivElement>();
   const url = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("brand outro scene fades in", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
      ]);

      // Warm orange radial overlay washes up under the wordmark. Stops
      // short of the canvas edges so the cloud bg stays visible at the
      // corners — palette continuity preserved, but the focal region
      // gets a brand tint.
      scene.animate("warm halo blooms behind wordmark", warmth, [
         at(t + 0, { opacity: 0, scale: 0.85 }),
         hold(t + OUTRO_LOGO_ENTRY - 0.16),
         at(t + outroBeats.logoLand, { opacity: 1, scale: 1 }, curve.out(3)),
         hold(t + outroBeats.urlLand + 0.6),
         at(t + outroBeats.end, { opacity: 0.7, scale: 1.05 }, curve.inOut(2)),
      ]);

      // The whole composition gets a very subtle scale-up through the
      // hold so the poster frame doesn't feel frozen. Tight numbers —
      // 1.00 → 1.03 across the hold reads as "breath" without
      // upstaging the wordmark itself.
      scene.animate("composition breathes through the hold", composition, [
         at(t + 0, { scale: 0.98 }),
         hold(t + OUTRO_LOGO_ENTRY),
         at(t + outroBeats.logoLand, { scale: 1 }, curve.out(2)),
         at(t + outroBeats.end, { scale: 1.03 }, curve.inOut(2)),
      ]);

      // Glyph (the stylised orange slice) lands one beat before the
      // wordmark words start arriving. backOut(1.4) gives it a tiny
      // bounce — it's the only graphic element here so it earns a
      // little weight on landing.
      scene.animate("brand glyph drops in", glyph, [
         at(t + 0, { opacity: 0, scale: 0.6, y: 12 }),
         hold(t + OUTRO_LOGO_ENTRY - 0.04),
         at(t + OUTRO_LOGO_ENTRY + 0.42, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.4)),
      ]);

      const taglineStart = outroBeats.logoLand + OUTRO_TAGLINE_DELAY;
      scene.animate("tagline rises into place", tagline, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + taglineStart),
         at(t + taglineStart + OUTRO_TAGLINE_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      const urlStart = outroBeats.taglineLand + OUTRO_URL_DELAY;
      scene.animate("url pill fades in last", url, [
         at(t + 0, { opacity: 0, y: 8 }),
         hold(t + urlStart),
         at(t + urlStart + OUTRO_URL_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         {/* Warm halo. Two stacked radial gradients — a soft saturated core
              and a wider cooler bloom — produce a more natural-looking
              wash than a single radial would. */}
         <div
            ref={warmth.ref}
            className="absolute inset-0"
            style={{
               background: [
                  "radial-gradient(ellipse 1100px 700px at 50% 50%, rgba(255, 168, 79, 0.55) 0%, rgba(255, 168, 79, 0) 70%)",
                  "radial-gradient(ellipse 1600px 1000px at 50% 55%, rgba(255, 122, 26, 0.28) 0%, rgba(255, 122, 26, 0) 70%)",
               ].join(", "),
               mixBlendMode: "multiply",
               transformOrigin: "50% 50%",
            }}
         />

         <div className="absolute inset-0 grid place-items-center">
            <div ref={composition.ref} className="flex flex-col items-center" style={{ transformOrigin: "50% 50%" }}>
               <div ref={glyph.ref} style={{ transformOrigin: "50% 50%" }}>
                  <OrangeSliceGlyph />
               </div>

               <Wordmark sceneStart={sceneStart} />

               <div
                  ref={tagline.ref}
                  className="text-center"
                  style={{
                     marginTop: 14,
                     fontSize: 36,
                     lineHeight: 1.15,
                     letterSpacing: "-0.02em",
                     color: "rgba(20,24,32,0.72)",
                     fontWeight: 400,
                     fontFamily:
                        '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
               >
                  automate any sales task with <span style={{ color: ORANGE_DEEP, fontWeight: 500 }}>AI</span>
               </div>

               <div ref={url.ref} className="flex items-center" style={{ marginTop: 30 }}>
                  <div
                     style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        paddingInline: 22,
                        paddingBlock: 12,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.78)",
                        border: "1px solid rgba(20,24,32,0.10)",
                        boxShadow: "0 12px 30px -16px rgba(28,40,80,0.20)",
                        fontSize: 18,
                        letterSpacing: "0.01em",
                        color: "rgba(20,24,32,0.78)",
                        fontFamily:
                           '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                     }}
                  >
                     <span
                        style={{
                           display: "inline-block",
                           width: 8,
                           height: 8,
                           borderRadius: "50%",
                           background: ORANGE,
                           boxShadow: `0 0 0 4px rgba(255, 122, 26, 0.18)`,
                        }}
                     />
                     orangeslice.ai
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

// Stylised orange-slice glyph. Composed in SVG: a half-circle peel with
// triangular wedges radiating from a centre point at the flat edge. Kept
// big and graphic so it reads at preview size — see motion-design rule 5.
function OrangeSliceGlyph() {
   const R = 64;
   const wedgeCount = 7;
   const wedges: number[] = [];
   for (let i = 0; i < wedgeCount; i += 1) {
      const angle = -90 + (i / (wedgeCount - 1)) * 180;
      wedges.push(angle);
   }

   return (
      <div style={{ width: 132, height: 132, marginBottom: 22 }}>
         <svg viewBox={`-${R + 4} -${R + 4} ${(R + 4) * 2} ${(R + 4) * 2}`} width="132" height="132" aria-hidden="true">
            <defs>
               <radialGradient id="brand-orange-rind" cx="0.5" cy="0.5" r="0.7">
                  <stop offset="0%" stopColor="#FFB347" />
                  <stop offset="55%" stopColor="#FF8A2A" />
                  <stop offset="100%" stopColor="#E0570A" />
               </radialGradient>
               <radialGradient id="brand-orange-flesh" cx="0.5" cy="0.5" r="0.6">
                  <stop offset="0%" stopColor="#FFE9C2" />
                  <stop offset="100%" stopColor="#FFD394" />
               </radialGradient>
            </defs>

            {/* Outer rind — full circle */}
            <circle cx={0} cy={0} r={R} fill="url(#brand-orange-rind)" />

            {/* Flesh — slightly smaller inner circle */}
            <circle cx={0} cy={0} r={R - 9} fill="url(#brand-orange-flesh)" />

            {/* Wedge segment lines radiating from centre */}
            {wedges.map((deg, i) => {
               const rad = (deg * Math.PI) / 180;
               const x2 = Math.cos(rad) * (R - 11);
               const y2 = Math.sin(rad) * (R - 11);
               return (
                  <line
                     key={i}
                     x1={0}
                     y1={0}
                     x2={x2}
                     y2={y2}
                     stroke="#FFB347"
                     strokeWidth={3}
                     strokeLinecap="round"
                     opacity={0.85}
                  />
               );
            })}

            {/* Centre pith dot */}
            <circle cx={0} cy={0} r={5} fill="#FFE9C2" />
            <circle cx={0} cy={0} r={5} fill="none" stroke="#FFB347" strokeWidth={1.5} />

            {/* Subtle outer highlight — top-left rim suggests a light source */}
            <path
               d={`M ${-R * 0.7} ${-R * 0.35} A ${R} ${R} 0 0 1 ${R * 0.35} ${-R * 0.7}`}
               fill="none"
               stroke="rgba(255,255,255,0.55)"
               strokeWidth={3}
               strokeLinecap="round"
            />
         </svg>
      </div>
   );
}

// Wordmark — two words ("Orange" + "Slice") staggered, exactly the same
// per-word reveal that the cold-open uses. Centred under the glyph.
function Wordmark({ sceneStart }: { sceneStart: number }) {
   return (
      <div
         className="flex items-baseline"
         style={{
            gap: 24,
            fontFamily:
               '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: 168,
            fontWeight: 600,
            letterSpacing: "-0.045em",
            lineHeight: 1.0,
         }}
      >
         {OUTRO_WORDMARK_WORDS.map((word, i) => (
            <BrandWord
               key={word}
               text={word}
               sceneStart={sceneStart}
               startOffset={OUTRO_LOGO_ENTRY + i * OUTRO_WORDMARK_WORD_GAP}
               accent={word === "Slice"}
            />
         ))}
      </div>
   );
}

function BrandWord({
   text,
   sceneStart,
   startOffset,
   accent,
}: {
   text: string;
   sceneStart: number;
   startOffset: number;
   accent: boolean;
}) {
   const word = useMotionBinding<HTMLSpanElement>();

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`brand word "${text}" rises in`, word, [
         at(t + 0, { opacity: 0, y: 22 }),
         hold(t + startOffset),
         at(t + startOffset + OUTRO_WORDMARK_REVEAL_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <span
         ref={word.ref}
         style={{
            display: "inline-block",
            color: accent ? ORANGE_DEEP : "rgba(20,24,32,0.94)",
         }}
      >
         {text}
      </span>
   );
}
