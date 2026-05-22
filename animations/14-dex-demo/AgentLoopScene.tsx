import type { CSSProperties } from "react";
import {
   at,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import {
   AGENT_PILLAR_ENTRY_DUR,
   AGENT_PILLAR_FILL_DUR,
   AGENT_PILLAR_FIRST,
   AGENT_PILLAR_STAGGER,
   AGENT_PROMPT_ENTRY,
   AGENT_PROMPT_TEXT,
   AGENT_PROMPT_TYPE_DUR,
   AGENT_PROMPT_TYPE_START,
   AGENT_RETURN_BEAT,
   agentLoopBeats,
} from "./beats";
import { logoUrl } from "./logoDev";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

const ORANGE = "#FF7A1A";
const ORANGE_GLOW = "rgba(255, 122, 26, 0.45)";
const ORANGE_DIM = "rgba(255, 122, 26, 0.85)";
const INK = "rgba(20, 24, 32, 0.92)";
const INK_DIM = "rgba(20, 24, 32, 0.55)";
const INK_FAINT = "rgba(20, 24, 32, 0.35)";

const FONT_STACK =
   '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, "Menlo", "Monaco", "Consolas", monospace';

// Demonstration beat — a clean prompt bar materializes mid-canvas, a query
// types in (typewriter), the user "submits" (orange flash on the run pill),
// then three pillar cards cascade down into a row: FIND · ENRICH · ACTION.
// Each card runs its own ~0.8s fill animation so the viewer sees the
// product actually doing things in parallel — not just a static
// poster of the feature names.

export function AgentLoopScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const prompt = useMotionBinding<HTMLDivElement>();
   const promptTyped = useMotionBinding<HTMLSpanElement>();
   const cursor = useMotionBinding<HTMLSpanElement>();
   const runPill = useMotionBinding<HTMLDivElement>();
   const triptych = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("agent loop scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.16, { opacity: 1 }, curve.out(2)),
         hold(t + agentLoopBeats.holdEnd),
         at(t + agentLoopBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      // Prompt bar rises into view as the scene's anchor — slightly above
      // centre so the three pillar cards have room beneath it without
      // crowding the bottom of the canvas.
      scene.animate("prompt bar lifts into place", prompt, [
         at(t + 0, { opacity: 0, y: 22, scale: 0.97 }),
         hold(t + AGENT_PROMPT_ENTRY),
         at(t + AGENT_PROMPT_ENTRY + 0.42, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.25)),
      ]);

      scene.typewrite("prompt query types in", promptTyped, {
         text: AGENT_PROMPT_TEXT,
         from: t + AGENT_PROMPT_TYPE_START,
         duration: AGENT_PROMPT_TYPE_DUR,
      });

      // Cursor is on throughout typing, hides on submit, returns briefly
      // as the pillars settle.
      scene.animate("typing cursor hides on submit", cursor, [
         at(t + 0, { opacity: 1 }),
         hold(t + AGENT_RETURN_BEAT - 0.04),
         at(t + AGENT_RETURN_BEAT, { opacity: 0 }, curve.jump()),
      ]);

      // Run pill flashes orange on submit then settles back. The flash IS
      // the "agent fires off" beat — every pillar entry references this
      // moment as the pulse origin. inOut(2) on the rebound so the
      // velocity at the press-down keyframe is 0 on both sides (no
      // velocity step into the recovery — see motion-design rule 9).
      scene.animate("run pill pulses on submit", runPill, [
         at(t + 0, { scale: 1, backgroundColor: "rgba(0,0,0,0.08)", color: INK }),
         hold(t + AGENT_RETURN_BEAT - 0.08),
         at(t + AGENT_RETURN_BEAT - 0.02, { scale: 0.92, backgroundColor: ORANGE, color: "#ffffff" }, curve.out(2)),
         at(
            t + AGENT_RETURN_BEAT + 0.28,
            { scale: 1, backgroundColor: "rgba(0,0,0,0.08)", color: INK },
            curve.inOut(2),
         ),
      ]);

      // Triptych container has no transform — it's just a layout slot. The
      // individual pillars own their own scale/opacity tracks, which lets
      // each one stagger in on its own rhythm.
      scene.animate("triptych row opacity envelope", triptych, [at(t + 0, { opacity: 1 })]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center">
         <div className="flex flex-col items-center" style={{ width: 1640, fontFamily: FONT_STACK }}>
            <PromptBar ref={prompt.ref} typedRef={promptTyped.ref} cursorRef={cursor.ref} runPillRef={runPill.ref} />

            <div ref={triptych.ref} className="mt-12 flex w-full justify-between" style={{ gap: 28 }}>
               <PillarCard
                  index={0}
                  sceneStart={sceneStart}
                  kind="find"
                  label="find"
                  caption="200 leads · series-A fintech"
               />
               <PillarCard
                  index={1}
                  sceneStart={sceneStart}
                  kind="enrich"
                  label="enrich"
                  caption="187 emails verified"
               />
               <PillarCard index={2} sceneStart={sceneStart} kind="action" label="action" caption="queued in lemlist" />
            </div>
         </div>
      </div>
   );
}

type PromptBarProps = {
   typedRef: (el: HTMLSpanElement | null) => void;
   cursorRef: (el: HTMLSpanElement | null) => void;
   runPillRef: (el: HTMLDivElement | null) => void;
};

const PromptBar = ({
   ref,
   typedRef,
   cursorRef,
   runPillRef,
}: PromptBarProps & { ref: (el: HTMLDivElement | null) => void }) => (
   <div
      ref={ref}
      className="flex items-center w-full"
      style={{
         background: "rgba(255,255,255,0.92)",
         border: "1px solid rgba(20,24,32,0.10)",
         borderRadius: 18,
         paddingInline: 28,
         paddingBlock: 22,
         boxShadow: ["0 30px 80px -28px rgba(28,40,80,0.22)", "0 12px 30px -16px rgba(0,0,0,0.20)"].join(", "),
         gap: 18,
         backdropFilter: "blur(8px)",
      }}
   >
      <div className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
         <SparkIcon />
      </div>
      <div
         className="flex flex-1 items-baseline overflow-hidden"
         style={{
            fontSize: 30,
            lineHeight: 1.2,
            color: INK,
            letterSpacing: "-0.015em",
            whiteSpace: "nowrap",
         }}
      >
         <span ref={typedRef} />
         <span
            ref={cursorRef}
            className="ml-px inline-block"
            style={{
               width: 3,
               height: 32,
               background: INK,
               transform: "translateY(4px)",
               borderRadius: 1,
            }}
         />
      </div>
      <div
         ref={runPillRef}
         className="flex items-center"
         style={{
            paddingInline: 18,
            paddingBlock: 10,
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "0.01em",
            gap: 10,
            color: INK,
            background: "rgba(0,0,0,0.08)",
         }}
      >
         <span>Run</span>
         <span
            style={{
               display: "inline-flex",
               alignItems: "center",
               justifyContent: "center",
               width: 22,
               height: 22,
               borderRadius: 6,
               background: "rgba(255,255,255,0.45)",
               fontSize: 13,
               fontWeight: 700,
               border: "1px solid rgba(0,0,0,0.10)",
            }}
         >
            ↵
         </span>
      </div>
   </div>
);

function SparkIcon() {
   return (
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
         <defs>
            <linearGradient id="agent-spark" x1="0" y1="0" x2="1" y2="1">
               <stop offset="0%" stopColor="#FFB347" />
               <stop offset="100%" stopColor={ORANGE} />
            </linearGradient>
         </defs>
         <path d="M14 2 L16.6 11.4 L26 14 L16.6 16.6 L14 26 L11.4 16.6 L2 14 L11.4 11.4 Z" fill="url(#agent-spark)" />
      </svg>
   );
}

type PillarKind = "find" | "enrich" | "action";

type PillarCardProps = {
   index: number;
   sceneStart: number;
   kind: PillarKind;
   label: string;
   caption: string;
};

function PillarCard({ index, sceneStart, kind, label, caption }: PillarCardProps) {
   const card = useMotionBinding<HTMLDivElement>();
   const accentBar = useMotionBinding<HTMLDivElement>();
   const captionEl = useMotionBinding<HTMLDivElement>();

   const myStart = AGENT_PILLAR_FIRST + index * AGENT_PILLAR_STAGGER;
   const myLand = myStart + AGENT_PILLAR_ENTRY_DUR;
   const fillEnd = myLand + AGENT_PILLAR_FILL_DUR;

   useMotion((scene) => {
      const t = sceneStart;

      // Card entry — opacity + scale on a single tween (entry, no prior
      // visible state) using backOut so each card "lands" with weight,
      // matching the windows scene's vocabulary.
      scene.animate(`pillar ${kind} card lands`, card, [
         at(t + 0, { opacity: 0, scale: 0.93, y: 28 }),
         hold(t + myStart),
         at(t + myLand, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.35)),
      ]);

      // Orange accent rail at top of card scales horizontally from 0 → 1
      // as the card's fill animation runs. It's the visual "loading" cue
      // that ties to the run-pill pulse.
      scene.animate(`pillar ${kind} accent rail fills`, accentBar, [
         at(t + 0, { scale: 0, opacity: 1 }),
         hold(t + myLand - 0.04),
         at(t + fillEnd, { scale: 1, opacity: 1 }, curve.out(2)),
      ]);

      // Caption ("200 leads · …") fades up only after the fill completes.
      scene.animate(`pillar ${kind} caption settles`, captionEl, [
         at(t + 0, { opacity: 0, y: 8 }),
         hold(t + fillEnd - 0.04),
         at(t + fillEnd + 0.24, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div
         ref={card.ref}
         className="relative flex flex-1 flex-col overflow-hidden"
         style={{
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(20,24,32,0.10)",
            borderRadius: 20,
            height: 320,
            boxShadow: ["0 32px 70px -24px rgba(28,40,80,0.22)", "0 12px 28px -14px rgba(0,0,0,0.20)"].join(", "),
            backdropFilter: "blur(8px)",
         }}
      >
         {/* Orange accent rail (scaleX 0→1 during the card's fill window) —
              transform-origin left so the rail "fills" outward like a
              progress bar that ties to the run-pill pulse. */}
         <div
            style={{
               position: "absolute",
               top: 0,
               left: 0,
               right: 0,
               height: 4,
               background: "rgba(20,24,32,0.06)",
            }}
         />
         <div
            ref={accentBar.ref}
            style={{
               position: "absolute",
               top: 0,
               left: 0,
               right: 0,
               height: 4,
               background: `linear-gradient(90deg, ${ORANGE} 0%, #FFB347 100%)`,
               transformOrigin: "0 50%",
            }}
         />

         <div className="flex items-center justify-between" style={{ paddingInline: 28, paddingTop: 26 }}>
            <div className="flex items-center" style={{ gap: 14 }}>
               <PillarIcon kind={kind} />
               <div
                  className="uppercase"
                  style={{
                     fontSize: 14,
                     letterSpacing: "0.18em",
                     color: INK_DIM,
                     fontWeight: 600,
                  }}
               >
                  {label}
               </div>
            </div>
            <div
               style={{
                  fontSize: 12,
                  fontFamily: MONO_STACK,
                  color: INK_FAINT,
                  letterSpacing: "0.04em",
               }}
            >
               agent · 0{index + 1}
            </div>
         </div>

         <div className="flex flex-1 flex-col" style={{ paddingInline: 28, paddingTop: 18, paddingBottom: 18 }}>
            <PillarBody kind={kind} sceneStart={sceneStart} cardLand={myLand} fillEnd={fillEnd} />
         </div>

         <div
            ref={captionEl.ref}
            className="flex items-center"
            style={{
               paddingInline: 28,
               paddingBottom: 22,
               gap: 10,
               fontSize: 15,
               color: INK_DIM,
               letterSpacing: "0.005em",
            }}
         >
            <Checkmark />
            <span>{caption}</span>
         </div>
      </div>
   );
}

function PillarIcon({ kind }: { kind: PillarKind }) {
   const iconStyle: CSSProperties = {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "rgba(255, 122, 26, 0.12)",
      color: ORANGE_DIM,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
   };

   if (kind === "find") {
      return (
         <span style={iconStyle}>
            <svg
               width="18"
               height="18"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               strokeWidth="2.4"
               strokeLinecap="round"
               strokeLinejoin="round"
            >
               <circle cx="11" cy="11" r="6.8" />
               <path d="m20 20-4.6-4.6" />
            </svg>
         </span>
      );
   }
   if (kind === "enrich") {
      return (
         <span style={iconStyle}>
            <svg
               width="18"
               height="18"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               strokeWidth="2.4"
               strokeLinecap="round"
               strokeLinejoin="round"
            >
               <path d="M4 6h16" />
               <path d="M4 12h16" />
               <path d="M4 18h10" />
               <path d="M18 17l2 2 3-3" />
            </svg>
         </span>
      );
   }
   return (
      <span style={iconStyle}>
         <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
         >
            <path d="m4 11 17-7-7 17-2.5-7.5z" />
         </svg>
      </span>
   );
}

function Checkmark() {
   return (
      <svg
         width="18"
         height="18"
         viewBox="0 0 24 24"
         fill="none"
         stroke={ORANGE_DIM}
         strokeWidth="2.6"
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
      >
         <path d="m5 12.5 5 5 9-11" />
      </svg>
   );
}

type PillarBodyProps = {
   kind: PillarKind;
   sceneStart: number;
   cardLand: number;
   fillEnd: number;
};

function PillarBody({ kind, sceneStart, cardLand, fillEnd }: PillarBodyProps) {
   if (kind === "find") return <FindBody sceneStart={sceneStart} cardLand={cardLand} fillEnd={fillEnd} />;
   if (kind === "enrich") return <EnrichBody sceneStart={sceneStart} cardLand={cardLand} fillEnd={fillEnd} />;
   return <ActionBody sceneStart={sceneStart} cardLand={cardLand} fillEnd={fillEnd} />;
}

// FIND — five real Series-A-era fintech brands dropping into a 2-row stack.
// Each chip has its own bind so the stagger is real (not faked with CSS
// delays — those wouldn't reverse correctly when the timeline scrubs
// backwards). Logos are fetched from logo.dev so the marks are authentic.
const FIND_CHIPS = [
   { id: "mercury", label: "Mercury", domain: "mercury.com" },
   { id: "brex", label: "Brex", domain: "brex.com" },
   { id: "lithic", label: "Lithic", domain: "lithic.com" },
   { id: "rho", label: "Rho", domain: "rho.co" },
   { id: "plaid", label: "Plaid", domain: "plaid.com" },
] as const;

function FindBody({ sceneStart, cardLand, fillEnd }: { sceneStart: number; cardLand: number; fillEnd: number }) {
   const span = fillEnd - cardLand;
   const step = span / FIND_CHIPS.length;
   return (
      <div className="flex flex-wrap" style={{ gap: 10, paddingTop: 6 }}>
         {FIND_CHIPS.map((chip, i) => (
            <FindChip
               key={chip.id}
               sceneStart={sceneStart}
               chipStart={cardLand + 0.1 + i * step}
               domain={chip.domain}
               label={chip.label}
            />
         ))}
      </div>
   );
}

function FindChip({
   sceneStart,
   chipStart,
   domain,
   label,
}: {
   sceneStart: number;
   chipStart: number;
   domain: string;
   label: string;
}) {
   const chip = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`find chip ${label} pops in`, chip, [
         at(t + 0, { opacity: 0, scale: 0.84, y: 10 }),
         hold(t + chipStart),
         at(t + chipStart + 0.36, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.4)),
      ]);
   });

   return (
      <div
         ref={chip.ref}
         className="flex items-center"
         style={{
            gap: 9,
            paddingInline: 12,
            paddingBlock: 8,
            borderRadius: 999,
            background: "rgba(20,24,32,0.04)",
            border: "1px solid rgba(20,24,32,0.06)",
            fontSize: 14,
            color: INK,
         }}
      >
         <span
            style={{
               display: "inline-flex",
               alignItems: "center",
               justifyContent: "center",
               width: 22,
               height: 22,
               borderRadius: 6,
               background: "#ffffff",
               border: "1px solid rgba(20,24,32,0.06)",
               overflow: "hidden",
            }}
         >
            <img
               src={logoUrl(domain, { size: 48, retina: true, format: "png" })}
               alt=""
               width={18}
               height={18}
               style={{ width: 18, height: 18, objectFit: "contain", display: "block" }}
               draggable={false}
            />
         </span>
         <span>{label}</span>
      </div>
   );
}

