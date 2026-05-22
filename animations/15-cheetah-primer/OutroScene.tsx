import {
   at,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import { HeroText } from "./HeroText";
import {
   FONT_SANS,
   FONT_SERIF,
   OUTRO_GLYPH_ENTRY,
   OUTRO_TAGLINE_DELAY,
   OUTRO_TAGLINE_DUR,
   OUTRO_URL_DELAY,
   OUTRO_URL_DUR,
   OUTRO_WORDMARK_DUR,
   OUTRO_WORDMARK_FIRST,
   OUTRO_WORDMARK_GAP,
   OUTRO_WORDMARK_WORDS,
   PALETTE,
   outroBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Closing CTA. A small spot-glyph drops in first, the wordmark
// ("Save the cheetah.") cascades in word-by-word, a tagline fades up
// beneath it, and a URL pill lands last. The whole composition holds
// for ~1.6 s so the viewer's last frame is the brand.
//
// A warm focal halo blooms behind the wordmark to add weight without
// flipping the palette — the savanna bg stays continuous with the
// prior scenes; the halo just concentrates its warmth at centre.

export function OutroScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const halo = useMotionBinding<HTMLDivElement>();
   const glyph = useMotionBinding<HTMLDivElement>();
   const wordmark = useMotionBinding<HTMLDivElement>();
   const tagline = useMotionBinding<HTMLDivElement>();
   const url = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("outro scene fades in", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.2, { opacity: 1 }, curve.out(2)),
      ]);

      scene.animate("outro halo blooms behind brand", halo, [
         at(t + 0, { opacity: 0, scale: 0.86 }),
         hold(t + OUTRO_GLYPH_ENTRY - 0.12),
         at(t + outroBeats.glyphLand + 0.18, { opacity: 1, scale: 1 }, curve.out(3)),
         hold(t + outroBeats.urlLand + 0.7),
         at(t + outroBeats.end, { opacity: 0.85, scale: 1.06 }, curve.inOut(2)),
      ]);

      // Glyph (cheetah-spot motif) drops in just before the wordmark
      // starts to arrive. backOut gives it the only bit of "weight"
      // in the scene — it's the single graphic element here.
      scene.animate("outro glyph drops in", glyph, [
         at(t + 0, { opacity: 0, scale: 0.6, y: 14 }),
         hold(t + OUTRO_GLYPH_ENTRY - 0.04),
         at(t + outroBeats.glyphLand, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.45)),
      ]);

      // Wordmark container — gets a very subtle scale-up across the
      // hold so the poster frame doesn't feel frozen.
      scene.animate("outro wordmark settles", wordmark, [
         at(t + 0, { scale: 0.97 }),
         hold(t + OUTRO_WORDMARK_FIRST),
         at(t + outroBeats.wordmarkLand, { scale: 1 }, curve.out(2)),
         at(t + outroBeats.end, { scale: 1.02 }, curve.inOut(2)),
      ]);

      const taglineStart = outroBeats.wordmarkLand + OUTRO_TAGLINE_DELAY;
      scene.animate("outro tagline rises in", tagline, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + taglineStart),
         at(t + taglineStart + OUTRO_TAGLINE_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      const urlStart = outroBeats.taglineLand + OUTRO_URL_DELAY;
      scene.animate("outro url pill fades in last", url, [
         at(t + 0, { opacity: 0, y: 10 }),
         hold(t + urlStart),
         at(t + urlStart + OUTRO_URL_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         {/* Warm halo at the centre — concentrates the existing bg
              warmth so the CTA "lifts" out of the canvas. */}
         <div
            ref={halo.ref}
            className="absolute inset-0"
            style={{
               background: [
                  "radial-gradient(ellipse 900px 580px at 50% 50%, rgba(232, 155, 44, 0.50) 0%, rgba(232, 155, 44, 0) 65%)",
                  "radial-gradient(ellipse 1500px 1000px at 50% 55%, rgba(199, 123, 27, 0.30) 0%, rgba(199, 123, 27, 0) 70%)",
               ].join(", "),
               mixBlendMode: "screen",
               transformOrigin: "50% 50%",
            }}
         />

         <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div ref={glyph.ref} style={{ marginBottom: 28, transformOrigin: "50% 50%" }}>
               <CheetahSpotGlyph />
            </div>

            <div ref={wordmark.ref} style={{ transformOrigin: "50% 50%" }}>
               <HeroText
                  words={[OUTRO_WORDMARK_WORDS]}
                  sceneStart={sceneStart}
                  firstWord={OUTRO_WORDMARK_FIRST}
                  wordGap={OUTRO_WORDMARK_GAP}
                  revealDur={OUTRO_WORDMARK_DUR}
                  style={{ fontSize: 184, fontWeight: 600 }}
                  accentWords={["cheetah."]}
               />
            </div>

            <div
               ref={tagline.ref}
               className="text-center"
               style={{
                  marginTop: 22,
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 400,
                  letterSpacing: "0.005em",
                  color: PALETTE.inkDim,
                  lineHeight: 1.35,
                  maxWidth: 920,
               }}
            >
               the fastest land animal could be{" "}
               <span style={{ color: PALETTE.ink, fontWeight: 500 }}>extinct within 20 years</span>.
            </div>

            <div ref={url.ref} className="flex items-center" style={{ marginTop: 38 }}>
               <div
                  className="inline-flex items-center"
                  style={{
                     gap: 14,
                     paddingInline: 26,
                     paddingBlock: 14,
                     borderRadius: 999,
                     background: "rgba(20, 14, 8, 0.55)",
                     border: `1px solid ${PALETTE.amber}`,
                     fontFamily: FONT_SANS,
                     fontSize: 20,
                     letterSpacing: "0.04em",
                     color: PALETTE.ink,
                     fontWeight: 500,
                     backdropFilter: "blur(6px)",
                  }}
               >
                  <span
                     style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: PALETTE.amber,
                        boxShadow: `0 0 0 4px rgba(232, 155, 44, 0.20)`,
                     }}
                  />
                  cheetah.org
                  <span style={{ color: PALETTE.amber, fontSize: 22, marginLeft: 2 }}>→</span>
               </div>
            </div>

            {/* Eyebrow under the URL — credit / source line. */}
            <div
               style={{
                  marginTop: 26,
                  fontFamily: FONT_SANS,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: PALETTE.inkFaint,
               }}
            >
               cheetah conservation fund
            </div>
         </div>
      </div>
   );
}

