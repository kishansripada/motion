import { Canvas, Scene, bindMotionElement, definePureAnimation } from "../../src/framework";
import { AgentLoopScene } from "./AgentLoopScene";
import { BrandOutroScene } from "./BrandOutroScene";
import { CloudBackground } from "./CloudBackground";
import { ColdOpenScene } from "./ColdOpenScene";
import { EcosystemScene } from "./EcosystemScene";
import { ProductHtmlScene } from "./ProductHtmlScene";
import { SalesToolsTextScene } from "./SalesToolsTextScene";
import { SlackScene } from "./SlackScene";
import { SocialProofScene } from "./SocialProofScene";
import { SpeedScene } from "./SpeedScene";
import { WindowsScene } from "./WindowsScene";
import {
   LOOP_DELAY,
   SCENE_GAP,
   agentLoopBeats,
   coldOpenBeats,
   ecoBeats,
   outroBeats,
   productHtmlBeats,
   proofBeats,
   salesToolsBeats,
   slackBeats,
   speedBeats,
   windowsBeats,
} from "./beats";

// Cross-scene element bindings. Each scene owns its own root fade so the
// parent only times scene starts. The cloud bg is intentionally outside
// any <Scene> so it persists across every scene swap (motion-design rule
// 3: never flip the canvas color between cuts).
const refs = {
   coldOpen: bindMotionElement<HTMLDivElement>(),
   windows: bindMotionElement<HTMLDivElement>(),
   salesTools: bindMotionElement<HTMLDivElement>(),
   productHtml: bindMotionElement<HTMLDivElement>(),
   agentLoop: bindMotionElement<HTMLDivElement>(),
   slack: bindMotionElement<HTMLDivElement>(),
   speed: bindMotionElement<HTMLDivElement>(),
   ecosystem: bindMotionElement<HTMLDivElement>(),
   proof: bindMotionElement<HTMLDivElement>(),
   outro: bindMotionElement<HTMLDivElement>(),
};

const coldOpenStart = 0;
const windowsStart = coldOpenStart + coldOpenBeats.end + SCENE_GAP;
const salesToolsStart = windowsStart + windowsBeats.end + SCENE_GAP;
const productHtmlStart = salesToolsStart + salesToolsBeats.end + SCENE_GAP;
// Each scene starts at the previous scene's `holdEnd`, so the next
// scene's fade-in overlaps the previous scene's fade-out by exactly
// the fade duration — no flash of bg-only between cuts.
const agentLoopStart = productHtmlStart + productHtmlBeats.holdEnd;
const slackStart = agentLoopStart + agentLoopBeats.holdEnd;
const speedStart = slackStart + slackBeats.holdEnd;
const ecosystemStart = speedStart + speedBeats.holdEnd;
const proofStart = ecosystemStart + ecoBeats.holdEnd;
const outroStart = proofStart + proofBeats.holdEnd;
const totalDuration = outroStart + outroBeats.end;

function DexDemoAnimation() {
   return (
      <Canvas className="bg-white">
         <CloudBackground duration={totalDuration} />

         <Scene id="cold-open" start={coldOpenStart}>
            <ColdOpenScene sceneBind={refs.coldOpen} />
         </Scene>

         <Scene id="windows" start={windowsStart}>
            <WindowsScene sceneBind={refs.windows} />
         </Scene>

         <Scene id="sales-tools" start={salesToolsStart}>
            <SalesToolsTextScene sceneBind={refs.salesTools} />
         </Scene>

         <Scene id="product-html" start={productHtmlStart}>
            <ProductHtmlScene sceneBind={refs.productHtml} />
         </Scene>

         <Scene id="agent-loop" start={agentLoopStart}>
            <AgentLoopScene sceneBind={refs.agentLoop} />
         </Scene>

         <Scene id="slack" start={slackStart}>
            <SlackScene sceneBind={refs.slack} />
         </Scene>

         <Scene id="speed" start={speedStart}>
            <SpeedScene sceneBind={refs.speed} />
         </Scene>

         <Scene id="ecosystem" start={ecosystemStart}>
            <EcosystemScene sceneBind={refs.ecosystem} />
         </Scene>

         <Scene id="social-proof" start={proofStart}>
            <SocialProofScene sceneBind={refs.proof} />
         </Scene>

         <Scene id="brand-outro" start={outroStart}>
            <BrandOutroScene sceneBind={refs.outro} />
         </Scene>
      </Canvas>
   );
}

export default definePureAnimation({
   name: "14 · dex demo",
   frameWidth: 1920,
   frameHeight: 1080,
   component: DexDemoAnimation,
   options: {
      duration: totalDuration,
      loopDelay: LOOP_DELAY,
   },
});