// ENRICH — four mini-rows with name + email typing in. The typewriter
// is real per-row so the staggered fill reads as parallel agent work.
// Domains match the brands shown in the FIND pillar above so the eye
// reads "these are the same companies, now enriched".
const ENRICH_ROWS = [
   { name: "Maya Patel", email: "maya.patel@mercury.com" },
   { name: "Liam Ortega", email: "l.ortega@brex.com" },
   { name: "Sara Voss", email: "sara@lithic.com" },
   { name: "Ben Achter", email: "ben.a@rho.co" },
] as const;

function EnrichBody({ sceneStart, cardLand, fillEnd }: { sceneStart: number; cardLand: number; fillEnd: number }) {
   const span = fillEnd - cardLand;
   const step = span / (ENRICH_ROWS.length + 0.4);
   return (
      <div className="flex flex-col" style={{ gap: 8, paddingTop: 4 }}>
         {ENRICH_ROWS.map((row, i) => (
            <EnrichRow
               key={row.email}
               sceneStart={sceneStart}
               rowStart={cardLand + 0.08 + i * step}
               typeStart={cardLand + 0.18 + i * step}
               name={row.name}
               email={row.email}
            />
         ))}
      </div>
   );
}

function EnrichRow({
   sceneStart,
   rowStart,
   typeStart,
   name,
   email,
}: {
   sceneStart: number;
   rowStart: number;
   typeStart: number;
   name: string;
   email: string;
}) {
   const row = useMotionBinding<HTMLDivElement>();
   const pulse = useMotionBinding<HTMLDivElement>();
   const typed = useMotionBinding<HTMLSpanElement>();
   const typeDur = 0.42;
   const verifiedAt = typeStart + typeDur + 0.06;

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`enrich row ${email} appears`, row, [
         at(t + 0, { opacity: 0, x: -6 }),
         hold(t + rowStart),
         at(t + rowStart + 0.32, { opacity: 1, x: 0 }, curve.out(2)),
      ]);

      // Cell background pulses orange while "searching", drops to faint
      // once the email lands. Ties the pillar back to the brand vocab.
      scene.animate(`enrich row ${email} pulses while searching`, pulse, [
         at(t + 0, { backgroundColor: "rgba(255,122,26,0.0)" }),
         hold(t + typeStart - 0.04),
         at(t + typeStart, { backgroundColor: "rgba(255,122,26,0.18)" }),
         at(t + verifiedAt, { backgroundColor: "rgba(255,122,26,0.0)" }, curve.inOut(2)),
      ]);

      scene.typewrite(`enrich row ${email} types`, typed, {
         text: email,
         from: t + typeStart,
         duration: typeDur,
      });
   });

   return (
      <div
         ref={row.ref}
         className="relative flex items-center justify-between"
         style={{
            paddingInline: 12,
            paddingBlock: 8,
            borderRadius: 9,
            background: "rgba(20,24,32,0.03)",
            fontSize: 13,
            color: INK,
         }}
      >
         <div
            ref={pulse.ref}
            style={{ position: "absolute", inset: 0, borderRadius: 9, pointerEvents: "none" }}
            aria-hidden="true"
         />
         <span style={{ color: INK_DIM, fontSize: 12, width: 90, position: "relative" }}>{name}</span>
         <span
            ref={typed.ref}
            className="ml-2 flex-1 truncate"
            style={{
               fontFamily: MONO_STACK,
               fontSize: 12.5,
               color: INK,
               letterSpacing: "0.005em",
               position: "relative",
            }}
         />
         <span
            style={{
               marginLeft: 12,
               display: "inline-flex",
               alignItems: "center",
               justifyContent: "center",
               width: 18,
               height: 18,
               borderRadius: "50%",
               background: ORANGE_GLOW,
               color: "#fff",
               fontSize: 11,
               fontWeight: 700,
               position: "relative",
            }}
         >
            ✓
         </span>
      </div>
   );
}

