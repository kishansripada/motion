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
import { HeroText } from "./HeroText";
import {
   FONT_SANS,
   PALETTE,
   TITLE_BYLINE_DELAY,
   TITLE_BYLINE_DUR,
   TITLE_FIRST_WORD,
   TITLE_REVEAL_DUR,
   TITLE_SUN_DUR,
   TITLE_WORDS,
   TITLE_WORD_GAP,
   titleBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Title beat — "Built to run." The hero serif lands with the canonical
// per-word reveal; a warm sun glow blooms behind the text on the same
// timeline so the back layer reads as "the canvas is warming up" while
// the text arrives. Eyebrow above, a byline beneath. No literal cheetah
// imagery in this scene — the words ARE the subject. The cheetah enters
// the film in scene 3 (anatomy).

export function TitleScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const headline = useMotionBinding<HTMLDivElement>();
   const sunHalo = useMotionBinding<HTMLDivElement>();
   const eyebrow = useMotionBinding<HTMLDivElement>();
   const byline = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("title scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.14, { opacity: 1 }, curve.out(2)),
         hold(t + titleBeats.holdEnd),
         at(t + titleBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      // Sun halo blooms first — bg-of-the-bg gets a beat of weight before
      // the words land. Container scale + opacity arrive together on a
      // soft out curve so the bloom expands rather than punches in.
      scene.animate("title sun halo blooms", sunHalo, [
         at(t + 0, { opacity: 0, scale: 0.74 }),
         at(t + TITLE_SUN_DUR, { opacity: 1, scale: 1 }, curve.out(3)),
         hold(t + titleBeats.holdEnd),
         at(t + titleBeats.end, { opacity: 0, scale: 1.08 }, curve.inOut(2)),
      ]);

      scene.animate("title eyebrow lifts in", eyebrow, [
         at(t + 0, { opacity: 0, y: 10 }),
         at(t + 0.46, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // A tight container-scale flourish on the headline that runs through
      // the per-word reveal: 0.94 → 1.0 across the reveal envelope. Keeps
      // the typography "settling in" rather than fully static during the
      // staggered word arrivals (motion-design rule 6 — physics that
      // reinforces meaning).
      scene.animate("title headline settles", headline, [
         at(t + 0, { scale: 0.94 }),
         at(t + titleBeats.lastWordLand, { scale: 1 }, curve.inOut(3)),
      ]);

      const bylineStart = titleBeats.lastWordLand + TITLE_BYLINE_DELAY;
      scene.animate("title byline rises in", byline, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + bylineStart),
         at(t + bylineStart + TITLE_BYLINE_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0">
         {/* Local warm halo strictly behind this scene's text. Sits on top
              of the SavannaBackground so it adds focal warmth at the
              centre without flipping the palette. */}
         <div
            ref={sunHalo.ref}
            className="absolute inset-0"
            style={{
               background: [
                  "radial-gradient(ellipse 980px 620px at 50% 56%, rgba(232, 155, 44, 0.60) 0%, rgba(232, 155, 44, 0) 65%)",
                  "radial-gradient(ellipse 1600px 1000px at 50% 60%, rgba(199, 123, 27, 0.32) 0%, rgba(199, 123, 27, 0) 70%)",
               ].join(", "),
               mixBlendMode: "screen",
               transformOrigin: "50% 56%",
               willChange: "transform, opacity",
            }}
         />

         <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Eyebrow innerRef={eyebrow.ref} style={{ marginBottom: 36 }}>
               a short film about cheetahs
            </Eyebrow>

            <HeroText
               words={[TITLE_WORDS]}
               sceneStart={sceneStart}
               firstWord={TITLE_FIRST_WORD}
               wordGap={TITLE_WORD_GAP}
               revealDur={TITLE_REVEAL_DUR}
               innerRef={headline.ref}
               style={{ fontSize: 248, fontWeight: 600 }}
               accentWords={["run."]}
            />

            <div
               ref={byline.ref}
               style={{
                  marginTop: 32,
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: "0.04em",
                  color: PALETTE.inkDim,
                  textAlign: "center",
               }}
            >
               the fastest land animal on earth — and the most fragile.
            </div>
         </div>
      </div>
   );
}
