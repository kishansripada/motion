import * as React from "react";
import { at, hold, curve, useMotionBinding, useMotion, type MotionElementBinding } from "../../src/framework";
import { githubBeats, morphCoordination } from "./beats";
import { GITHUB_TEXT_SIZE, REPLY } from "./shared";

// The agent's follow-up comment shown after the bug-report flies in.
const VIDEO_REPLY = "Here’s a video of the failing flow:";

// First comment card materialize duration after the morph.
const MORPH_REPLY_CARD_DURATION = 0.65;

// PR stack camera-style poses. Inspired by the Greptile reference: the UI is
// mostly a flat 2D plane, but camera x/y/scale/tilt are split into independent
// carriers so at least one axis keeps drifting through each content beat.
const STACK_X_DEFAULT_POSE = {
   x: 0,
} as const;
const STACK_X_CLOSE_POSE = {
   x: 56,
} as const;
const STACK_X_FINAL_POSE = {
   x: 430,
} as const;

const STACK_Y_DEFAULT_POSE = {
   y: 0,
} as const;
const STACK_Y_FINAL_POSE = {
   y: -190,
} as const;

const STACK_PUSH_DEFAULT_POSE = {
   z: 0,
   scale: 1,
} as const;
const STACK_PUSH_FINAL_POSE = {
   z: 286,
   scale: 1.22,
} as const;

const STACK_TILT_DEFAULT_POSE = {
   rotationX: 0,
   rotationY: 0,
   rotationZ: 0,
} as const;
const STACK_TILT_FINAL_POSE = {
   rotationX: 2.4,
   rotationY: -2.2,
   rotationZ: -0.25,
} as const;

type Props = {
   githubSceneBind: MotionElementBinding<HTMLDivElement>;
   githubStackBind: MotionElementBinding<HTMLDivElement>;
   githubReplyBind: MotionElementBinding<HTMLDivElement>;
   githubTextSlotBind: MotionElementBinding<HTMLSpanElement>;
   githubTextSlotPlaceholderBind: MotionElementBinding<HTMLSpanElement>;
};