// ACTION — a vertical stack of three steps with progress dots flipping
// from idle → active → done as the card's fill window progresses.
const ACTION_STEPS = [
   { label: "deduped against CRM" },
   { label: "personalized intro generated" },
   { label: "queued in lemlist · seq #4" },
] as const;

function ActionBody({ sceneStart, cardLand, fillEnd }: { sceneStart: number; cardLand: number; fillEnd: number }) {
   const span = fillEnd - cardLand;
   const step = span / ACTION_STEPS.length;
   return (
      <div className="flex flex-col" style={{ gap: 14, paddingTop: 6 }}>
         {ACTION_STEPS.map((s, i) => (
            <ActionStep
               key={s.label}
               sceneStart={sceneStart}
               stepStart={cardLand + 0.08 + i * step}
               stepDone={cardLand + 0.32 + i * step + step * 0.6}
               label={s.label}
               isLast={i === ACTION_STEPS.length - 1}
            />
         ))}
      </div>
   );
}

function ActionStep({
   sceneStart,
   stepStart,
   stepDone,
   label,
   isLast,
}: {
   sceneStart: number;
   stepStart: number;
   stepDone: number;
   label: string;
   isLast: boolean;
}) {
   const row = useMotionBinding<HTMLDivElement>();
   const dotFill = useMotionBinding<HTMLDivElement>();
   const dotInner = useMotionBinding<HTMLDivElement>();
   const labelEl = useMotionBinding<HTMLDivElement>();
   const connector = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`action step ${label} row appears`, row, [
         at(t + 0, { opacity: 0, x: -6 }),
         hold(t + stepStart),
         at(t + stepStart + 0.3, { opacity: 1, x: 0 }, curve.out(2)),
      ]);

      scene.animate(`action step ${label} dot fills`, dotFill, [
         at(t + 0, { scale: 0, backgroundColor: ORANGE }),
         hold(t + stepStart + 0.08),
         at(t + stepDone, { scale: 1, backgroundColor: ORANGE }, curve.out(3)),
      ]);

      scene.animate(`action step ${label} inner dot fades`, dotInner, [
         at(t + 0, { opacity: 0 }),
         hold(t + stepDone - 0.06),
         at(t + stepDone + 0.08, { opacity: 1 }, curve.out(2)),
      ]);

      scene.animate(`action step ${label} label brightens`, labelEl, [
         at(t + 0, { color: INK_FAINT }),
         hold(t + stepStart),
         at(t + stepDone, { color: INK }, curve.inOut(2)),
      ]);

      if (!isLast) {
         scene.animate(`action step ${label} connector fills`, connector, [
            at(t + 0, { scale: 0, opacity: 1 }),
            hold(t + stepStart + 0.12),
            at(t + stepDone + 0.04, { scale: 1, opacity: 1 }, curve.out(2)),
         ]);
      }
   });

   return (
      <div ref={row.ref} className="relative flex items-center" style={{ gap: 14 }}>
         <div style={{ position: "relative", width: 18, height: 18 }}>
            <div
               style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid rgba(20,24,32,0.10)",
               }}
            />
            <div
               ref={dotFill.ref}
               style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: ORANGE,
                  transformOrigin: "50% 50%",
               }}
            />
            <div
               ref={dotInner.ref}
               style={{
                  position: "absolute",
                  top: 5,
                  left: 5,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#fff",
               }}
            />
            {!isLast && (
               <div
                  ref={connector.ref}
                  style={{
                     position: "absolute",
                     top: 18,
                     left: 8,
                     width: 2,
                     height: 22,
                     background: ORANGE,
                     transformOrigin: "0 0",
                  }}
               />
            )}
         </div>
         <div
            ref={labelEl.ref}
            style={{
               fontSize: 14,
               letterSpacing: "0.005em",
            }}
         >
            {label}
         </div>
      </div>
   );
}
