import { at, hold, curve, useMotion, useMotionBinding, useStartTime, type MotionElementBinding } from "../../src/framework";
import { decisionBeats } from "./beats";
import { AUDIT, AUDIT_DIM, CYAN, DECISION } from "./shared";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Beat 4: the money shot. Panoptive's pitch is "auto-drafted, inspection-
// ready rationale with citations in 47s". This beat puts that decision
// record on screen, fills it field-by-field, and counts a timer 0 → 47s
// in the corner so the speed claim is *visible*, not narrated.
//
// Per rule 1 (don't replicate UIs): this isn't the literal Panoptive app.
// It's a "Decision Record" card — a fields-on-paper layout that any
// regulatory writer would recognise. The chrome that earns its space:
// the field labels (so the reader knows what they're looking at), the
// rationale itself (the headline asset), the citation chips (the proof
// they're regulator-grade), and the timer (the speed claim).

export function DecisionScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const tag = useMotionBinding<HTMLDivElement>();
   const headline = useMotionBinding<HTMLHeadingElement>();
   const card = useMotionBinding<HTMLDivElement>();
   const cardHeader = useMotionBinding<HTMLDivElement>();
   const classification = useMotionBinding<HTMLDivElement>();
   const classifyChip = useMotionBinding<HTMLDivElement>();
   const rationaleLabel = useMotionBinding<HTMLDivElement>();
   const rationaleText = useMotionBinding<HTMLSpanElement>();
   const rationaleCursor = useMotionBinding<HTMLSpanElement>();
   const citationsLabel = useMotionBinding<HTMLDivElement>();
   const action = useMotionBinding<HTMLDivElement>();
   const auditStamp = useMotionBinding<HTMLDivElement>();

   const timerDigits = useMotionBinding<HTMLSpanElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("decision scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + decisionBeats.hold),
         at(t + decisionBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("section tag fades in", tag, [
         at(t + 0, { opacity: 0, y: 12 }),
         hold(t + 0.25),
         at(t + 0.85, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("headline lifts in", headline, [
         at(t + 0, { opacity: 0, y: 24 }),
         hold(t + 0.45),
         at(t + 1.05, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("decision card rises", card, [
         at(t + 0, { opacity: 0, y: 50, scale: 0.985 }),
         hold(t + decisionBeats.cardIn),
         at(t + decisionBeats.cardIn + 0.55, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
      ]);

      scene.animate("card header bar lights up", cardHeader, [
         at(t + 0, { opacity: 0 }),
         hold(t + decisionBeats.cardIn + 0.3),
         at(t + decisionBeats.cardIn + 0.6, { opacity: 1 }, curve.out(2)),
      ]);

      scene.animate("classification row appears", classification, [
         at(t + 0, { opacity: 0, y: 12 }),
         hold(t + decisionBeats.classifyIn - 0.05),
         at(t + decisionBeats.classifyIn + 0.45, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("classification chip pops", classifyChip, [
         at(t + 0, { opacity: 0, scale: 0.6 }),
         hold(t + decisionBeats.classifyIn + 0.2),
         at(t + decisionBeats.classifyIn + 0.6, { opacity: 1, scale: 1 }, curve.backOut(1.5)),
      ]);

      scene.animate("rationale label appears", rationaleLabel, [
         at(t + 0, { opacity: 0, y: 10 }),
         hold(t + decisionBeats.rationaleStart - 0.15),
         at(t + decisionBeats.rationaleStart + 0.25, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // The rationale typewrites — that IS the magic. We watch a regulator-
      // ready paragraph appear in real time.
      scene.typewrite("rationale typewriter", rationaleText, {
         text: DECISION.rationale,
         from: t + decisionBeats.rationaleStart,
         to: t + decisionBeats.rationaleEnd,
      });

      scene.animate("rationale cursor blinks while writing then hides", rationaleCursor, [
         at(t + 0, { opacity: 0 }),
         hold(t + decisionBeats.rationaleStart - 0.05),
         at(t + decisionBeats.rationaleStart + 0.05, { opacity: 1 }, curve.jump()),
         hold(t + decisionBeats.rationaleEnd + 0.05),
         at(t + decisionBeats.rationaleEnd + 0.25, { opacity: 0 }, curve.jump()),
      ]);

      scene.animate("citations label appears", citationsLabel, [
         at(t + 0, { opacity: 0, y: 10 }),
         hold(t + decisionBeats.cite0 - 0.25),
         at(t + decisionBeats.cite0 + 0.05, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("action row appears", action, [
         at(t + 0, { opacity: 0, y: 12 }),
         hold(t + decisionBeats.actionIn - 0.05),
         at(t + decisionBeats.actionIn + 0.5, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // The audit-ready stamp drops in last — the visual seal that this
      // decision record is the real product output, not a draft.
      scene.animate("audit-ready stamp lands", auditStamp, [
         at(t + 0, { opacity: 0, scale: 0.4, rotationZ: -18 }),
         hold(t + decisionBeats.actionIn + 0.4),
         at(t + decisionBeats.actionIn + 0.85, { opacity: 1, scale: 1, rotationZ: -8 }, curve.backOut(1.6)),
      ]);

      // Timer: 0 → 47s ticking up alongside the rationale. Stops at 47 when
      // the action row lands — the visual punchline.
      scene.text("decision timer ticks", timerDigits, ({ absolute }) => {
         const local = absolute - t;
         if (local <= decisionBeats.timerStart) return "0.0s";
         if (local >= decisionBeats.timerStop) return `${DECISION.generatedIn}.0s`;
         const p = (local - decisionBeats.timerStart) / (decisionBeats.timerStop - decisionBeats.timerStart);
         const v = p * DECISION.generatedIn;
         return `${v.toFixed(1)}s`;
      });
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center overflow-hidden bg-black px-10">
         <div className="flex w-full max-w-[1320px] flex-col">
            <div
               ref={tag.ref}
               className="flex items-center gap-3 text-[14px] font-medium tracking-[0.18em] text-white/45 uppercase"
            >
               <span className="size-2" style={{ backgroundColor: CYAN }} />
               <span>step 2 — decision drafted</span>
            </div>

            <h2
               ref={headline.ref}
               className="mt-4 max-w-[1100px] font-medium tracking-[-0.02em] text-white"
               style={{ fontSize: 50, lineHeight: 1.08 }}
            >
               Inspection-ready rationale, <span style={{ color: CYAN }}>auto-drafted in 47s.</span>
            </h2>

            {/* Card wrapper has overflow-visible so the audit-ready stamp can
                 cantilever off the bottom-right corner without being clipped. */}
            <div
               ref={card.ref}
               className="relative mt-7 w-full border border-white/10 bg-white/3"
               style={{
                  boxShadow: "0 60px 140px -40px rgba(34,211,238,0.30), 0 30px 90px -40px rgba(0,0,0,0.9)",
               }}
            >
               {/* Card header strip — minimal chrome that announces "this
                    is a Decision Record". The cyan tick on the left is
                    the only color in the header. */}
               <div
                  ref={cardHeader.ref}
                  className="flex items-center justify-between border-b border-white/10 bg-white/4 px-7 py-3.5"
               >
                  <div className="flex items-center gap-3">
                     <span className="size-2" style={{ backgroundColor: CYAN }} />
                     <span className="text-[12px] font-medium tracking-[0.18em] text-white/60 uppercase">
                        Decision Record · DEV-2042-08
                     </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium tracking-[0.06em] text-white/70 uppercase">
                     <svg
                        viewBox="0 0 24 24"
                        width="11"
                        height="11"
                        stroke={CYAN}
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                     >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                     </svg>
                     <span style={{ color: CYAN }}>generated in</span>
                     <span ref={timerDigits.ref} className="font-semibold text-white tabular-nums" />
                  </div>
               </div>

               <div className="flex flex-col gap-7 px-7 py-7">
                  <Row>
                     <FieldLabel>Classification</FieldLabel>
                     <div ref={classification.ref}>
                        <div
                           ref={classifyChip.ref}
                           className="inline-flex items-center gap-2 border-l-[3px] bg-black/40 px-3.5 py-1.5 text-[18px] font-medium text-white"
                           style={{ borderColor: CYAN }}
                        >
                           {DECISION.classification}
                        </div>
                     </div>
                  </Row>

                  <Row>
                     <div ref={rationaleLabel.ref}>
                        <FieldLabel>Rationale</FieldLabel>
                     </div>
                     <div className="text-[22px] leading-[1.45] tracking-[-0.005em] text-white/95">
                        <span ref={rationaleText.ref} />
                        <span
                           ref={rationaleCursor.ref}
                           className="ml-px inline-block h-[1.05em] w-[2px] translate-y-1 bg-white align-text-bottom"
                        />
                     </div>
                  </Row>

                  <Row>
                     <div ref={citationsLabel.ref}>
                        <FieldLabel>Citations</FieldLabel>
                     </div>
                     <div className="flex flex-wrap items-center gap-3">
                        {DECISION.citations.map((c, i) => (
                           <CitationChip key={c} index={i} sceneStart={sceneStart} label={c} />
                        ))}
                     </div>
                  </Row>

                  <div ref={action.ref}>
                     <Row>
                        <FieldLabel>Action</FieldLabel>
                        <div className="text-[18px] tracking-[-0.005em] text-white/80">{DECISION.action}</div>
                     </Row>
                  </div>
               </div>

               {/* Audit-ready stamp. Sits in the bottom-right corner with a
                    slight tilt so it reads as a "stamped on top" seal — the
                    seal you put on a record when it's ready to ship. */}
               <div
                  ref={auditStamp.ref}
                  className="absolute right-8 -bottom-[18px] flex items-center gap-2.5 border-2 px-5 py-2.5 text-[14px] font-bold tracking-[0.18em] uppercase"
                  style={{
                     color: AUDIT,
                     borderColor: AUDIT,
                     backgroundColor: "rgba(0,0,0,0.85)",
                     boxShadow: `0 30px 60px -20px ${AUDIT_DIM}`,
                  }}
               >
                  <svg
                     viewBox="0 0 24 24"
                     width="14"
                     height="14"
                     stroke={AUDIT}
                     strokeWidth="3"
                     fill="none"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     aria-hidden="true"
                  >
                     <path d="M20 6 9 17l-5-5" />
                  </svg>
                  audit-ready
               </div>
            </div>
         </div>
      </div>
   );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
   return <div className="pt-1 text-[12px] font-medium tracking-[0.18em] text-white/40 uppercase">{children}</div>;
}

// Two-column row: 200px label + content. Replaces the previous CSS grid so
// that wrapping a row in a single ref-bearing div for fade-in animations
// actually works (display:contents doesn't propagate opacity).
function Row({ children }: { children: React.ReactNode }) {
   return <div className="grid grid-cols-[200px_1fr] gap-x-10 items-start">{children}</div>;
}

function CitationChip({ index, sceneStart, label }: { index: number; sceneStart: number; label: string }) {
   const chip = useMotionBinding<HTMLDivElement>();
   const startKey = ["cite0", "cite1", "cite2"][index] as "cite0" | "cite1" | "cite2";
   const start = decisionBeats[startKey];

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`citation ${index} pops in`, chip, [
         at(t + 0, { opacity: 0, scale: 0.6, y: 8 }),
         hold(t + start),
         at(t + start + 0.4, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.4)),
      ]);
   });

   return (
      <div
         ref={chip.ref}
         className="inline-flex items-center gap-2 border border-white/15 bg-black/40 px-3 py-1.5 text-[14px] tracking-[-0.005em] text-white/85"
         style={{ borderRadius: 999 }}
      >
         <svg
            viewBox="0 0 24 24"
            width="11"
            height="11"
            stroke={CYAN}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
         >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
         </svg>
         <span className="font-medium">{label}</span>
      </div>
   );
}