export function GithubPrScene({
   githubSceneBind,
   githubStackBind,
   githubReplyBind,
   githubTextSlotBind,
   githubTextSlotPlaceholderBind,
}: Props) {
   const githubSecondComment = useMotionBinding<HTMLDivElement>();
   const videoReplyText = useMotionBinding<HTMLSpanElement>();
   const githubStackY = useMotionBinding<HTMLDivElement>();
   const githubStackPush = useMotionBinding<HTMLDivElement>();
   const githubStackTilt = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = scene.start;
      const dockLocal = morphCoordination.dockLocal;

      // GitHub scene fades in at scene start and out at fadeOut.
      scene.animate("GitHub scene fades in for morph and fades out for fix", githubSceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + githubBeats.morphInEnd, { opacity: 1 }, curve.inOut(2)),
         hold(t + githubBeats.fadeOut),
         at(t + githubBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      // PR stack moves through default → close → follow start → follow end → final.
      //
      // ⚠ Do not shorten the initial DEFAULT hold below dockLocal. The morph in animation.tsx flies
      // `refs.travelingText` toward `refs.githubTextSlot` and the dock target
      // is the slot's screen position. The stack must be at DEFAULT through
      // the entire morph so the dock lands where the placeholder ultimately
      // sits — once the stack tilts/translates, BCR-based measurements no
      // longer correspond to the visual position of an interior span (BCR
      // returns an AABB of the rotated render). Treat dockLocal as a
      // synchronization barrier, not dead air.
      // The transform is split across wrappers. The timing endpoints are
      // intentionally offset: x carries late, scale arrives earlier, and tilt
      // keeps a faint residual angle. That matches the Greptile-style "camera
      // never quite stops" feel around a flat 2D surface.
      scene.animate("GitHub PR camera x glides across the plane", githubStackBind, [
         at(t + 0, STACK_X_DEFAULT_POSE),
         hold(t + dockLocal),
         at(t + dockLocal + 0.85, STACK_X_CLOSE_POSE, curve.inOut(2)),
         at(t + githubBeats.fadeOut + 0.1, STACK_X_FINAL_POSE, curve.inOut(5)),
      ]);

      scene.animate("GitHub PR camera y drifts under the x glide", githubStackY, [
         at(t + 0, STACK_Y_DEFAULT_POSE),
         hold(t + dockLocal + 0.06),
         at(t + githubBeats.fadeOut - 0.05, STACK_Y_FINAL_POSE, curve.inOut(4)),
      ]);

      scene.animate("GitHub PR camera push breathes over the flat UI", githubStackPush, [
         at(t + 0, STACK_PUSH_DEFAULT_POSE),
         hold(t + dockLocal + 0.13),
         at(t + githubBeats.fadeOut + 0.25, STACK_PUSH_FINAL_POSE, curve.inOut(4)),
      ]);

      scene.animate("GitHub PR plane keeps a tiny 3D tilt", githubStackTilt, [
         at(t + 0, STACK_TILT_DEFAULT_POSE),
         hold(t + dockLocal),
         at(t + githubBeats.fadeOut + 0.15, STACK_TILT_FINAL_POSE, curve.inOut(2)),
      ]);

      // First comment card materializes after the morph
      scene.animate("first GitHub comment card materializes after morph", githubReplyBind, [
         at(t + 0, { opacity: 0, y: 18, scale: 0.985 }),
         hold(t + 0.55),
         at(t + 0.55 + MORPH_REPLY_CARD_DURATION, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
      ]);

      // Second comment slides up after the camera tilts in
      scene.animate("second GitHub comment slides up under camera", githubSecondComment, [
         at(t + 0, { opacity: 0, y: 84, maxHeight: 0 }),
         hold(t + githubBeats.secondComment + 0.5),
         at(t + githubBeats.secondComment + 1.45, { opacity: 1, y: 0, maxHeight: 420 }, curve.backOut(1.15)),
      ]);

      // Type the second comment progressively as the camera follows it
      scene.typewrite("videoReplyText", videoReplyText, {
         text: VIDEO_REPLY,
         from: t + githubBeats.secondComment + 2.55,
         duration: 1.25,
      });
   });

   return (
      <div
         ref={githubSceneBind.ref}
         className="absolute inset-0 grid place-items-center overflow-hidden bg-black px-8 text-motion-foreground"
         style={{ opacity: 0, perspective: "1050px", perspectiveOrigin: "50% 46%" }}
      >
         <div ref={githubStackBind.ref} className="w-[1120px]" style={{ transformStyle: "preserve-3d" }}>
            <div ref={githubStackY.ref} style={{ transformStyle: "preserve-3d" }}>
               <div ref={githubStackPush.ref} style={{ transformStyle: "preserve-3d" }}>
                  <div
                     ref={githubStackTilt.ref}
                     className="rounded-md border border-white/10 p-8 shadow-[0_50px_140px_-50px_rgba(0,0,0,0.9)]"
                     style={{ transformStyle: "preserve-3d" }}
                  >
                     <PRHeader />
                     <div className="pt-12">
                        <div ref={githubReplyBind.ref}>
                           <GHCommentCard textRef={githubTextSlotBind.ref}>
                              <span ref={githubTextSlotPlaceholderBind.ref} style={{ opacity: 0 }}>
                                 {REPLY}
                              </span>
                           </GHCommentCard>
                        </div>
                        <div
                           ref={githubSecondComment.ref}
                           className="mt-5 overflow-hidden"
                           style={{ opacity: 0, maxHeight: 0 }}
                        >
                           <GHCommentCard textRef={videoReplyText.ref} second>
                              <VideoPlaceholder />
                           </GHCommentCard>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

function PRHeader() {
   return (
      <header className="border-b border-white/10 pb-8 text-left">
         <div className="flex items-center gap-3 text-[18px] text-white/55">
            <svg viewBox="0 0 16 16" width={26} height={26} fill="#fafafa" className="shrink-0" aria-hidden="true">
               <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            <span>kishansripada / enrichly</span>
         </div>
         <div className="mt-5 flex items-center gap-4">
            <h1 className="text-[44px] font-medium leading-tight tracking-tight text-motion-foreground">
               drag and drop cell select <span className="font-normal text-white/40">#478</span>
            </h1>
            <span className="inline-flex items-center rounded-full bg-[#238636] px-3 py-1 text-[14px] font-semibold text-white">
               Open
            </span>
         </div>
      </header>
   );
}

function VideoPlaceholder() {
   const root = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = scene.start;
      scene.animate("video preview fades and lifts into the comment", root, [
         at(t + 0, { opacity: 0, y: 18, scale: 0.97 }),
         hold(t + githubBeats.secondComment + 3.75),
         at(t + githubBeats.secondComment + 4.35, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
      ]);
   });

   return (
      <div
         ref={root.ref}
         className="relative mt-5 h-[300px] w-full overflow-hidden border border-white/10 bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
         style={{ opacity: 0 }}
      >
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)]" />
         <div className="absolute top-4 left-5 flex items-center gap-2 text-[12px] font-medium text-white/55">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.75)]" />
            <span>iOS replay · 00:00</span>
         </div>
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-[0_14px_40px_rgba(0,0,0,0.6)] backdrop-blur-sm">
               <svg viewBox="0 0 24 24" width={26} height={26} fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
               </svg>
            </div>
         </div>
         <div className="absolute right-5 bottom-4 left-5">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-white/50">
               <span>Autosana test replay</span>
               <span>00:17</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
               <div className="h-full w-[8%] rounded-full bg-white/65" />
            </div>
         </div>
      </div>
   );
}

type GHCommentCardProps = {
   textRef?: React.Ref<HTMLSpanElement>;
   children?: React.ReactNode;
   second?: boolean;
};

function GHCommentCard({ textRef, children, second = false }: GHCommentCardProps) {
   return (
      <div className="relative w-full overflow-hidden rounded-md border border-white/10 bg-white/2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95),0_4px_18px_rgba(0,0,0,0.6)]">
         <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-7 py-4">
            <div className="flex items-center gap-3 text-[16px]">
               <span className="size-7 shrink-0 bg-white" aria-hidden="true" />
               <span className="font-semibold text-motion-foreground">autosana</span>
               <span className="rounded-full border border-white/15 px-2 py-0.5 text-[12px] font-medium text-white/60">
                  Bot
               </span>
               <span className="text-white/55">{second ? "commented just now" : "commented now"}</span>
            </div>
            <span className="text-[20px] leading-none text-white/55">⋯</span>
         </header>
         <div className="flex min-h-[92px] items-center px-7 py-5 text-[22px] leading-[1.45]">
            <span
               ref={textRef}
               className="inline-block text-[22px] leading-[1.45] text-motion-foreground"
               style={{ fontSize: `${GITHUB_TEXT_SIZE}px`, lineHeight: 1.45 }}
            >
               {second ? null : children}
            </span>
         </div>
         {second ? children : null}
      </div>
   );
}
