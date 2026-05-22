import { at, hold, curve, useMotion, useMotionBinding, useStartTime, type MotionElementBinding } from "../../src/framework";
import { signalsBeats } from "./beats";
import { CYAN, REPORT, SIGNAL, SIGNAL_DIM, SIGNALS } from "./shared";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Beat 3: AI reads the report, surfaces deviations. Visual shorthand for
// "Signals Detected" (node 2 of the Panoptive Loop). The document on the
// left gets crossed by a horizontal scan line; as the scan reaches each
// page-of-interest, a signal chip flies out to the right. Three chips total
// — exactly the three findings on the panoptive.com demo card.
//
// Per rule 1 (don't replicate UIs), the document is page-shorthand only:
// header strip + dense text "lines" + page indicator. Just enough to read
// "this is a 73-page monitoring report" without us actually rendering it.

const PAGE_W = 470;
const PAGE_H = 600;

export function SignalsScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const tag = useMotionBinding<HTMLDivElement>();
   const headline = useMotionBinding<HTMLHeadingElement>();
   const document = useMotionBinding<HTMLDivElement>();
   const scanline = useMotionBinding<HTMLDivElement>();
   const scanGlow = useMotionBinding<HTMLDivElement>();
   const pageBadge = useMotionBinding<HTMLDivElement>();
   const railTitle = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("signals scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + signalsBeats.hold),
         at(t + signalsBeats.end, { opacity: 0 }, curve.inOut(2)),
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

      scene.animate("document rises into frame", document, [
         at(t + 0, { opacity: 0, y: 40, scale: 0.97 }),
         hold(t + signalsBeats.docIn),
         at(t + signalsBeats.docIn + 0.55, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
      ]);

      // Scan line sweeps top → bottom over scanStart → scanEnd. The glow
      // tracks behind it so the brightest pixel reads as the "head".
      //
      // Split into two tracks (y only, opacity only) so the linear sweep
      // is one uninterrupted segment from y=0 → bottom. An earlier draft
      // had a `power2Out → linear` transition at the top of the document
      // (line decelerated into y=0, then immediately accelerated to full
      // sweep speed) — the inspector flagged that as a 100% velocity step
      // and it read as a visible "kick" when the scanner started moving.
      // Now the y track is hold → linear (a clean hold→motion transition,
      // which the inspector treats as expected) and the opacity track
      // handles the fade-in independently.
      scene.animate("scan line position sweeps linearly", scanline, [
         at(t + 0, { y: 0 }),
         hold(t + signalsBeats.scanStart),
         at(t + signalsBeats.scanEnd, { y: PAGE_H - 6 }, curve.linear()),
      ]);

      scene.animate("scan line opacity fades in then out", scanline, [
         at(t + 0, { opacity: 0 }),
         hold(t + signalsBeats.scanStart),
         at(t + signalsBeats.scanStart + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + signalsBeats.scanEnd),
         at(t + signalsBeats.scanEnd + 0.25, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("scan glow position trails the line", scanGlow, [
         at(t + 0, { y: -28 }),
         hold(t + signalsBeats.scanStart),
         at(t + signalsBeats.scanEnd, { y: PAGE_H - 28 }, curve.linear()),
      ]);

      scene.animate("scan glow opacity fades in then out", scanGlow, [
         at(t + 0, { opacity: 0 }),
         hold(t + signalsBeats.scanStart),
         at(t + signalsBeats.scanStart + 0.18, { opacity: 0.55 }, curve.out(2)),
         hold(t + signalsBeats.scanEnd),
         at(t + signalsBeats.scanEnd + 0.25, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("page badge fades in", pageBadge, [
         at(t + 0, { opacity: 0, y: -8 }),
         hold(t + signalsBeats.scanStart),
         at(t + signalsBeats.scanStart + 0.35, { opacity: 1, y: 0 }, curve.out(2)),
         at(t + signalsBeats.scanEnd + 0.4, { opacity: 0.55, y: 0 }, curve.inOut(2)),
      ]);

      scene.animate("rail title fades in", railTitle, [
         at(t + 0, { opacity: 0, y: 12 }),
         hold(t + signalsBeats.scanStart - 0.1),
         at(t + signalsBeats.scanStart + 0.4, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div
         ref={sceneBind.ref}
         className="absolute inset-0 flex flex-col items-center overflow-hidden bg-black px-10 pt-14"
      >
         <div className="flex w-full max-w-[1320px] flex-col">
            <div
               ref={tag.ref}
               className="flex items-center gap-3 text-[14px] font-medium tracking-[0.18em] text-white/45 uppercase"
            >
               <span className="size-2" style={{ backgroundColor: CYAN }} />
               <span>step 1 — signals detected</span>
            </div>

            <h2
               ref={headline.ref}
               className="mt-4 max-w-[1080px] font-medium tracking-[-0.02em] text-white"
               style={{ fontSize: 56, lineHeight: 1.05 }}
            >
               Reads <span style={{ color: CYAN }}>full reports</span>. Surfaces every deviation.
            </h2>

            {/* Document on the left, signals rail on the right. */}
            <div className="mt-10 grid grid-cols-[470px_1fr] items-start gap-16">
               <div className="relative">
                  <div
                     ref={document.ref}
                     className="relative overflow-hidden bg-white"
                     style={{
                        width: PAGE_W,
                        height: PAGE_H,
                        boxShadow: "0 50px 120px -40px rgba(34,211,238,0.30), 0 20px 60px -20px rgba(0,0,0,0.85)",
                     }}
                  >
                     <DocumentBody />

                     {/* Scan glow trails the line so the leading edge reads
                          as a moving head, not a static stripe. */}
                     <div
                        ref={scanGlow.ref}
                        className="pointer-events-none absolute right-0 left-0"
                        style={{
                           top: 0,
                           height: 80,
                           background: `linear-gradient(180deg, transparent 0%, ${CYAN}20 60%, ${CYAN}55 100%)`,
                        }}
                     />
                     <div
                        ref={scanline.ref}
                        className="pointer-events-none absolute right-0 left-0"
                        style={{
                           top: 0,
                           height: 2,
                           backgroundColor: CYAN,
                           boxShadow: `0 0 22px ${CYAN}, 0 0 6px ${CYAN}`,
                        }}
                     />
                  </div>

                  <div
                     ref={pageBadge.ref}
                     className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-black/85 px-2.5 py-1 text-[11px] font-medium tracking-[0.06em] text-white/80 uppercase"
                  >
                     <span className="size-1.5 rounded-full" style={{ backgroundColor: CYAN }} />
                     <span>scanning</span>
                     <span className="ml-1 font-semibold text-white">{REPORT.pages} pages</span>
                  </div>
               </div>

               <div className="flex flex-col gap-6 pt-1">
                  <div
                     ref={railTitle.ref}
                     className="flex items-center gap-3 text-[14px] font-medium tracking-[0.18em] text-white/55 uppercase"
                  >
                     <span className="size-2" style={{ backgroundColor: SIGNAL }} />
                     <span>deviations extracted</span>
                     <span className="ml-1 text-white/30">→</span>
                  </div>

                  {SIGNALS.map((sig, i) => (
                     <SignalChip key={sig.label} index={i} sceneStart={sceneStart} signal={sig} />
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}

function DocumentBody() {
   // The document is just visual texture: a header strip, a couple of
   // section breaks, and many short text "lines". It exists so the scan
   // line has something to look like it's actually scanning.
   return (
      <div className="flex h-full w-full flex-col gap-[7px] p-7">
         <div className="mb-1 flex items-center justify-between">
            <div className="h-[10px] w-[180px] bg-black/85" />
            <div className="h-[6px] w-[60px] bg-black/30" />
         </div>
         <div className="mb-3 h-[5px] w-[220px] bg-black/30" />
         {DOC_LINES.map((row, i) => {
            if (row.kind === "section") {
               return (
                  <div key={i} className="mt-3 mb-1.5">
                     <div className="h-[7px] w-[160px] bg-black/70" />
                  </div>
               );
            }
            return <div key={i} className="h-[3px] bg-black/45" style={{ width: `${row.w}%` }} />;
         })}
      </div>
   );
}

const DOC_LINES: Array<{ kind: "line"; w: number } | { kind: "section" }> = [
   { kind: "line", w: 92 },
   { kind: "line", w: 88 },
   { kind: "line", w: 70 },
   { kind: "section" },
   { kind: "line", w: 95 },
   { kind: "line", w: 84 },
   { kind: "line", w: 90 },
   { kind: "line", w: 76 },
   { kind: "line", w: 88 },
   { kind: "section" },
   { kind: "line", w: 92 },
   { kind: "line", w: 80 },
   { kind: "line", w: 86 },
   { kind: "line", w: 94 },
   { kind: "line", w: 70 },
   { kind: "line", w: 88 },
   { kind: "section" },
   { kind: "line", w: 90 },
   { kind: "line", w: 84 },
   { kind: "line", w: 78 },
   { kind: "line", w: 92 },
   { kind: "line", w: 86 },
   { kind: "line", w: 82 },
   { kind: "line", w: 90 },
   { kind: "line", w: 75 },
];

type SignalChipProps = {
   index: number;
   sceneStart: number;
   signal: (typeof SIGNALS)[number];
};

function SignalChip({ index, sceneStart, signal }: SignalChipProps) {
   const card = useMotionBinding<HTMLDivElement>();
   const dot = useMotionBinding<HTMLDivElement>();

   const startKey = ["chip0", "chip1", "chip2"][index] as "chip0" | "chip1" | "chip2";
   const start = signalsBeats[startKey];

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate(`signal ${index} flies in from left`, card, [
         at(t + 0, { opacity: 0, x: -60, scale: 0.96 }),
         hold(t + start),
         at(t + start + 0.45, { opacity: 1, x: 0, scale: 1 }, curve.backOut(1.2)),
      ]);

      scene.animate(`signal ${index} dot pulses`, dot, [
         at(t + 0, { opacity: 0, scale: 0 }),
         hold(t + start - 0.02),
         at(t + start + 0.25, { opacity: 1, scale: 1.4 }, curve.out(2)),
         at(t + start + 0.55, { opacity: 1, scale: 1 }, curve.inOut(2)),
      ]);
   });

   return (
      <div
         ref={card.ref}
         className="flex items-start gap-5 border-l-[4px] bg-white/4 px-6 py-6"
         style={{ borderColor: SIGNAL, boxShadow: `0 30px 70px -30px ${SIGNAL_DIM}` }}
      >
         <div
            ref={dot.ref}
            className="mt-2 size-3 rounded-full"
            style={{ backgroundColor: SIGNAL, boxShadow: `0 0 16px ${SIGNAL}` }}
         />
         <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
               <div className="text-[24px] font-medium tracking-[-0.005em] text-white">{signal.label}</div>
               <div className="text-[12px] font-medium tracking-[0.1em] text-white/45 uppercase">{signal.page}</div>
            </div>
            <div className="mt-2 text-[16px] tracking-[0.005em] text-white/55">{signal.detail}</div>
         </div>
      </div>
   );
}
