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
   SALES_TOOLS_FADE_FRACTION,
   SALES_TOOLS_FIRST_WORD,
   SALES_TOOLS_FLY_DUR,
   SALES_TOOLS_FLY_SCALE,
   SALES_TOOLS_REVEAL_DUR,
   SALES_TOOLS_WORDS,
   SALES_TOOLS_WORD_GAP,
   salesToolsBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Sales-tools punchline. The windows scene just dropped seven sales-tool
// homepages onto the canvas; this scene is the hard number behind that
// visual: 13 sales tools, just to send one email. Reveal uses the shared
// HeroText component so typography matches the cold open exactly.
//
// The exit is the special part — the user asked for "super fast" close to
// camera, then "behind it". Two decomposed wrappers handle the fly:
// flyScale ramps scale 1 → 18 with power3In (slow start, exponential
// blast into the camera) attached to the HeroText's typography div, and
// flyOpacity wraps the whole thing and drops to 0 in the trailing portion
// of the fly with power2In. The decoupled timings sell the "passed
// through the camera" read — if scale and opacity peaked together it
// would just look like a shrink-out.

export function SalesToolsTextScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const flyOpacity = useMotionBinding<HTMLDivElement>();
   const flyScale = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      // Cloud bg is already on-screen from the prior scenes — fade-in is
      // intentionally near-instant so there's no dead air between the
      // last window leaving and the first word arriving.
      scene.animate("sales-tools scene fades in", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.06, { opacity: 1 }, curve.out(2)),
      ]);

      const flyStart = t + salesToolsBeats.flyStart;
      const flyEnd = t + salesToolsBeats.end;
      const fadeStart = flyStart + SALES_TOOLS_FLY_DUR * SALES_TOOLS_FADE_FRACTION;

      // Scale: 1 → 18 in 0.32s. power3In keeps the line readable for the
      // first frames of the fly (the eye still parses "13 tools." while
      // the headline begins to inflate) then explodes outward.
      scene.animate("headline accelerates into the camera", flyScale, [
         at(t + 0, { scale: 1 }),
         hold(flyStart),
         at(flyEnd, { scale: SALES_TOOLS_FLY_SCALE }, curve.in(3)),
      ]);

      // Opacity: hold at 1 through the readable portion of the fly, then
      // drop with power2In in the trailing window so the headline
      // disappears at peak scale — that's what reads as "passed through
      // the camera" rather than "shrank away".
      scene.animate("headline fades as it passes the camera", flyOpacity, [
         at(t + 0, { opacity: 1 }),
         hold(fadeStart),
         at(flyEnd, { opacity: 0 }, curve.in(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center">
         {/* Two decomposed wrappers: outer owns opacity, inner (the
             HeroText typography div, via innerRef) owns scale. Per
             motion-design rule 7 each transform axis lives on its own
             wrapper. Opacity is not a transform but it shares the
             staggered-end story — opacity finishes well before scale
             does, so the read is "the words vanished as they hit the
             camera" rather than "shrank back out". */}
         <div ref={flyOpacity.ref}>
            <HeroText
               words={SALES_TOOLS_WORDS}
               sceneStart={sceneStart}
               firstWord={SALES_TOOLS_FIRST_WORD}
               wordGap={SALES_TOOLS_WORD_GAP}
               revealDur={SALES_TOOLS_REVEAL_DUR}
               innerRef={flyScale.ref}
            />
         </div>
      </div>
   );
}
