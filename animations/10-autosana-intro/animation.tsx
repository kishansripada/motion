import {
   Canvas,
   Scene,
   at,
   hold,
   bindMotionElement,
   definePureAnimation,
   curve,
   useElementFlight,
   useMotion,
} from "../../src/framework";
import { ChatExperienceScene } from "./ChatExperienceScene";
import { CursorFixScene } from "./CursorFixScene";
import { GithubPrScene } from "./GithubPrScene";
import { HOLD_AFTER_REPLY, LOOP_DELAY, chatBeats, fixBeats, githubBeats, morphCoordination } from "./beats";
import { GITHUB_TEXT_SIZE, REPLY } from "./shared";

// Cross-scene refs live here because shared text flight, scene fades, and
// dock toggling reach across multiple scene components.
const refs = {
   chatScene: bindMotionElement<HTMLDivElement>(),
   chatTextSlot: bindMotionElement<HTMLSpanElement>(),
   chatReply: bindMotionElement<HTMLDivElement>(),
   githubScene: bindMotionElement<HTMLDivElement>(),
   githubStack: bindMotionElement<HTMLDivElement>(),
   githubReply: bindMotionElement<HTMLDivElement>(),
   githubTextSlot: bindMotionElement<HTMLSpanElement>(),
   githubTextSlotPlaceholder: bindMotionElement<HTMLSpanElement>(),
   travelingText: bindMotionElement<HTMLSpanElement>(),
};

// Scene composition — one place that decides where each scene lands. Each
// child uses scene-LOCAL beats internally; the parent does the time math.
const chatStart = 0;
const githubStart = chatStart + chatBeats.reply + morphCoordination.chatToGithubGap;
const fixStart = githubStart + githubBeats.fadeOut;
const totalDuration = fixStart + fixBeats.successClick + 1.75 + HOLD_AFTER_REPLY;

type MorphCoordinatorProps = {
   chatStart: number;
   githubStart: number;
};

function MorphCoordinator({ chatStart, githubStart }: MorphCoordinatorProps) {
   const replyFlight = useElementFlight({
      from: refs.chatTextSlot,
      to: refs.githubTextSlot,
      capture: "text",
   });

   const chatReplyAbs = chatStart + chatBeats.reply;
   const dockTime = githubStart + morphCoordination.dockLocal;
   const morphEnd = dockTime - morphCoordination.dockHold;
   const morphStart = morphEnd - morphCoordination.textTravelDuration;

   useMotion((scene) => {
      // MorphCoordinator lives at the root scene (scene.start = 0), so every
      // absolute time below is implicitly scene-relative too.
      scene.animate("chat scene fades away during morph", refs.chatScene, [
         at(scene.start, { opacity: 1 }),
         hold(morphStart),
         at(morphStart + morphCoordination.chatFadeDuration, { opacity: 0 }, curve.inOut(2)),
      ]);

      // One floating text element overlays the chat slot, flies to the GitHub
      // slot, then hides as the real static GitHub placeholder becomes visible.
      scene.animate("reply text flies from chat into GitHub comment", refs.travelingText, [
         at(scene.start, replyFlight.from({ opacity: 0 })),
         hold(chatReplyAbs),
         at(chatReplyAbs + 0.42, replyFlight.from({ opacity: 1 }), curve.out(2)),
         hold(morphStart),
         at(morphEnd, replyFlight.to({ opacity: 1 }), curve.inOut(2)),
         at(dockTime, replyFlight.to({ opacity: 0 }), curve.jump()),
      ]);

      scene.animate("GitHub reply placeholder appears after text docks", refs.githubTextSlotPlaceholder, [
         at(scene.start, { opacity: 0 }),
         at(dockTime, { opacity: 1 }, curve.jump()),
      ]);
   });

   return null;
}

function AgentPromptScene() {
   return (
      <Canvas>
         <Scene id="chat" start={chatStart}>
            <ChatExperienceScene
               chatSceneBind={refs.chatScene}
               chatTextSlotBind={refs.chatTextSlot}
               replyBind={refs.chatReply}
            />
         </Scene>

         <Scene id="github" start={githubStart}>
            <GithubPrScene
               githubSceneBind={refs.githubScene}
               githubStackBind={refs.githubStack}
               githubReplyBind={refs.githubReply}
               githubTextSlotBind={refs.githubTextSlot}
               githubTextSlotPlaceholderBind={refs.githubTextSlotPlaceholder}
            />
         </Scene>

         <Scene id="fix" start={fixStart}>
            <CursorFixScene />
         </Scene>

         <span
            ref={refs.travelingText.ref}
            className="pointer-events-none absolute top-0 left-0 z-50 inline-block whitespace-pre-wrap will-change-transform"
            style={{
               opacity: 0,
               color: "#fafafa",
               fontSize: `${GITHUB_TEXT_SIZE}px`,
               lineHeight: `${Math.round(GITHUB_TEXT_SIZE * 1.45)}px`,
               transformOrigin: "0 0",
            }}
         >
            {REPLY}
         </span>

         <MorphCoordinator chatStart={chatStart} githubStart={githubStart} />
      </Canvas>
   );
}

export default definePureAnimation({
   name: "10 · autosana intro",
   frameWidth: 1440,
   component: AgentPromptScene,
   options: {
      duration: totalDuration,
      loopDelay: LOOP_DELAY,
   },
});
