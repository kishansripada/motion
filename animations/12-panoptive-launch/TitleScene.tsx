import { at, hold, curve, useMotion, useMotionBinding, useStartTime, type MotionElementBinding } from "../../src/framework";
import { titleBeats } from "./beats";
import { CYAN, PANOPTIVE } from "./shared";
import logoUrl from "./logo.png";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Two-act title scene.
//
// ACT 1 — brand forms (0 → ~1.7s)
//   Logo enters huge and dead-centred on the canvas, then scales down and
//   slides left into its lockup-rest slot. Wordmark reveals letter-by-letter
//   as that lateral follow-through plays. Scale + X tracks use curves
//   measured from the Greptile pterodactyl mark (scale ≈ circ.out, x =
//   custom cubic-bezier with a delayed glide). Three nested wrappers split
//   the axes so each can carry its own ease/timing.
//
// ACT 2 — value prop takes over (~1.78 → 3.13s)
//   The formed lockup compresses + lifts to clear canvas centre. Two
//   separate wrappers carry the motion — `lockupCompress` owns scale,
//   `lockupLiftY` owns y. Both axes use `power3InOut`: each is a SETTLE
//   that follows a visible hold (the lockup has been at rest at scale=1,
//   y=0 for ~1.8s), so the ease must have E'(0)=0 to avoid a velocity
//   jolt at the boundary. `*Out` family curves like `circOut` are the
//   wrong choice here — they'd start at MAX velocity and "boom" the
//   lockup into motion (see rule 7 of motion-design SKILL.md).
//
//   Decomposing the axes (rule 7) is what keeps the move from reading
//   like a Figma transform-handle drag. The decomposition reads through
//   staggered end times, NOT through different curve shapes: scale
//   settles at lockupScaleEnd (~2.25), y trails 170ms later at
//   lockupLiftEnd (~2.42). Eye registers "smaller" before "tucked away".
//
//   Tagline ("Run and defend / clinical trial oversight") then reveals
//   word-by-word with a subtle pop, two lines stacked, large enough to
//   dominate the canvas the way the wordmark just did.

const NAME = PANOPTIVE.name; // "Panoptive"
const LETTERS = NAME.split("");
const TAGLINE_LINES = PANOPTIVE.taglineLines;

const LOGO_SIZE = 180;
// Entry offsets are unscaled CSS px on the respective wrapper. They put the
// logo's geometric centre at canvas centre (720, 450) so the huge entry
// pose at scale 4.4 fits fully inside the 1440×900 canvas — no top
// clipping. Lockup-rest is at canvas (427, 398), so canvas-centre is at
// delta (+293, +52) from rest.
const LOGO_ENTRY_X = 293;
const LOGO_ENTRY_Y = 52;
const LOGO_ENTRY_SCALE = 4.4;

// Post-reveal: the lockup compresses by ~40% and lifts so the tagline
// can claim canvas centre. The tagline is the visual hero (size hierarchy
// — fontSize 108 vs the wordmark's effective 132*0.6 = 79 px), so the
// lockup tucks well above midline and the tagline fills the lower 2/3.
const LOCKUP_SHRINK_SCALE = 0.6;
const LOCKUP_LIFT_Y = -130;

// The measured Greptile logo scale curve fits `circ.out` closely. The x curve
// comes from cubic-bezier(1, 0.0624, 0.3767, 0.9087), converted into endpoint
// velocity handles so it stays inside the Bezier `at(...)` API.
const LOGO_SCALE_CURVE = curve.circOut();
const LOGO_X_CURVE = {
   transition: {
      start: { speed: 0.0624, influence: 1 },
      end: { speed: 0.1465, influence: 0.6233 },
   },
};

