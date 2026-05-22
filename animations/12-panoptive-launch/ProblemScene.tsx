import {
   at,
   hold,
   curve,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import { problemBeats } from "./beats";
import { CYAN, REPORT, SIGNAL } from "./shared";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Cold open. The audience (clinical ops / quality leads at pharma sponsors)
// has to read the pain in the first three seconds: monitoring reports are
// huge, and someone has to write rationale by hand. We dramatise that with
// a tower of pages stacking fast, then punch the "2-4 hrs" stat over the
// top so a viewer scrolling past LinkedIn at speed still gets the message.

// Not 73 — visually 18 stacked pages already reads as "intimidatingly tall"
// without us paying the layout cost of 73 actual sheets. The trick is the
// per-page Y offset: at 13px each, 18 pages produce a 220px-tall pile
// signature that dominates the left half of the canvas.
const PAGE_COUNT = 18;
const PAGE_W = 380;
const PAGE_H = 500;
const PAGE_OFFSET_X = 5;
const PAGE_OFFSET_Y = 13;

export function ProblemScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const reportTitle = useMotionBinding<HTMLDivElement>();
   const stack = useMotionBinding<HTMLDivElement>();
   const counter = useMotionBinding<HTMLDivElement>();
   const counterText = useMotionBinding<HTMLSpanElement>();
   const painCard = useMotionBinding<HTMLDivElement>();
   const painNum = useMotionBinding<HTMLDivElement>();
   const painLabel = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("problem scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + problemBeats.hold),
         at(t + problemBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("report title slides in", reportTitle, [
         at(t + 0, { opacity: 0, y: -16 }),
         hold(t + problemBeats.reportIn),
         at(t + problemBeats.reportIn + 0.5, { opacity: 1, y: 0 }, curve.out(2)),
         hold(t + problemBeats.painIn - 0.05),
         at(t + problemBeats.painIn + 0.4, { opacity: 0.35, y: 0 }, curve.inOut(2)),
      ]);

      scene.animate("stack base settles", stack, [
         at(t + 0, { opacity: 0, scale: 0.96 }),
         hold(t + problemBeats.reportIn),
         at(t + problemBeats.reportIn + 0.4, { opacity: 1, scale: 1 }, curve.out(2)),
         hold(t + problemBeats.painIn),
         at(t + problemBeats.painIn + 0.55, { opacity: 0.25, scale: 0.97 }, curve.inOut(2)),
      ]);

      // The page counter ticks 1 → 73 over the same span the pages stack.
      // That's the visual story: every monitoring visit ships another tower.
      scene.text("page counter ticks", counterText, ({ absolute }) => {
         const local = absolute - t;
         if (local <= problemBeats.pagesStart) return "0 / 73";
         if (local >= problemBeats.pagesEnd) return "73 / 73";
         const p = (local - problemBeats.pagesStart) / (problemBeats.pagesEnd - problemBeats.pagesStart);
         const eased = 1 - (1 - p) * (1 - p);
         const n = Math.round(eased * 73);
         return `${n} / 73`;
      });

      scene.animate("counter pill fades in", counter, [
         at(t + 0, { opacity: 0, y: 8 }),
         hold(t + problemBeats.pagesStart - 0.05),
         at(t + problemBeats.pagesStart + 0.3, { opacity: 1, y: 0 }, curve.out(2)),
         hold(t + problemBeats.painIn),
         at(t + problemBeats.painIn + 0.55, { opacity: 0.25, y: 0 }, curve.inOut(2)),
      ]);

      // The pain card and number — the real subject of the beat.
      scene.animate("pain card cracks in", painCard, [
         at(t + 0, { opacity: 0, scale: 0.92, y: 28 }),
         hold(t + problemBeats.painIn),
         at(t + problemBeats.painIn + 0.55, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.2)),
      ]);

      scene.animate("pain number lands with weight", painNum, [
         at(t + 0, { opacity: 0, y: 30, scale: 0.92 }),
         hold(t + problemBeats.painIn + 0.15),
         at(t + problemBeats.painBeat, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.4)),
      ]);

      scene.animate("pain label follows", painLabel, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + problemBeats.painBeat - 0.05),
         at(t + problemBeats.painBeat + 0.45, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center overflow-hidden bg-black">
         {/* The page stack lives center-left; the pain card cantilevers over
              center-right. They visually overlap so the eye reads the pain
              card AS it punctures the towering stack — that's the message. */}
         <div className="relative grid w-full max-w-[1280px] grid-cols-[640px_1fr] items-center gap-12 px-12">
            <div className="relative flex h-[640px] items-center justify-center">
               <div
                  ref={stack.ref}
                  className="relative"
                  style={{ width: PAGE_W, height: PAGE_H + (PAGE_COUNT - 1) * PAGE_OFFSET_Y }}
               >
                  {Array.from({ length: PAGE_COUNT }).map((_, i) => (
                     <PageSheet
                        key={i}
                        index={i}
                        sceneStart={sceneStart}
                        offsetX={(PAGE_COUNT - 1 - i) * PAGE_OFFSET_X}
                        offsetY={(PAGE_COUNT - 1 - i) * PAGE_OFFSET_Y}
                     />
                  ))}
               </div>

               <div ref={reportTitle.ref} className="absolute -top-2 left-0 flex items-center gap-3">
                  <span className="size-2" style={{ backgroundColor: CYAN }} />
                  <div>
                     <div className="text-[18px] font-medium tracking-[-0.005em] text-white/95">{REPORT.title}</div>
                     <div className="text-[12px] tracking-[0.06em] text-white/40 uppercase">{REPORT.meta}</div>
                  </div>
               </div>

               <div
                  ref={counter.ref}
                  className="absolute -bottom-2 left-0 inline-flex items-center gap-2 border border-white/10 bg-white/3 px-3 py-1.5 text-[12px] font-medium tracking-[0.06em] text-white/70 uppercase"
               >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: CYAN }} />
                  <span>pages parsed</span>
                  <span className="ml-1 font-semibold text-white" ref={counterText.ref} />
               </div>
            </div>

            <div ref={painCard.ref} className="relative flex flex-col items-start">
               <div
                  className="flex items-center gap-3 text-[14px] font-medium tracking-[0.18em] uppercase"
                  style={{ color: SIGNAL }}
               >
                  <span className="size-2" style={{ backgroundColor: SIGNAL }} />
                  <span>the synthesis gap</span>
               </div>

               <div
                  ref={painNum.ref}
                  className="mt-7 font-medium tracking-[-0.045em] leading-[0.92] text-white"
                  style={{ fontSize: 200 }}
               >
                  2–4 <span className="text-white/55">hrs</span>
               </div>

               <div
                  ref={painLabel.ref}
                  className="mt-7 max-w-[520px] text-[26px] leading-[1.25] tracking-[-0.005em] text-white/75"
               >
                  per deviation, <span className="text-white">someone reads, extracts, and writes</span> rationale by
                  hand.
               </div>
            </div>
         </div>
      </div>
   );
}