// Stylised cheetah-spot glyph. A cluster of dark spots arranged in a
// roughly circular pattern over a warm amber disc — the visual motif
// of the cheetah's coat condensed into a single icon. Big and graphic
// so it reads at preview size.
function CheetahSpotGlyph() {
   const SIZE = 132;
   const R = 60;
   // Spots laid by hand in normalised (-R..R) coordinates. Asymmetric
   // on purpose — a perfectly symmetrical pattern reads as a fabric
   // print, not a coat.
   const spots = [
      { x: -28, y: -22, r: 9 },
      { x: 8, y: -34, r: 8 },
      { x: 32, y: -14, r: 10 },
      { x: -36, y: 8, r: 8 },
      { x: -4, y: 4, r: 11 },
      { x: 30, y: 18, r: 9 },
      { x: -22, y: 32, r: 8 },
      { x: 14, y: 36, r: 10 },
   ];

   return (
      <div style={{ width: SIZE, height: SIZE }}>
         <svg viewBox={`-${R + 6} -${R + 6} ${(R + 6) * 2} ${(R + 6) * 2}`} width={SIZE} height={SIZE} aria-hidden="true">
            <defs>
               <radialGradient id="outro-disc" cx="0.5" cy="0.4" r="0.6">
                  <stop offset="0%" stopColor="#FFD27A" />
                  <stop offset="55%" stopColor={PALETTE.amber} />
                  <stop offset="100%" stopColor={PALETTE.amberDeep} />
               </radialGradient>
            </defs>

            {/* Soft outer ring */}
            <circle cx={0} cy={0} r={R + 4} fill="none" stroke={PALETTE.amber} strokeOpacity="0.35" strokeWidth="2" />

            {/* Disc */}
            <circle cx={0} cy={0} r={R} fill="url(#outro-disc)" />

            {/* Coat spots */}
            {spots.map((s, i) => (
               <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={PALETTE.spot} />
            ))}

            {/* Top-left highlight rim — light direction cue. */}
            <path
               d={`M ${-R * 0.7} ${-R * 0.4} A ${R} ${R} 0 0 1 ${R * 0.4} ${-R * 0.7}`}
               fill="none"
               stroke="rgba(255, 233, 194, 0.55)"
               strokeWidth="3"
               strokeLinecap="round"
            />
         </svg>
      </div>
   );
}
