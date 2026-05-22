import { Canvas, Scene, bindMotionElement, definePureAnimation } from "../../src/framework";
import { AnatomyScene } from "./AnatomyScene";
import { FontShim } from "./FontShim";
import { OutroScene } from "./OutroScene";
import { PopulationScene } from "./PopulationScene";
import { SavannaBackground } from "./SavannaBackground";
import { SpeedScene } from "./SpeedScene";
import { TitleScene } from "./TitleScene";
import { LOOP_DELAY, SCENE_GAP, anatomyBeats, outroBeats, popBeats, speedBeats, titleBeats } from "./beats";

// Cross-scene element bindings — each scene owns its own root fade, the
// parent only times scene starts. The savanna bg is intentionally outside
// any <Scene> so it persists across every scene swap (motion-design rule
// 3: bg never flips between cuts).
const refs = {
   title: bindMotionElement<HTMLDivElement>(),
   speed: bindMotionElement<HTMLDivElement>(),
   anatomy: bindMotionElement<HTMLDivElement>(),
   population: bindMotionElement<HTMLDivElement>(),
   outro: bindMotionElement<HTMLDivElement>(),
};

const titleStart = 0;
// Each scene starts at the prior scene's `holdEnd`, so its fade-in
// overlaps the prior fade-out by exactly the fade duration — no flash
// of bg-only between cuts.
const speedStart = titleStart + titleBeats.holdEnd + SCENE_GAP;
const anatomyStart = speedStart + speedBeats.holdEnd + SCENE_GAP;
const populationStart = anatomyStart + anatomyBeats.holdEnd + SCENE_GAP;
const outroStart = populationStart + popBeats.holdEnd + SCENE_GAP;
const totalDuration = outroStart + outroBeats.end;

function CheetahPrimerAnimation() {
   return (
      <Canvas>
         <FontShim />
         <SavannaBackground duration={totalDuration} />

         <Scene id="title" start={titleStart}>
            <TitleScene sceneBind={refs.title} />
         </Scene>

         <Scene id="speed" start={speedStart}>
            <SpeedScene sceneBind={refs.speed} />
         </Scene>

         <Scene id="anatomy" start={anatomyStart}>
            <AnatomyScene sceneBind={refs.anatomy} />
         </Scene>

         <Scene id="population" start={populationStart}>
            <PopulationScene sceneBind={refs.population} />
         </Scene>

         <Scene id="outro" start={outroStart}>
            <OutroScene sceneBind={refs.outro} />
         </Scene>
      </Canvas>
   );
}

export default definePureAnimation({
   name: "15 · cheetah primer",
   frameWidth: 1920,
   frameHeight: 1080,
   component: CheetahPrimerAnimation,
   options: {
      duration: totalDuration,
      loopDelay: LOOP_DELAY,
   },
});
