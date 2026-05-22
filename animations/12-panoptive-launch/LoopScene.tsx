import { at, hold, curve, useMotion, useMotionBinding, useStartTime, type MotionElementBinding } from "../../src/framework";
import { loopBeats } from "./beats";
import { AUDIT, CYAN, LOOP_NODES, SIGNAL } from "./shared";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

// Beat 5: the Panoptive Loop. Site copy: "Data In → Signals → Decision →
// Audit Trail — continuous loop". This beat puts the loop on screen as
// four nodes connected by a horizontal arrow track, then closes the loop
// with a curved return arc from #4 back to #1.
//
// The shorthand: each node is a square card with an icon + title + sub.
// The track between them lights up as the data flows through. The closing
// arc makes "continuous" visible — without it this would just be a
// pipeline, not a loop.

const NODE_W = 240;

export function LoopScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const tag = useMotionBinding<HTMLDivElement>();
   const headline = useMotionBinding<HTMLHeadingElement>();
   const track = useMotionBinding<HTMLDivElement>();
   const arc = useMotionBinding<HTMLDivElement>();
   const subline = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("loop scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + loopBeats.hold),
         at(t + loopBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("section tag fades in", tag, [
         at(t + 0, { opacity: 0, y: 12 }),
         hold(t + 0.2),
         at(t + 0.7, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      scene.animate("headline lifts in", headline, [
         at(t + 0, { opacity: 0, y: 24 }),
         hold(t + loopBeats.headlineIn),
         at(t + loopBeats.headlineIn + 0.6, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // The connector track between nodes draws left → right as nodes
      // light up. We use scaleX from origin-left so it grows like a
      // progress bar.
      scene.animate("connector track grows", track, [
         at(t + 0, { opacity: 0, scale: 0 }),
         hold(t + loopBeats.node0),
         at(t + loopBeats.node0 + 0.3, { opacity: 1, scale: 0 }, curve.linear()),
         at(t + loopBeats.node3 - 0.05, { opacity: 1, scale: 1 }, curve.inOut(2)),
         at(t + loopBeats.subline, { opacity: 0.55, scale: 1 }, curve.inOut(2)),
      ]);

      // The closing arc draws in once the four nodes have lit up. We
      // animate the wrapping div's opacity rather than stroke-dashoffset
      // (which would require a thunked state to read pathLength) — the
      // gradient + dashed pattern + arrowhead inside the SVG already do
      // the "continuous loop" reading on their own.
      //
      // Earlier drafts had a "packet dot" travelling along the arc to
      // make continuity literal. It got positioned in CSS-pixel space
      // and the arc lived in stretched-SVG-viewBox space, so the dot
      // floated ~150px above the actual curve through the whole sweep.
      // The fix is structural — the dot has to live inside the SVG and
      // be driven by sampling the bezier, not by a parallel CSS x/y.
      // Since the static arc sells the loop perfectly well, we dropped
      // the dot rather than build the full bezier-sampling rig. If you
      // re-add it, animate an SVG <g> wrapping a <circle cx cy>, with
      // CSS x/y in viewBox units (preserveAspectRatio=none means CSS
      // px ≠ viewBox units — sample the path mathematically).
      scene.animate("loop closing arc draws", arc, [
         at(t + 0, { opacity: 0 }),
         hold(t + loopBeats.arc - 0.05),
         at(t + loopBeats.arc + 0.6, { opacity: 1 }, curve.out(2)),
      ]);

      scene.animate("subline lifts in", subline, [
         at(t + 0, { opacity: 0, y: 14 }),
         hold(t + loopBeats.subline),
         at(t + loopBeats.subline + 0.55, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center overflow-hidden bg-black">
         <div className="flex w-full max-w-[1320px] flex-col items-center px-12">
            <div
               ref={tag.ref}
               className="flex items-center gap-3 text-[14px] font-medium tracking-[0.18em] text-white/45 uppercase"
            >
               <span className="size-2" style={{ backgroundColor: CYAN }} />
               <span>the panoptive loop</span>
            </div>

            <h2
               ref={headline.ref}
               className="mt-5 max-w-[1100px] text-center font-medium tracking-[-0.02em] text-white"
               style={{ fontSize: 56, lineHeight: 1.05 }}
            >
               One <span style={{ color: CYAN }}>continuous loop</span>, from data to inspection-ready record.
            </h2>

            {/* Node row + connector + closing arc all live in this
                 relative wrapper so we can absolutely-position the arc
                 underneath without it kicking the layout. */}
            <div className="relative mt-16 flex w-full items-center justify-between">
               {/* Connector base track (dim) — shows the "rails" the
                    growth track expands over. */}
               <div
                  className="absolute top-1/2 right-[60px] left-[60px] h-[2px] -translate-y-1/2 bg-white/10"
                  aria-hidden="true"
               />
               <div
                  ref={track.ref}
                  className="absolute top-1/2 right-[60px] left-[60px] h-[2px] origin-left -translate-y-1/2"
                  aria-hidden="true"
                  style={{
                     backgroundColor: CYAN,
                     boxShadow: `0 0 14px ${CYAN}`,
                  }}
               />

               {LOOP_NODES.map((node, i) => (
                  <LoopNode key={node.key} index={i} sceneStart={sceneStart} title={node.title} sub={node.sub} />
               ))}

               {/* Closing arc — bows below the node row from #4 → #1 to
                    show the loop's continuity. */}
               <div
                  ref={arc.ref}
                  className="pointer-events-none absolute -bottom-[140px] left-0 h-[200px] w-full"
                  aria-hidden="true"
               >
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
                     <defs>
                        <linearGradient id="arcGrad" x1="1" y1="0" x2="0" y2="0">
                           <stop offset="0%" stopColor={AUDIT} />
                           <stop offset="55%" stopColor={CYAN} />
                           <stop offset="100%" stopColor={SIGNAL} />
                        </linearGradient>
                        <marker
                           id="arrow"
                           viewBox="0 0 10 10"
                           refX="9"
                           refY="5"
                           markerWidth="8"
                           markerHeight="8"
                           orient="auto-start-reverse"
                        >
                           <path d="M0 0 L10 5 L0 10 z" fill={CYAN} />
                        </marker>
                     </defs>
                     <path
                        d="M 1140 0 C 1140 160, 60 160, 60 0"
                        fill="none"
                        stroke="url(#arcGrad)"
                        strokeWidth="2.5"
                        strokeDasharray="6 8"
                        markerEnd="url(#arrow)"
                     />
                  </svg>
               </div>
            </div>

            <div
               ref={subline.ref}
               className="mt-[210px] max-w-[820px] text-center text-[22px] tracking-[-0.005em] text-white/70"
            >
               Continuous oversight. Every decision <span className="text-white">documented, cited, audit-ready</span>.
            </div>
         </div>
      </div>
   );
}

type LoopNodeProps = {
   index: number;
   sceneStart: number;
   title: string;
   sub: string;
};

function LoopNode({ index, sceneStart, title, sub }: LoopNodeProps) {
   const card = useMotionBinding<HTMLDivElement>();
   const ring = useMotionBinding<HTMLDivElement>();
   const pulse = useMotionBinding<HTMLDivElement>();
   const num = useMotionBinding<HTMLDivElement>();

   const startKey = ["node0", "node1", "node2", "node3"][index] as "node0" | "node1" | "node2" | "node3";
   const start = loopBeats[startKey];

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate(`node ${index} lifts in`, card, [
         at(t + 0, { opacity: 0, y: 24, scale: 0.92 }),
         hold(t + start),
         at(t + start + 0.5, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.2)),
      ]);

      scene.animate(`node ${index} ring lights up`, ring, [
         at(t + 0, { opacity: 0, scale: 0.6 }),
         hold(t + start + 0.1),
         at(t + start + 0.55, { opacity: 1, scale: 1 }, curve.backOut(1.4)),
      ]);

      scene.animate(`node ${index} pulse expands`, pulse, [
         at(t + 0, { opacity: 0, scale: 0.7 }),
         hold(t + start + 0.2),
         at(t + start + 0.4, { opacity: 0.7, scale: 1 }, curve.out(2)),
         at(t + start + 1.2, { opacity: 0, scale: 1.6 }, curve.inOut(2)),
      ]);

      scene.animate(`node ${index} number fades in`, num, [
         at(t + 0, { opacity: 0 }),
         hold(t + start),
         at(t + start + 0.4, { opacity: 1 }, curve.out(2)),
      ]);
   });

   const Icon = NODE_ICONS[index];

   return (
      <div ref={card.ref} className="relative z-10 flex flex-col items-center">
         <div className="relative" style={{ width: 116, height: 116 }}>
            <div
               ref={pulse.ref}
               className="absolute inset-0 rounded-full"
               style={{
                  border: `2px solid ${CYAN}`,
                  boxShadow: `0 0 30px ${CYAN}55`,
               }}
            />
            <div
               ref={ring.ref}
               className="absolute inset-[10px] rounded-full bg-black flex items-center justify-center"
               style={{
                  border: `2px solid ${CYAN}`,
                  boxShadow: `0 0 24px -6px ${CYAN}`,
               }}
            >
               <Icon />
            </div>
            <div
               ref={num.ref}
               className="absolute -top-3 -right-3 inline-flex size-7 items-center justify-center rounded-full text-[12px] font-bold tabular-nums"
               style={{
                  backgroundColor: CYAN,
                  color: "#000",
                  boxShadow: `0 0 12px ${CYAN}`,
               }}
            >
               {index + 1}
            </div>
         </div>
         <div
            className="mt-5 text-center text-[20px] font-medium tracking-[-0.005em] text-white"
            style={{ width: NODE_W }}
         >
            {title}
         </div>
         <div className="mt-1.5 text-center text-[13px] tracking-[-0.005em] text-white/45" style={{ width: NODE_W }}>
            {sub}
         </div>
      </div>
   );
}

// Each node icon is a clean line glyph that reads in <0.5s. Strokes are 2px
// at 56×56 — at the node's 96px ring size they sit comfortably within.
function IconInbox() {
   return (
      <svg
         viewBox="0 0 24 24"
         width="46"
         height="46"
         stroke={CYAN}
         strokeWidth="1.7"
         fill="none"
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
      >
         <path d="M22 12h-6l-2 3h-4l-2-3H2" />
         <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
      </svg>
   );
}

function IconRadar() {
   return (
      <svg
         viewBox="0 0 24 24"
         width="46"
         height="46"
         stroke={CYAN}
         strokeWidth="1.7"
         fill="none"
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
      >
         <circle cx="12" cy="12" r="9" />
         <circle cx="12" cy="12" r="5" />
         <circle cx="12" cy="12" r="1.5" fill={CYAN} />
         <path d="M12 3v9l6 4" />
      </svg>
   );
}

function IconCheckShield() {
   return (
      <svg
         viewBox="0 0 24 24"
         width="46"
         height="46"
         stroke={CYAN}
         strokeWidth="1.7"
         fill="none"
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
      >
         <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
         <path d="m9 12 2 2 4-4" />
      </svg>
   );
}

function IconLockArchive() {
   return (
      <svg
         viewBox="0 0 24 24"
         width="46"
         height="46"
         stroke={CYAN}
         strokeWidth="1.7"
         fill="none"
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
      >
         <rect x="3" y="3" width="18" height="4" rx="1" />
         <path d="M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
         <path d="M10 12h4" />
         <path d="M12 16v3" />
      </svg>
   );
}

const NODE_ICONS = [IconInbox, IconRadar, IconCheckShield, IconLockArchive];
