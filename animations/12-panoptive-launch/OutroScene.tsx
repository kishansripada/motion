import { at, hold, curve, useMotion, useMotionBinding, useStartTime, type MotionElementBinding } from "../../src/framework";
import { outroBeats } from "./beats";
import { CYAN, PANOPTIVE, PAYOFF } from "./shared";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Final beat. Three numeric receipts stagger in from the bottom, the payoff
// line lands above them, then a URL chip closes. CTA is implicit — the
// audience sees one URL and a tagline that names the product's promise.
//
// We mirror the iris glyph from TitleScene so the loop closes on the same
// visual it opened on (just smaller this time).

export function OutroScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const irisOuter = useMotionBinding<HTMLDivElement>();
   const irisPupil = useMotionBinding<HTMLDivElement>();
   const wordmark = useMotionBinding<HTMLDivElement>();
   const payoffLine = useMotionBinding<HTMLHeadingElement>();
   const url = useMotionBinding<HTMLDivElement>();
   const urlBar = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("outro scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.22, { opacity: 1 }, curve.out(2)),
         hold(t + outroBeats.hold),
         at(t + outroBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("outro iris ring fades in", irisOuter, [
         at(t + 0, { opacity: 0, scale: 0.7 }),
         hold(t + 0.15),
         at(t + 0.7, { opacity: 1, scale: 1 }, curve.backOut(1.3)),
      ]);

      scene.animate("outro iris pupil snaps", irisPupil, [
         at(t + 0, { opacity: 0, scale: 0 }),
         hold(t + 0.4),
         at(t + 0.8, { opacity: 1, scale: 1 }, curve.backOut(1.6)),
      ]);

      scene.animate("wordmark lifts in", wordmark, [
         at(t + 0, { opacity: 0, y: 18 }),
         hold(t + 0.55),
         at(t + 1.05, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("payoff line lifts in", payoffLine, [
         at(t + 0, { opacity: 0, y: 28 }),
         hold(t + outroBeats.payoff),
         at(t + outroBeats.payoff + 0.65, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("url chip lifts in last", url, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + outroBeats.url),
         at(t + outroBeats.url + 0.55, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("url underline wipes", urlBar, [
         at(t + 0, { opacity: 0, scale: 0 }),
         hold(t + outroBeats.url + 0.35),
         at(t + outroBeats.url + 0.95, { opacity: 1, scale: 1 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center overflow-hidden bg-black">
         <div className="flex w-full max-w-[1280px] flex-col items-center px-12">
            {/* Brand mark — small iris + wordmark on the same baseline. */}
            <div className="flex items-center gap-5">
               <div className="relative" style={{ width: 64, height: 64 }}>
                  <div
                     ref={irisOuter.ref}
                     className="absolute inset-0 rounded-full"
                     style={{
                        border: `2px solid ${CYAN}`,
                        boxShadow: `0 0 28px -4px ${CYAN}`,
                     }}
                  />
                  <span
                     className="absolute top-0 left-1/2 h-[6px] w-[2px] -translate-x-1/2"
                     style={{ backgroundColor: CYAN }}
                  />
                  <span
                     className="absolute bottom-0 left-1/2 h-[6px] w-[2px] -translate-x-1/2"
                     style={{ backgroundColor: CYAN }}
                  />
                  <span
                     className="absolute top-1/2 left-0 h-[2px] w-[6px] -translate-y-1/2"
                     style={{ backgroundColor: CYAN }}
                  />
                  <span
                     className="absolute top-1/2 right-0 h-[2px] w-[6px] -translate-y-1/2"
                     style={{ backgroundColor: CYAN }}
                  />
                  <div
                     ref={irisPupil.ref}
                     className="absolute rounded-full"
                     style={{
                        top: "36%",
                        left: "36%",
                        right: "36%",
                        bottom: "36%",
                        backgroundColor: CYAN,
                        boxShadow: `0 0 16px ${CYAN}`,
                     }}
                  />
               </div>

               <div
                  ref={wordmark.ref}
                  className="font-medium tracking-[-0.025em] text-white"
                  style={{ fontSize: 64, lineHeight: 1 }}
               >
                  {PANOPTIVE.name}
               </div>
            </div>

            <h1
               ref={payoffLine.ref}
               className="mt-12 max-w-[1080px] text-center font-medium tracking-[-0.02em] text-white"
               style={{ fontSize: 60, lineHeight: 1.1 }}
            >
               Defensible sponsor oversight, <span style={{ color: CYAN }}>without the reconstruction</span>.
            </h1>

            {/* Three receipts laid out as small chips below the headline.
                 They're proof not feature — keep them small so the headline
                 stays the subject of the beat. */}
            <div className="mt-14 flex items-stretch gap-12">
               {PAYOFF.map((p, i) => (
                  <PayoffStat key={p.label} index={i} sceneStart={sceneStart} stat={p} />
               ))}
            </div>

            <div
               ref={url.ref}
               className="relative mt-16 inline-flex items-center gap-3 rounded-full border border-dashed border-white/25 px-8 py-3.5 text-[20px] tracking-[0.005em] text-white/95"
            >
               <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
               >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
               </svg>
               <span className="font-medium">{PANOPTIVE.url}</span>
               <span className="ml-1 text-[13px] tracking-[0.16em] text-white/45 uppercase">book demo</span>
               <div
                  ref={urlBar.ref}
                  className="absolute right-7 -bottom-[1px] left-7 h-[2px] origin-left"
                  style={{ backgroundColor: CYAN }}
               />
            </div>
         </div>
      </div>
   );
}

function PayoffStat({ index, sceneStart, stat }: { index: number; sceneStart: number; stat: (typeof PAYOFF)[number] }) {
   const card = useMotionBinding<HTMLDivElement>();
   const startKey = ["stat0", "stat1", "stat2"][index] as "stat0" | "stat1" | "stat2";
   const start = outroBeats[startKey];

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`payoff stat ${index} lifts in`, card, [
         at(t + 0, { opacity: 0, y: 22, scale: 0.97 }),
         hold(t + start),
         at(t + start + 0.55, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.1)),
      ]);
   });

   return (
      <div ref={card.ref} className="flex flex-col items-center border-t-[2px] pt-5" style={{ borderColor: CYAN }}>
         <div className="font-medium tracking-[-0.02em] text-white" style={{ fontSize: 38, lineHeight: 1 }}>
            {stat.value}
         </div>
         <div className="mt-2 text-[14px] tracking-[0.005em] text-white/55">{stat.label}</div>
      </div>
   );
}
