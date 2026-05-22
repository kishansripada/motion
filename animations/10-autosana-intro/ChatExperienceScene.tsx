import * as React from "react";
import {
   Scene,
   at,
   hold,
   curve,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import { chatBeats } from "./beats";
import { CheckoutFailureDemo } from "./CheckoutFailureDemo";
import { CHAT_TEXT_SIZE, COLD_OPEN_HOLD, PROMPT, REPLY, SEC_PER_CHAR } from "./shared";
import { AgentComposer, AgentMessage, DashedRail, MessageBubble } from "./ui";

type Props = {
   chatSceneBind: MotionElementBinding<HTMLDivElement>;
   chatTextSlotBind: MotionElementBinding<HTMLSpanElement>;
   replyBind: MotionElementBinding<HTMLDivElement>;
};

export function ChatExperienceScene({ chatSceneBind, chatTextSlotBind, replyBind }: Props) {
   const chatStart = useStartTime();

   return (
      <div ref={chatSceneBind.ref} className="absolute inset-0">
         <DashedRail side="left" />
         <DashedRail side="right" />

         {/* Phone replay only matters from the moment the agent starts running it. */}
         <Scene id="checkoutFailureDemo" start={chatStart + chatBeats.test}>
            <CheckoutFailureDemo />
         </Scene>

         <div className="relative z-10 mx-auto flex h-full w-full max-w-[760px] flex-col px-0 pt-16 pb-[72px]">
            <div className="flex-1" />

            <main className="flex flex-col gap-[18px]">
               {/* Sent prompt bubble is invisible until just after submit. */}
               <Scene id="chatSent" start={chatStart + chatBeats.submit + 0.04}>
                  <SentPromptBubble>{PROMPT}</SentPromptBubble>
               </Scene>

               {/* Agent reply card is invisible until reply. */}
               <Scene id="chatReply" start={chatStart + chatBeats.reply}>
                  <AgentReplyCard textSlotBind={chatTextSlotBind} replyBind={replyBind}>
                     {REPLY}
                  </AgentReplyCard>
               </Scene>

               {/* Composer + cursor are on screen from t=0, so they stay at the chat scene root. */}
               <ChatComposer />
            </main>
         </div>
      </div>
   );
}

function ChatComposer() {
   const input = useMotionBinding<HTMLDivElement>();
   const typed = useMotionBinding<HTMLSpanElement>();
   const cursor = useMotionBinding<HTMLSpanElement>();
   const send = useMotionBinding<HTMLSpanElement>();

   const promptTypeDuration = PROMPT.length * SEC_PER_CHAR;

   useMotion((scene) => {
      const t = scene.start;

      scene.animate("send button presses down and releases", send, [
         at(t + 0, { scale: 1, backgroundColor: "rgba(255, 255, 255, 0.06)", color: "rgba(255, 255, 255, 0.65)" }),
         hold(t + chatBeats.submit),
         at(
            t + chatBeats.submit + 0.09,
            { scale: 0.88, backgroundColor: "rgba(255, 255, 255, 0.95)", color: "rgb(0,0,0)" },
            curve.out(2),
         ),
         at(
            t + chatBeats.submit + 0.38,
            { scale: 1, backgroundColor: "rgba(255, 255, 255, 0.06)", color: "rgba(255, 255, 255, 0.65)" },
            curve.out(2),
         ),
      ]);

      scene.animate("composer border brightens on submit", input, [
         at(t + 0, { borderColor: "rgba(255, 255, 255, 0.22)" }),
         hold(t + chatBeats.submit),
         at(t + chatBeats.submit + 0.14, { borderColor: "rgba(255, 255, 255, 0.55)" }, curve.out(2)),
         at(t + chatBeats.submit + 0.44, { borderColor: "rgba(255, 255, 255, 0.22)" }, curve.out(2)),
      ]);

      scene.animate("typing cursor hides during submit and returns for reply", cursor, [
         at(t + 0, { opacity: 1 }),
         hold(t + chatBeats.submit),
         at(t + chatBeats.submit + 0.08, { opacity: 0 }),
         hold(t + chatBeats.reply + 0.2),
         at(t + chatBeats.reply + 0.38, { opacity: 1 }),
      ]);

      scene.typewrite("typed", typed, {
         text: PROMPT,
         from: t + COLD_OPEN_HOLD,
         duration: promptTypeDuration,
         clearAt: t + chatBeats.submit + 0.04,
      });
   });

   return <AgentComposer ref={input.ref} typedRef={typed.ref} cursorRef={cursor.ref} sendRef={send.ref} />;
}

function SentPromptBubble({ children }: { children: React.ReactNode }) {
   const sent = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = scene.start;

      // Scene starts at chatBeats.submit + 0.04, so the lift/settle is just
      // 0 → 0.62 inside this scene.
      scene.animate("sent prompt bubble lifts into place", sent, [
         at(t + 0, { opacity: 0, y: 18, scale: 0.985 }),
         at(t + 0.38, { opacity: 1, y: -4, scale: 1.01 }, curve.out(2)),
         at(t + 0.62, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.35)),
      ]);
   });

   return <MessageBubble ref={sent.ref}>{children}</MessageBubble>;
}

type AgentReplyCardProps = {
   textSlotBind: MotionElementBinding<HTMLSpanElement>;
   replyBind: MotionElementBinding<HTMLDivElement>;
   children: React.ReactNode;
};

function AgentReplyCard({ textSlotBind, replyBind, children }: AgentReplyCardProps) {
   useMotion((scene) => {
      const t = scene.start;

      // Scene starts at chatBeats.reply, so the card just fades up over 0.42s.
      scene.animate("agent reply card fades and lifts into place", replyBind, [
         at(t + 0, { opacity: 0, y: 14 }),
         at(t + 0.42, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <AgentMessage ref={replyBind.ref} name="Autosana">
         {/* Layout placeholder for the reply line. The visible text is the
             singleton traveling text; this slot stays opacity 0 so we still
             get the right measurements + line height. */}
         <span
            ref={textSlotBind.ref}
            className="inline-block text-base leading-6"
            style={{ fontSize: `${CHAT_TEXT_SIZE}px`, opacity: 0 }}
         >
            {children}
         </span>
      </AgentMessage>
   );
}
