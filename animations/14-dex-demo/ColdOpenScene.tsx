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
   COLD_OPEN_FIRST_WORD,
   COLD_OPEN_WORDS,
   COLD_OPEN_WORD_GAP,
   HEADLINE_SCALE_END,
   HEADLINE_SCALE_FROM,
   WORD_REVEAL_DUR,
   coldOpenBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Cold open. The hook for a LinkedIn-DM-killer product demo: every viewer
// who's ever copy-pasted "hey {firstName}!" into the LinkedIn web inbox
// recognises this sentence in three words. Reveal motion is the canonical
// hero-text pattern (HeroText component); the cold-open's local flourish
// is a container-level scale-up that runs concurrent with the per-word
// fade-ups, sold by attaching the headline binding to the HeroText's
// typography div via `innerRef`.

export function ColdOpenScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const headline = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      // The scene root only owns its own opacity envelope. The fade-in is
      // intentionally near-instant: the cloud bg is already on screen and
      // doesn't need to "arrive". The fade-out is gentler so scene 2 can
      // pick up the bg without a flash.
      scene.animate("cold open scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.12, { opacity: 1 }, curve.out(2)),
         hold(t + coldOpenBeats.hold),
         at(t + coldOpenBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      // Container-level scale flourish. Runs concurrent with the per-word
      // fade-up: the whole headline grows from 0.7 to 1.0 (the natural
      // typography size) across the reveal. Quintic in-out so the
      // velocity peaks in the middle of the reveal, when most of the
      // words are appearing — keeps the scale "active" through the whole
      // arrival rather than front- or back-loaded.
      //
      // This is a per-animation flourish, NOT part of the canonical
      // hero-text reveal pattern (see .claude/skills/hero-text). The
      // canonical reveal is opacity + y on each word, no container
      // scale; this beat layers a subtle scale on top because the cloud
      // bg's softness invites a warmer "forming on screen" feel.
      scene.animate("headline scales up", headline, [
         at(t + 0, { scale: HEADLINE_SCALE_FROM }),
         at(t + HEADLINE_SCALE_END, { scale: 1 }, curve.inOut(5)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center">
         <HeroText
            words={COLD_OPEN_WORDS}
            sceneStart={sceneStart}
            firstWord={COLD_OPEN_FIRST_WORD}
            wordGap={COLD_OPEN_WORD_GAP}
            revealDur={WORD_REVEAL_DUR}
            innerRef={headline.ref}
         />
      </div>
   );
}