export function TitleScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   // Three nested wrappers for ACT 1 (logo flight) — order matters. Each
   // track only writes ONE axis so the others fall to their identity
   // defaults (`x:0, y:0, scale:1`). Composition stays clean: outer
   // translateX has no parent scale to multiply it, middle translateY has
   // no parent scale to multiply it, innermost scale only affects the
   // visible content.
   const logoX = useMotionBinding<HTMLDivElement>(); // outermost: lateral slide
   const logoY = useMotionBinding<HTMLDivElement>(); // middle: descent + opacity
   const logoScale = useMotionBinding<HTMLDivElement>(); // innermost: scale impact
   const logoGlow = useMotionBinding<HTMLDivElement>();
   // ACT 2 wrappers: the formed lockup (logo + wordmark) compresses and
   // lifts as the value-prop tagline takes over. Decomposed across two
   // wrappers so each axis gets its own ease + end time (rule 7 of
   // motion-design SKILL.md). Coupling them onto one track makes the
   // move read like a Figma transform-handle drag.
   //   · lockupLiftY    outer  — owns y, settles 170ms after scale, power3InOut
   //   · lockupCompress inner  — owns scale, settles first, circOut
   const lockupLiftY = useMotionBinding<HTMLDivElement>();
   const lockupCompress = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const b = titleBeats;

      scene.animate("title scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.05, { opacity: 1 }, curve.out(2)),
         hold(t + b.hold),
         at(t + b.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      // Y track (middle wrapper). Carries the small Y settle + opacity
      // ramp. The Greptile mark's vertical centre is nearly stationary
      // during the measured shrink/slide, so Y stays understated here; the
      // main read comes from scale + X.
      scene.animate("logo y settle", logoY, [
         at(t + 0, { opacity: 0, y: LOGO_ENTRY_Y }),
         at(t + b.logoIn, { opacity: 1, y: LOGO_ENTRY_Y }, curve.out(2)),
         at(t + b.yDescentEnd, { opacity: 1, y: 0 }, curve.inOut(2)),
      ]);

      // Scale track (innermost wrapper). Uses the measured pterodactyl
      // mark scale curve, mapped from huge → rest size. There is no bounce:
      // the reference motion shrinks decisively, then lets the x glide
      // carry the remaining energy.
      scene.animate("logo scale impact", logoScale, [
         at(t + 0, { scale: LOGO_ENTRY_SCALE }),
         hold(t + b.logoIn),
         at(t + b.scaleSettle, { scale: 1 }, LOGO_SCALE_CURVE),
      ]);

      // X track (outer wrapper). Starts with the shrink, but the measured
      // bezier delays visible travel until late in the move. This is the
      // reference's key feel: the logo gets small quickly, then glides left
      // into the lockup.
      scene.animate("logo x lateral slide", logoX, [
         at(t + 0, { x: LOGO_ENTRY_X }),
         hold(t + b.xStart),
         at(t + b.xEnd, { x: 0 }, LOGO_X_CURVE),
      ]);

      // Cyan halo blooms behind the logo at the moment it lands (the Y
      // descent's impact, not the X slide finishing). Fades to a quieter
      // ambient glow afterwards, then dims further as the lockup shrinks
      // (we want the tagline, not the glow, to be the focal point in act 2).
      // Glow opacity tracks the LIFT settle (last axis to finish) so the
      // glow doesn't dim out before the lockup has visually arrived.
      scene.animate("logo glow pulses on impact", logoGlow, [
         at(t + 0, { opacity: 0, scale: 0.3 }),
         at(t + b.yDescentEnd - 0.08, { opacity: 0, scale: 0.6 }),
         at(t + b.yDescentEnd + 0.1, { opacity: 0.85, scale: 1.6 }, curve.out(2)),
         at(t + b.scaleSettle + 0.4, { opacity: 0.45, scale: 1 }, curve.inOut(2)),
         hold(t + b.lockupHoldEnd),
         at(t + b.lockupLiftEnd, { opacity: 0.18, scale: 0.85 }, curve.inOut(3)),
      ]);

      // ACT 2 — DECOMPOSED axis motion. Two separate tracks on two
      // separate wrappers, each with its own end time but the SAME ease
      // family. Both axes use `power3InOut` because both are SETTLES that
      // follow a visible hold — at lockupHoldEnd the lockup has been
      // sitting at scale=1, y=0 for ~1.8s with zero velocity, so any ease
      // with non-zero E'(0) (power*Out, circOut) would create an instant
      // velocity jolt — the eye reads it as a "boom" since nothing else
      // in the scene has any reason to suddenly accelerate. See rule 7
      // of motion-design SKILL.md ("*Out after a visible hold").
      //
      // What makes this read as decomposed motion isn't different curves
      // — it's the staggered end times. Scale settles at lockupScaleEnd
      // (~2.25); y trails by 170ms and finishes at lockupLiftEnd (~2.42).
      // The eye reads "shrunk, then tucked" as two perceptual events
      // because the velocity peaks of the two axes don't coincide.
      //
      // Both tracks hold identity through lockupHoldEnd so act 1 stays
      // unaffected; both `power3InOut` eases have E'(0)=0 at that
      // boundary, so the velocity boundary is a clean 0→0 kiss into
      // act 2.
      scene.animate("lockup compresses (scale, power3InOut)", lockupCompress, [
         at(t + 0, { scale: 1 }),
         hold(t + b.lockupHoldEnd),
         at(t + b.lockupScaleEnd, { scale: LOCKUP_SHRINK_SCALE }, curve.inOut(3)),
      ]);

      scene.animate("lockup lifts to clear canvas (y, power3InOut)", lockupLiftY, [
         at(t + 0, { y: 0 }),
         hold(t + b.lockupHoldEnd),
         at(t + b.lockupLiftEnd, { y: LOCKUP_LIFT_Y }, curve.inOut(3)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 overflow-hidden bg-black">
         {/* ACT 1 LAYER — formed lockup, centred by grid until act 2 lifts it.
             Two nested wrappers carry the act-2 motion, OUTER → INNER:
               · lockupLiftY    translateY only  (mass drifts up,    power3InOut)
               · lockupCompress scale only       (compression settles, power3InOut)
             Same ease family on both axes — the decomposition reads through
             staggered END times, not through different curve shapes. Order
             matters because the framework's transform composition multiplies
             inner translates by outer scale; here scale is innermost so it
             doesn't multiply ITS OWN children's translates once they're at
             rest, AND y stays in canvas px (no scaling). */}
         <div className="absolute inset-0 grid place-items-center">
            <div ref={lockupLiftY.ref}>
               <div ref={lockupCompress.ref}>
                  <div className="flex items-center" style={{ gap: 56 }}>
                     {/* Three nested wrappers, OUTER → INNER:
                           · logoX     translateX only (lateral slide)
                           · logoY     translateY + opacity (descent + visibility)
                           · logoScale scale only (innermost)
                        Sits inside lockupCompress so the act-2 shrink scales
                        it uniformly with the wordmark. */}
                     <div ref={logoX.ref} style={{ width: LOGO_SIZE, height: LOGO_SIZE }}>
                        <div ref={logoY.ref} style={{ width: "100%", height: "100%" }}>
                           <div ref={logoScale.ref} className="relative h-full w-full">
                              <div
                                 ref={logoGlow.ref}
                                 className="absolute -inset-16 rounded-full"
                                 aria-hidden="true"
                                 style={{
                                    background: `radial-gradient(closest-side, ${CYAN}77, ${CYAN}11 50%, transparent 75%)`,
                                    filter: "blur(28px)",
                                 }}
                              />
                              <img
                                 src={logoUrl}
                                 alt="Panoptive logomark"
                                 className="absolute inset-0 h-full w-full select-none"
                                 draggable={false}
                                 style={{
                                    filter: `drop-shadow(0 0 16px ${CYAN}aa)`,
                                 }}
                              />
                           </div>
                        </div>
                     </div>

                     <div
                        className="font-medium tracking-[-0.035em] text-white whitespace-nowrap"
                        style={{ fontSize: 132, lineHeight: 0.9 }}
                     >
                        {LETTERS.map((char, i) => (
                           <Letter key={i} index={i} sceneStart={sceneStart} char={char} />
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* ACT 2 LAYER — hero tagline. Positioned in the lower half of the
             canvas. Each word is its own motion-bound span: pop in with
             opacity + scale + slight rise, staggered. Two flex rows so the
             line break is deterministic regardless of viewport. */}
         <div
            className="absolute left-0 right-0 flex flex-col items-center"
            style={{ top: "50%", marginTop: 0, gap: 4 }}
         >
            {TAGLINE_LINES.map((words, lineIndex) => (
               <div key={lineIndex} className="flex items-baseline" style={{ gap: 28 }}>
                  {words.map((word, wordIndex) => {
                     const flatIndex =
                        TAGLINE_LINES.slice(0, lineIndex).reduce((acc, line) => acc + line.length, 0) + wordIndex;
                     return (
                        <Word key={`${lineIndex}-${wordIndex}`} index={flatIndex} sceneStart={sceneStart} word={word} />
                     );
                  })}
               </div>
            ))}
         </div>
      </div>
   );
}

type LetterProps = {
   index: number;
   sceneStart: number;
   char: string;
};

// Each letter owns its own motion binding. Flies in from the RIGHT (x:+52)
// and lands with a `backOut` bounce — overshoots leftward of its rest slot
// for a frame, then settles. The bounce reads as character/personality at
// wordmark scale (132px); for body copy like the tagline it'd read as
// gimmicky, but here it's the brand asserting itself with confidence.
// Stagger between letters is set in beats.ts.
function Letter({ index, sceneStart, char }: LetterProps) {
   const span = useMotionBinding<HTMLSpanElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const b = titleBeats;
      const start = t + b.letter0 + index * b.letterStagger;

      scene.animate(`letter ${index} (${char}) flies in from right`, span, [
         at(t + 0, { opacity: 0, x: 52 }),
         hold(start),
         at(start + b.letterReveal, { opacity: 1, x: 0 }, curve.backOut(2.2)),
      ]);
   });

   return (
      <span ref={span.ref} style={{ display: "inline-block" }}>
         {char}
      </span>
   );
}

type WordProps = {
   index: number;
   sceneStart: number;
   word: string;
};

// Each tagline word fades up: opacity 0→1, lifts from y +14 to 0, with
// power2.out. No scale, no overshoot — for a value-prop tagline, the word
// just needs to *arrive*; backOut bounce reads as gimmicky here. The
// per-word stagger from beats.ts is what carries the rhythm.
function Word({ index, sceneStart, word }: WordProps) {
   const span = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const b = titleBeats;
      const start = t + b.word0 + index * b.wordStagger;

      scene.animate(`tagline word ${index} (${word}) fades up`, span, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(start),
         at(start + b.wordReveal, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div
         ref={span.ref}
         className="font-medium tracking-[-0.03em] text-white"
         style={{ fontSize: 108, lineHeight: 1.02 }}
      >
         {word}
      </div>
   );
}
