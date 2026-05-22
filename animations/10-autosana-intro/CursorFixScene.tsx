import {
   at,
   hold,
   cn,
   curve,
   useMotionBinding,
   useMotion,
} from "../../src/framework";
import { fixBeats } from "./beats";
import { buttonFlashTo, click } from "./actions";
import {
   FIX_PROMPT,
   FIX_SEC_PER_CHAR,
   Field,
   PHONE_ENTER_SCALE,
   PHONE_ENTER_Y,
   PHONE_H,
   PHONE_W,
   POINTER_BTN,
   POINTER_ENTRY,
   POINTER_INTRO,
   POINTER_RECOIL,
   ScreenHeader,
} from "./shared";
import { AgentComposer, AgentMessage, DashedRail, MessageBubble, MobileFrame, Pointer } from "./ui";

// Cursor's reply after the fix runs through. Local to this scene.

const FIX_REPLY = "Patch applied. Autosana re-ran the checkout flow and it passes now.";

const DIFF_ROWS = [
   { kind: "muted", text: "app/checkout/pay-button.tsx" },
   { kind: "remove", text: "- await createPaymentIntent(cart)" },
   { kind: "add", text: "+ const payment = await createPaymentIntent(cart)" },
   { kind: "add", text: "+ await waitForConfirmation(payment.id)" },
   { kind: "add", text: "+ router.push('/checkout/success')" },
] as const;

