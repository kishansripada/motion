import { Canvas, Scene, bindMotionElement, definePureAnimation } from "../../src/framework";
import { DecisionScene } from "./DecisionScene";
import { LoopScene } from "./LoopScene";
import { OutroScene } from "./OutroScene";
import { ProblemScene } from "./ProblemScene";
import { SignalsScene } from "./SignalsScene";
import { TitleScene } from "./TitleScene";
import {
   LOOP_DELAY,
   SCENE_GAP,
   decisionBeats,
   loopBeats,
   outroBeats,
   problemBeats,
   signalsBeats,
   titleBeats,
} from "./beats";

// Cross-scene element bindings. Each scene registers its own root fade so
// the parent only has to time scene starts. No cross-scene element flight —
// every beat is its own card.
const refs = {
   problem: bindMotionElement<HTMLDivElement>(),
   title: bindMotionElement<HTMLDivElement>(),
   signals: bindMotionElement<HTMLDivElement>(),
   decision: bindMotionElement<HTMLDivElement>(),
   loop: bindMotionElement<HTMLDivElement>(),
   outro: bindMotionElement<HTMLDivElement>(),
};

// Scene composition. Title leads (brand reveal cold-open), then problem
// sets up the pain, then payoff scenes. Each scene's local beats end at
// `<scene>Beats.end` (its own fade-out completion). Chain scene starts
// off that.
const titleStart = 0;
const problemStart = titleStart + titleBeats.end + SCENE_GAP;
const signalsStart = problemStart + problemBeats.end + SCENE_GAP;
const decisionStart = signalsStart + signalsBeats.end + SCENE_GAP;
const loopStart = decisionStart + decisionBeats.end + SCENE_GAP;
const outroStart = loopStart + loopBeats.end + SCENE_GAP;
const totalDuration = outroStart + outroBeats.end;

function PanoptiveLaunchAnimation() {
   return (
      <Canvas>
         <Scene id="title" start={titleStart}>
            <TitleScene sceneBind={refs.title} />
         </Scene>

         <Scene id="problem" start={problemStart}>
            <ProblemScene sceneBind={refs.problem} />
         </Scene>

         <Scene id="signals" start={signalsStart}>
            <SignalsScene sceneBind={refs.signals} />
         </Scene>

         <Scene id="decision" start={decisionStart}>
            <DecisionScene sceneBind={refs.decision} />
         </Scene>

         <Scene id="loop" start={loopStart}>
            <LoopScene sceneBind={refs.loop} />
         </Scene>

         <Scene id="outro" start={outroStart}>
            <OutroScene sceneBind={refs.outro} />
         </Scene>
      </Canvas>
   );
}

export default definePureAnimation({
   name: "12 · panoptive launch",
   frameWidth: 1440,
   frameHeight: 900,
   component: PanoptiveLaunchAnimation,
   options: {
      duration: totalDuration,
      loopDelay: LOOP_DELAY,
   },
});
