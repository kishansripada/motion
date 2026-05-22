import type { ReactNode } from "react";
import {
   at,
   curve,
   hold,
   Portal,
   useAnchoredPosition,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import {
   SLACK_APPROVAL_DUR,
   SLACK_APPROVE_PRESS,
   SLACK_APPROVE_RELEASE,
   SLACK_BOT_ACK_DUR,
   SLACK_BOT_ACK_LAND,
   SLACK_CHROME_DUR,
   SLACK_CHROME_ENTRY,
   SLACK_PROMPT_LAND,
   SLACK_PROMPT_TEXT,
   SLACK_PROMPT_TYPE_DUR,
   SLACK_PROMPT_TYPE_START,
   SLACK_RESULT_DUR,
   SLACK_RESULT_LAND,
   slackBeats,
} from "./beats";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

const SLACK_AUBERGINE = "#3F0E40";
const SLACK_GREEN = "#007A5A";
const SLACK_GRAY_LINE = "rgba(29,28,29,0.10)";
const SLACK_TEXT = "#1D1C1D";
const SLACK_MUTED = "rgba(29,28,29,0.55)";
const SLACK_FAINT = "rgba(29,28,29,0.38)";
const ORANGE = "#FF7A1A";
const ORANGE_DEEP = "#E0570A";

const FONT_STACK =
   '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const POINTER_HOTSPOT = { x: 2, y: 2 } as const;

// Slack "@Orange Slice" beat. The full delight of the product story is that
// it works inside the surfaces sellers already live in — Slack is the
// flagship one. We compose a focused chat-area view (no left sidebar, no
// global chrome — see motion-design rule 1: simulate, don't replicate).
//
// Choreography:
//   chromeLand    → channel header + composer arrive together
//   promptLand    → user @-mention finishes typing and lifts into history
//   botAckLand    → Orange Slice replies with an acknowledgement
//   approvalLand  → human-in-the-loop card slides up
//   approvePress  → cursor lands on Approve, button presses down
//   resultLand    → final delivery message lands

export function SlackScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const chrome = useMotionBinding<HTMLDivElement>();
   const channelHeader = useMotionBinding<HTMLDivElement>();
   const composer = useMotionBinding<HTMLDivElement>();
   const composerTyped = useMotionBinding<HTMLSpanElement>();
   const composerCursor = useMotionBinding<HTMLSpanElement>();
   const userMessage = useMotionBinding<HTMLDivElement>();
   const botAck = useMotionBinding<HTMLDivElement>();
   const approvalCard = useMotionBinding<HTMLDivElement>();
   const approveBtn = useMotionBinding<HTMLDivElement>();
   const pointer = useMotionBinding<HTMLDivElement>();
   const resultMessage = useMotionBinding<HTMLDivElement>();

   const approvePointer = useAnchoredPosition({
      target: approveBtn,
      anchor: "center",
      hotspot: POINTER_HOTSPOT,
   });

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("slack scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + slackBeats.holdEnd),
         at(t + slackBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      // The whole chat card lifts up from below — entry has a tiny scale-up
      // so it lands with weight (backOut), not a flat slide.
      scene.animate("slack chrome lifts in", chrome, [
         at(t + 0, { opacity: 0, y: 36, scale: 0.97 }),
         at(t + SLACK_CHROME_ENTRY + SLACK_CHROME_DUR, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.2)),
      ]);

      // The channel header band fades up just after the body so the eye
      // reads "card lands" → "channel name materialises" — two micro-beats
      // instead of one combined motion.
      scene.animate("channel header line lifts", channelHeader, [
         at(t + 0, { opacity: 0, y: 6 }),
         hold(t + SLACK_CHROME_ENTRY + 0.12),
         at(t + SLACK_CHROME_ENTRY + SLACK_CHROME_DUR + 0.08, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // Composer is on screen from chrome-land; opacity 0 → 1 during the
      // chrome entry tail. Cursor blinks via CSS once mounted.
      scene.animate("composer fades in", composer, [
         at(t + 0, { opacity: 0 }),
         hold(t + SLACK_CHROME_ENTRY + 0.16),
         at(t + SLACK_CHROME_ENTRY + SLACK_CHROME_DUR + 0.12, { opacity: 1 }, curve.out(2)),
      ]);

      scene.typewrite("composer prompt types in", composerTyped, {
         text: SLACK_PROMPT_TEXT,
         from: t + SLACK_PROMPT_TYPE_START,
         duration: SLACK_PROMPT_TYPE_DUR,
         clearAt: t + SLACK_PROMPT_LAND + 0.04,
      });

      // Cursor hides when the prompt is "sent" (lifts into history bubble)
      // and never comes back — bot owns the conversation afterwards.
      scene.animate("composer cursor hides on send", composerCursor, [
         at(t + 0, { opacity: 1 }),
         hold(t + SLACK_PROMPT_LAND - 0.04),
         at(t + SLACK_PROMPT_LAND, { opacity: 0 }, curve.jump()),
      ]);

      scene.animate("user @ mention message lifts in", userMessage, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + SLACK_PROMPT_LAND),
         at(t + SLACK_PROMPT_LAND + 0.36, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("orange slice bot ack lifts in", botAck, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + SLACK_BOT_ACK_LAND - SLACK_BOT_ACK_DUR),
         at(t + SLACK_BOT_ACK_LAND, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("approval card slides up", approvalCard, [
         at(t + 0, { opacity: 0, y: 22, scale: 0.985 }),
         hold(t + slackBeats.approvalLand - SLACK_APPROVAL_DUR),
         at(t + slackBeats.approvalLand, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.2)),
      ]);

      // Pointer enters from below the card, glides up to the Approve
      // button, then exits as the result lands. The path is a single
      // straight line on each leg (so it reads as deliberate, not floaty).
      const pointerEnterStart = slackBeats.approvalLand + 0.04;

      scene.animate("pointer travels to approve", pointer, [
         at(t + 0, () => ({ ...approvePointer({ x: 280, y: 240 }), opacity: 0 })),
         hold(t + pointerEnterStart),
         at(t + pointerEnterStart + 0.18, () => ({ ...approvePointer({ x: 260, y: 220 }), opacity: 1 }), curve.out(2)),
         at(t + SLACK_APPROVE_PRESS, () => ({ ...approvePointer(), opacity: 1 }), curve.inOut(2)),
         hold(t + SLACK_APPROVE_RELEASE + 0.16),
         at(
            t + SLACK_APPROVE_RELEASE + 0.36,
            () => ({ ...approvePointer({ x: -60, y: -120 }), opacity: 0 }),
            curve.in(2),
         ),
      ]);

      // Approve button: idle green → press-down (slightly darker, scaled
      // 0.94) → release back to idle. The press-down is the click event.
      scene.animate("approve button presses down then releases", approveBtn, [
         at(t + 0, { scale: 1, backgroundColor: SLACK_GREEN }),
         hold(t + SLACK_APPROVE_PRESS - 0.06),
         at(t + SLACK_APPROVE_PRESS, { scale: 0.94, backgroundColor: "#005C44" }, curve.out(2)),
         at(t + SLACK_APPROVE_RELEASE, { scale: 1, backgroundColor: SLACK_GREEN }, curve.inOut(2)),
      ]);

      scene.animate("orange slice bot result lifts in", resultMessage, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + SLACK_RESULT_LAND - SLACK_RESULT_DUR),
         at(t + SLACK_RESULT_LAND, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center">
         <div
            ref={chrome.ref}
            className="flex flex-col overflow-hidden"
            style={{
               width: 1440,
               background: "#ffffff",
               borderRadius: 18,
               border: "1px solid rgba(0,0,0,0.08)",
               boxShadow: ["0 60px 140px -30px rgba(28,40,80,0.34)", "0 30px 70px -22px rgba(0,0,0,0.32)"].join(", "),
               fontFamily: FONT_STACK,
            }}
         >
            <ChannelHeader bind={channelHeader} />

            <div
               className="flex flex-col"
               style={{
                  paddingInline: 44,
                  paddingTop: 24,
                  paddingBottom: 18,
                  gap: 22,
                  minHeight: 660,
                  background: "#ffffff",
               }}
            >
               <UserMessage bind={userMessage} />
               <BotMessage bind={botAck}>
                  <span>Found 20 Series A fintech companies in NYC. Enriching CEO contacts now…</span>
               </BotMessage>
               <ApprovalCard bind={approvalCard} approveRef={approveBtn.ref} />
               <BotMessage bind={resultMessage}>
                  <span>
                     Done — found verified emails for <b style={{ color: SLACK_TEXT }}>18/20 CEOs</b>. Results are in
                     your spreadsheet ↗
                  </span>
               </BotMessage>
            </div>

            <Composer bind={composer} typedRef={composerTyped.ref} cursorRef={composerCursor.ref} />
         </div>
         <Portal>
            <div
               ref={pointer.ref}
               className="absolute top-0 left-0 will-change-transform"
               style={{ opacity: 0 }}
               aria-hidden="true"
            >
               <PointerArrow />
            </div>
         </Portal>
      </div>
   );
}

function ChannelHeader({ bind }: { bind: MotionElementBinding<HTMLDivElement> }) {
   return (
      <div
         ref={bind.ref}
         className="flex items-center"
         style={{
            paddingInline: 40,
            paddingBlock: 18,
            borderBottom: `1px solid ${SLACK_GRAY_LINE}`,
            gap: 16,
            background: "#ffffff",
         }}
      >
         <span
            style={{
               fontSize: 26,
               color: SLACK_TEXT,
               fontWeight: 700,
               letterSpacing: "-0.005em",
            }}
         >
            <span style={{ color: SLACK_FAINT, marginRight: 2 }}>#</span>sales-team
         </span>
         <span
            style={{
               display: "inline-flex",
               alignItems: "center",
               gap: 7,
               fontSize: 15,
               color: SLACK_MUTED,
               marginLeft: 12,
               paddingLeft: 14,
               borderLeft: `1px solid ${SLACK_GRAY_LINE}`,
            }}
         >
            <span
               style={{
                  display: "inline-block",
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: SLACK_GREEN,
               }}
            />
            34 members
         </span>
         <div className="ml-auto flex items-center" style={{ gap: 16, color: SLACK_MUTED, fontSize: 16 }}>
            <span>📌 2</span>
            <span>🔔</span>
            <span>⋯</span>
         </div>
      </div>
   );
}

function UserMessage({ bind }: { bind: MotionElementBinding<HTMLDivElement> }) {
   return (
      <div ref={bind.ref} className="flex" style={{ gap: 16 }}>
         <UserAvatar />
         <div className="flex flex-1 flex-col" style={{ gap: 6 }}>
            <div className="flex items-baseline" style={{ gap: 12 }}>
               <span style={{ fontSize: 19, fontWeight: 700, color: SLACK_TEXT }}>Alex</span>
               <span style={{ fontSize: 13, color: SLACK_FAINT }}>2:14 PM</span>
            </div>
            <div style={{ fontSize: 19, color: SLACK_TEXT, lineHeight: 1.5 }}>
               <span
                  style={{
                     display: "inline-block",
                     paddingInline: 8,
                     paddingBlock: 2,
                     borderRadius: 5,
                     background: "rgba(255, 122, 26, 0.14)",
                     color: ORANGE_DEEP,
                     fontWeight: 600,
                     marginRight: 6,
                  }}
               >
                  @Orange Slice
               </span>
               find 20 series A fintech companies in NYC and get me the CEO&rsquo;s email
            </div>
         </div>
      </div>
   );
}

function BotMessage({ bind, children }: { bind: MotionElementBinding<HTMLDivElement>; children: ReactNode }) {
   return (
      <div ref={bind.ref} className="flex" style={{ gap: 16 }}>
         <BotAvatar />
         <div className="flex flex-1 flex-col" style={{ gap: 6 }}>
            <div className="flex items-baseline" style={{ gap: 12 }}>
               <span style={{ fontSize: 19, fontWeight: 700, color: SLACK_TEXT }}>Orange Slice</span>
               <span
                  style={{
                     fontSize: 10,
                     fontWeight: 700,
                     paddingInline: 6,
                     paddingBlock: 1.5,
                     borderRadius: 3,
                     background: "rgba(29,28,29,0.10)",
                     color: SLACK_MUTED,
                     letterSpacing: "0.06em",
                  }}
               >
                  APP
               </span>
               <span style={{ fontSize: 13, color: SLACK_FAINT }}>2:14 PM</span>
            </div>
            <div style={{ fontSize: 19, color: SLACK_TEXT, lineHeight: 1.5 }}>{children}</div>
         </div>
      </div>
   );
}

type ApprovalProps = {
   bind: MotionElementBinding<HTMLDivElement>;
   approveRef: (el: HTMLDivElement | null) => void;
};

function ApprovalCard({ bind, approveRef }: ApprovalProps) {
   return (
      <div ref={bind.ref} className="flex" style={{ gap: 16 }}>
         <BotAvatar muted />
         <div
            className="relative flex-1 overflow-visible"
            style={{
               borderRadius: 12,
               border: `1px solid ${SLACK_GRAY_LINE}`,
               borderLeft: `5px solid ${ORANGE}`,
               background: "rgba(255,255,255,0.86)",
               paddingInline: 26,
               paddingBlock: 20,
            }}
         >
            <div className="flex items-baseline" style={{ gap: 10 }}>
               <span style={{ fontSize: 17, fontWeight: 700, color: SLACK_TEXT }}>Approval needed</span>
               <span style={{ fontSize: 14, color: SLACK_FAINT }}>· enrich CEO contact info</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 17, color: SLACK_MUTED, lineHeight: 1.5 }}>
               This will use <b style={{ color: SLACK_TEXT }}>~20 credits</b> to look up verified emails for 20 contacts
               via waterfall enrichment.
            </div>
            <div className="flex items-center" style={{ gap: 12, marginTop: 18 }}>
               <div
                  ref={approveRef}
                  style={{
                     paddingInline: 22,
                     paddingBlock: 11,
                     borderRadius: 7,
                     background: SLACK_GREEN,
                     color: "#fff",
                     fontSize: 16,
                     fontWeight: 700,
                     letterSpacing: "0.01em",
                  }}
               >
                  Approve
               </div>
               <div
                  style={{
                     paddingInline: 20,
                     paddingBlock: 11,
                     borderRadius: 7,
                     background: "transparent",
                     color: SLACK_TEXT,
                     fontSize: 16,
                     fontWeight: 600,
                     border: `1px solid ${SLACK_GRAY_LINE}`,
                  }}
               >
                  Reject
               </div>
               <span style={{ marginLeft: 10, fontSize: 13.5, color: SLACK_FAINT }}>
                  or @Orange Slice always-approve
               </span>
            </div>
         </div>
      </div>
   );
}

function Composer({
   bind,
   typedRef,
   cursorRef,
}: {
   bind: MotionElementBinding<HTMLDivElement>;
   typedRef: (el: HTMLSpanElement | null) => void;
   cursorRef: (el: HTMLSpanElement | null) => void;
}) {
   return (
      <div
         style={{
            paddingInline: 32,
            paddingTop: 10,
            paddingBottom: 28,
            background: "#ffffff",
            borderTop: `1px solid ${SLACK_GRAY_LINE}`,
         }}
      >
         <div
            ref={bind.ref}
            className="flex flex-col"
            style={{
               border: `1px solid ${SLACK_GRAY_LINE}`,
               borderRadius: 12,
               background: "#ffffff",
               paddingTop: 14,
               paddingBottom: 10,
            }}
         >
            <div
               className="flex items-center"
               style={{
                  paddingInline: 20,
                  fontSize: 19,
                  color: SLACK_TEXT,
                  minHeight: 34,
                  lineHeight: 1.45,
               }}
            >
               <span ref={typedRef} />
               <span
                  ref={cursorRef}
                  className="ml-px inline-block"
                  style={{
                     width: 2,
                     height: 26,
                     background: SLACK_TEXT,
                     borderRadius: 1,
                     transform: "translateY(2px)",
                  }}
               />
            </div>
            <div
               className="flex items-center"
               style={{
                  paddingInline: 16,
                  paddingTop: 10,
                  gap: 14,
                  fontSize: 14,
                  color: SLACK_FAINT,
               }}
            >
               <span>B</span>
               <span>I</span>
               <span>S</span>
               <span>·</span>
               <span>@</span>
               <span>:smile:</span>
               <span>📎</span>
               <span className="ml-auto flex items-center" style={{ gap: 12 }}>
                  <span>Aa</span>
                  <span
                     style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        background: SLACK_GREEN,
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                     }}
                  >
                     ↵
                  </span>
               </span>
            </div>
         </div>
      </div>
   );
}

function UserAvatar() {
   return (
      <span
         style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "#1F2937",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0.04em",
            flexShrink: 0,
         }}
      >
         AM
      </span>
   );
}