export function CursorFixScene() {
   const fixScene = useMotionBinding<HTMLDivElement>();
   const fixSent = useMotionBinding<HTMLDivElement>();
   const fixInput = useMotionBinding<HTMLDivElement>();
   const fixTyped = useMotionBinding<HTMLSpanElement>();
   const fixCursor = useMotionBinding<HTMLSpanElement>();
   const fixSend = useMotionBinding<HTMLSpanElement>();
   const fixReply = useMotionBinding<HTMLDivElement>();
   const fixPhoneStage = useMotionBinding<HTMLDivElement>();
   const fixPhone = useMotionBinding<HTMLDivElement>();
   const fixPointer = useMotionBinding<HTMLDivElement>();
   const fixBtnPay = useMotionBinding<HTMLButtonElement>();
   const successBanner = useMotionBinding<HTMLDivElement>();
   const successPulse = useMotionBinding<HTMLDivElement>();

   const fixTypeDuration = FIX_PROMPT.length * FIX_SEC_PER_CHAR;

   useMotion((scene) => {
      const t = scene.start;

      // Scene container fades in
      scene.animate("fix scene fades in", fixScene, [
         at(t + 0, { opacity: 0 }),
         hold(t + 0.05),
         at(t + fixBeats.typing, { opacity: 1 }, curve.inOut(2)),
      ]);

      scene.typewrite("fixTyped", fixTyped, {
         text: FIX_PROMPT,
         from: t + fixBeats.typing,
         duration: fixTypeDuration,
         clearAt: t + fixBeats.submit + 0.04,
      });

      scene.animate("fix send button presses down and releases", fixSend, [
         at(t + 0, { scale: 1, backgroundColor: "rgba(255, 255, 255, 0.06)", color: "rgba(255, 255, 255, 0.65)" }),
         hold(t + fixBeats.submit),
         at(
            t + fixBeats.submit + 0.09,
            { scale: 0.88, backgroundColor: "rgba(255, 255, 255, 0.95)", color: "rgb(0,0,0)" },
            curve.out(2),
         ),
         at(
            t + fixBeats.submit + 0.38,
            { scale: 1, backgroundColor: "rgba(255, 255, 255, 0.06)", color: "rgba(255, 255, 255, 0.65)" },
            curve.out(2),
         ),
      ]);

      scene.animate("fix composer border flashes then dims for retest", fixInput, [
         at(t + 0, { opacity: 1, borderColor: "rgba(255, 255, 255, 0.22)" }),
         hold(t + fixBeats.submit),
         at(t + fixBeats.submit + 0.14, { opacity: 1, borderColor: "rgba(255, 255, 255, 0.55)" }, curve.out(2)),
         at(t + fixBeats.submit + 0.44, { opacity: 1, borderColor: "rgba(255, 255, 255, 0.22)" }, curve.out(2)),
         hold(t + fixBeats.retest),
         at(t + fixBeats.retest + 0.53, { opacity: 0.08 }, curve.out(2)),
      ]);

      scene.animate("fix typing cursor hides after submit", fixCursor, [
         at(t + 0, { opacity: 1 }),
         hold(t + fixBeats.submit),
         at(t + fixBeats.submit + 0.08, { opacity: 0 }),
      ]);

      scene.animate("fix prompt bubble appears dims during retest and restores", fixSent, [
         at(t + 0, { opacity: 0, y: 16 }),
         hold(t + fixBeats.submit + 0.04),
         at(t + fixBeats.submit + 0.22, { opacity: 1, y: 16 }, curve.out(2)),
         at(t + fixBeats.submit + 0.61, { opacity: 1, y: 0 }, curve.backOut(1.25)),
         hold(t + fixBeats.retest),
         at(t + fixBeats.retest + 0.53, { opacity: 0.28 }, curve.out(2)),
         hold(t + fixBeats.successClick + 1.18),
         at(t + fixBeats.successClick + 1.63, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // Retest phone replay sliding up + pointer choreography
      scene.animate("retest phone stage appears then clears for final reply", fixPhoneStage, [
         at(t + 0, { opacity: 0 }),
         hold(t + fixBeats.retest + 0.1),
         at(t + fixBeats.retest + 0.28, { opacity: 1 }),
         hold(t + fixBeats.successClick + 1.05),
         at(t + fixBeats.successClick + 1.55, { opacity: 0, scale: 0.94 }, curve.inOut(2)),
      ]);

      scene.animate("retest phone replay slides up into view", fixPhone, [
         at(t + 0, { opacity: 0, y: PHONE_ENTER_Y, scale: PHONE_ENTER_SCALE }),
         hold(t + fixBeats.retest + 0.12),
         at(t + fixBeats.retest + 0.77, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.15)),
      ]);

      scene.animate("Autosana pointer clicks the fixed pay button then exits", fixPointer, [
         at(t + 0, { opacity: 0, x: POINTER_ENTRY.x, y: POINTER_ENTRY.y, scale: 1 }),
         hold(t + fixBeats.retest + 0.45),
         at(
            t + fixBeats.retest + 0.9,
            { opacity: 1, x: POINTER_INTRO.x, y: POINTER_INTRO.y, scale: 1 },
            curve.out(2),
         ),
         at(
            t + fixBeats.successClick - 0.08,
            { opacity: 1, x: POINTER_BTN.x, y: POINTER_BTN.y, scale: 1 },
            curve.inOut(2),
         ),
         ...click(t + fixBeats.successClick, { x: POINTER_BTN.x, y: POINTER_BTN.y }),
         at(
            t + fixBeats.successClick + 0.72,
            { opacity: 1, x: POINTER_RECOIL.x, y: POINTER_RECOIL.y, scale: 1 },
            curve.out(2),
         ),
         hold(t + fixBeats.successClick + 1.05),
         at(t + fixBeats.successClick + 1.55, { opacity: 0, scale: 0.94 }, curve.inOut(2)),
      ]);

      // Pay button flashes white, then turns green for success
      scene.animate(
         "pay button flashes and settles on success green",
         fixBtnPay,
         buttonFlashTo(t + fixBeats.successClick, { backgroundColor: "rgb(16,185,129)", color: "rgb(255,255,255)" }),
      );

      scene.animate("payment confirmed banner drops into phone", successBanner, [
         at(t + 0, { opacity: 0, y: -10 }),
         hold(t + fixBeats.successClick + 0.36),
         at(t + fixBeats.successClick + 0.71, { opacity: 1, y: 0 }, curve.backOut(1.35)),
      ]);

      scene.animate("success check pulse blooms over phone", successPulse, [
         at(t + 0, { opacity: 0, scale: 0.72 }),
         hold(t + fixBeats.successClick + 0.52),
         at(t + fixBeats.successClick + 1.04, { opacity: 1, scale: 1 }, curve.backOut(1.2)),
      ]);

      scene.animate("Cursor success reply fades and lifts into place", fixReply, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + fixBeats.successClick + 1.42),
         at(t + fixBeats.successClick + 1.92, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={fixScene.ref} className="absolute inset-0 overflow-hidden bg-black text-motion-foreground">
         <DashedRail side="left" />
         <DashedRail side="right" />
         <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div ref={fixPhoneStage.ref} className="relative" style={{ width: PHONE_W, height: PHONE_H }}>
               <MobileFrame ref={fixPhone.ref} width={PHONE_W} height={PHONE_H}>
                  <div className="relative flex h-full flex-col bg-white text-black">
                     <ScreenHeader title="Payment" />
                     <div className="flex-1 space-y-4 px-4 pt-4">
                        <Field label="Card number" value="4242 4242 4242 4242" />
                        <div className="flex gap-3">
                           <Field label="MM/YY" value="08 / 27" className="flex-1" />
                           <Field label="CVC" value="•••" className="flex-1" />
                        </div>
                        <div
                           ref={successBanner.ref}
                           className="flex items-center gap-2 bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-white"
                           style={{ opacity: 0, transform: "translate3d(0,-10px,0) scale(1)" }}
                        >
                           <span className="flex size-4 items-center justify-center rounded-full bg-white text-[10px] text-emerald-600">
                              ✓
                           </span>
                           <span>Payment confirmed</span>
                        </div>
                     </div>
                     <div className="px-4 pb-5">
                        <button
                           ref={fixBtnPay.ref}
                           className="w-full bg-emerald-500 py-3 text-[13px] font-semibold text-white"
                        >
                           Pay $1,028
                        </button>
                     </div>
                     <div
                        ref={successPulse.ref}
                        className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]"
                        style={{ opacity: 0 }}
                     >
                        <div className="flex size-28 items-center justify-center rounded-full bg-emerald-500 text-[44px] font-semibold text-white shadow-[0_24px_60px_rgba(16,185,129,0.35)]">
                           ✓
                        </div>
                     </div>
                  </div>
               </MobileFrame>
               <Pointer ref={fixPointer.ref} label="Autosana" />
            </div>
         </div>

         <div className="relative z-10 mx-auto flex h-full w-full max-w-[860px] flex-col px-0 pt-16 pb-[72px]">
            <div className="flex-1" />
            <main className="flex flex-col gap-[18px]">
               <MessageBubble ref={fixSent.ref}>{FIX_PROMPT}</MessageBubble>

               <CodeDiffPreview />

               <AgentMessage ref={fixReply.ref} name="Cursor">
                  <span className="inline-block text-base leading-6">{FIX_REPLY}</span>
               </AgentMessage>

               <AgentComposer
                  ref={fixInput.ref}
                  typedRef={fixTyped.ref}
                  cursorRef={fixCursor.ref}
                  sendRef={fixSend.ref}
                  agentLabel="Cursor"
                  modelLabel="Agent"
               />
            </main>
         </div>
      </div>
   );
}

function CodeDiffPreview() {
   const root = useMotionBinding<HTMLDivElement>();
   const row0 = useMotionBinding<HTMLDivElement>();
   const row1 = useMotionBinding<HTMLDivElement>();
   const row2 = useMotionBinding<HTMLDivElement>();
   const row3 = useMotionBinding<HTMLDivElement>();
   const row4 = useMotionBinding<HTMLDivElement>();
   const rows = [row0, row1, row2, row3, row4];

   useMotion((scene) => {
      const t = scene.start;

      scene.animate("code diff card appears dims during retest and restores", root, [
         at(t + 0, { opacity: 0, y: 28, scale: 0.985 }),
         hold(t + fixBeats.patch),
         at(t + fixBeats.patch + 0.85, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
         hold(t + fixBeats.retest),
         at(t + fixBeats.retest + 0.38, { opacity: 0.16, y: -12, scale: 0.99 }, curve.in(2)),
         hold(t + fixBeats.successClick + 1.18),
         at(t + fixBeats.successClick + 1.63, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
      ]);

      // Each diff row staggers in 0.11s after the previous, starting at fixBeats.patch + 0.14.
      rows.forEach((bind, i) => {
         const start = fixBeats.patch + 0.14 + i * 0.11;

         scene.animate(`diff line ${i + 1} fades in with the patch`, bind, [
            at(t + 0, { opacity: 0, y: 8 }),
            hold(t + start),
            at(t + start + 0.36, { opacity: 1, y: 0 }, curve.out(2)),
         ]);
      });
   });

   return (
      <div
         ref={root.ref}
         className="self-start overflow-hidden border border-white/10 bg-white/2 shadow-[0_46px_120px_-40px_rgba(0,0,0,0.95)]"
      >
         <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-3">
            <div className="flex items-center gap-3">
               <span className="size-3 bg-white" />
               <span className="text-[14px] font-semibold text-motion-foreground">Cursor patch</span>
            </div>
            <span className="text-[12px] font-medium text-emerald-300">1 file changed</span>
         </div>
         <div className="grid min-w-[720px] gap-1 px-5 py-4 font-mono text-[14px] leading-6">
            {DIFF_ROWS.map((row, i) => (
               <div
                  key={`${row.kind}-${i}`}
                  ref={rows[i].ref}
                  className={cn(
                     "grid grid-cols-[34px_1fr] gap-3 border-l px-3 py-1 opacity-0",
                     row.kind === "add"
                        ? "border-emerald-400/40 bg-emerald-400/8 text-emerald-200"
                        : row.kind === "remove"
                          ? "border-red-400/40 bg-red-400/8 text-red-200"
                          : "border-white/10 bg-white/3 text-white/50",
                  )}
               >
                  <span className="select-none text-right text-white/30">{i + 1}</span>
                  <span>{row.text}</span>
               </div>
            ))}
         </div>
      </div>
   );
}