// One sheet of the stack. Each sheet has a scribble of horizontal "lines"
// to read as text-on-paper without us having to actually render text. The
// top sheet is brighter; the rest fade into the depth.
function PageSheet({
   index,
   sceneStart,
   offsetX,
   offsetY,
}: {
   index: number;
   sceneStart: number;
   offsetX: number;
   offsetY: number;
}) {
   const sheet = useMotionBinding<HTMLDivElement>();
   // Pages fly in one after another between pagesStart and pagesEnd.
   const flyDuration = problemBeats.pagesEnd - problemBeats.pagesStart;
   const myStart = problemBeats.pagesStart + (index / PAGE_COUNT) * flyDuration;
   const myLand = myStart + 0.32;

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate(`page ${index} drops onto stack`, sheet, [
         at(t + 0, { opacity: 0, y: -40, rotationZ: -3 }),
         hold(t + myStart),
         at(t + myLand, { opacity: 1, y: 0, rotationZ: 0 }, curve.out(2)),
      ]);
   });

   const isTop = index === PAGE_COUNT - 1;
   const sheetOpacity = isTop ? 1 : 0.55 - (PAGE_COUNT - 1 - index) * 0.025;

   return (
      <div
         ref={sheet.ref}
         className="absolute"
         style={{
            top: offsetY,
            left: offsetX,
            width: PAGE_W,
            height: PAGE_H,
            backgroundColor: "rgba(255,255,255,0.965)",
            boxShadow: isTop
               ? "0 40px 100px -30px rgba(34,211,238,0.20), 0 14px 36px -16px rgba(0,0,0,0.85)"
               : "0 6px 18px -10px rgba(0,0,0,0.6)",
            opacity: sheetOpacity,
         }}
      >
         {/* Scribbled "lines of text" — we draw 24 horizontal strokes with
              random-ish widths so the sheet reads as a dense report page. */}
         <div className="flex h-full w-full flex-col gap-[10px] p-[26px]">
            <div className="mb-2 h-[10px] w-[140px] bg-black/85" />
            <div className="mb-1 h-[6px] w-[200px] bg-black/30" />
            {LINES.map((w, i) => (
               <div key={i} className="h-[3px] bg-black/50" style={{ width: `${w}%` }} />
            ))}
         </div>
      </div>
   );
}

// Pre-baked widths so every page reads identical (consistent visual rhythm
// across the stack). 22 lines is enough to fill the sheet without crowding.
const LINES = [92, 88, 95, 80, 90, 84, 96, 78, 92, 86, 70, 88, 94, 82, 90, 84, 92, 76, 88, 94, 70, 86];