function BotAvatar({ muted = false }: { muted?: boolean }) {
   return (
      <span
         style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 10,
            background: muted ? "rgba(255,122,26,0.12)" : "rgba(255,122,26,0.18)",
            flexShrink: 0,
         }}
      >
         <BotMark />
      </span>
   );
}

function BotMark() {
   return (
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
         <defs>
            <radialGradient id="slack-orange-mark" cx="0.5" cy="0.5" r="0.6">
               <stop offset="0%" stopColor="#FFC07A" />
               <stop offset="60%" stopColor={ORANGE} />
               <stop offset="100%" stopColor={ORANGE_DEEP} />
            </radialGradient>
         </defs>
         <circle cx="12" cy="12" r="10" fill="url(#slack-orange-mark)" />
         <circle cx="12" cy="12" r="7" fill="#FFE9C2" />
         {[-90, -45, 0, 45, 90].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const x2 = 12 + Math.cos(rad) * 6;
            const y2 = 12 + Math.sin(rad) * 6;
            return (
               <line key={i} x1="12" y1="12" x2={x2} y2={y2} stroke="#FFB347" strokeWidth="1.2" strokeLinecap="round" />
            );
         })}
         <circle cx="12" cy="12" r="1.2" fill="#FFB347" />
      </svg>
   );
}

function PointerArrow() {
   return (
      <svg
         width="26"
         height="32"
         viewBox="0 0 26 32"
         aria-hidden="true"
         style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.20))" }}
      >
         <path
            d="M2 2 L22 16 L13 17.5 L18 28 L13 30 L8 19.5 L2 22 Z"
            fill="#1F2937"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinejoin="round"
         />
      </svg>
   );
}
