import { useEffect, useRef, type RefObject } from "react";
import {
   Canvas,
   at,
   hold,
   definePureAnimation,
   curve,
   useMotion,
   useMotionBinding,
} from "../../src/framework";
import backgroundUrl from "./assets/background.mp4";

const DURATION = 67.833333;

type LfWindow = Window & {
   lfTimeline?: {
      time(): number;
      duration(): number;
      paused(): boolean;
   };
};

type TextBeat = {
   start: number;
   end: number;
   kicker: string;
   lines: string[];
   accentLine?: number;
};

const textBeats: TextBeat[] = [
   {
      start: 1.2,
      end: 4.9,
      kicker: "LIVE RUN",
      lines: ["A messy ask", "becomes a workflow"],
      accentLine: 1,
   },
   {
      start: 5.6,
      end: 9.8,
      kicker: "THE JOB",
      lines: ["Find the firms.", "Enrich the people."],
      accentLine: 1,
   },
   {
      start: 10.7,
      end: 16.2,
      kicker: "NO MOCKUP",
      lines: ["The agent is", "doing the work."],
      accentLine: 0,
   },
   {
      start: 56.5,
      end: 60.8,
      kicker: "THE PAYOFF",
      lines: ["From search", "to accounts"],
      accentLine: 1,
   },
   {
      start: 61.3,
      end: 66.3,
      kicker: "AUTOMATION THAT MOVES",
      lines: ["The boring parts", "start handling themselves"],
      accentLine: 0,
   },
];

function useSyncedVideo(videoRef: RefObject<HTMLVideoElement | null>) {
   useEffect(() => {
      let raf = 0;
      let lastSet = -1;

      const tick = () => {
         const video = videoRef.current;
         const timeline = (window as LfWindow).lfTimeline;
         if (video && timeline) {
            const target = Math.max(0, Math.min(DURATION, timeline.time()));
            const paused = timeline.paused();

            if (paused) {
               video.pause();
            }

            if (paused || Math.abs(video.currentTime - target) > 0.12) {
               if (Math.abs(lastSet - target) > 0.016) {
                  video.currentTime = target;
                  lastSet = target;
               }
            } else if (!paused && video.paused) {
               void video.play().catch(() => {
                  /* Muted playback can still be blocked in unusual browser states. */
               });
            }
         }
         raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
   }, [videoRef]);
}

function VideoBackground() {
   const ref = useRef<HTMLVideoElement | null>(null);
   useSyncedVideo(ref);

   return (
      <video
         ref={ref}
         className="absolute inset-0 h-full w-full object-cover"
         src={backgroundUrl}
         muted
         playsInline
         preload="auto"
      />
   );
}

function CenterTextBeat({ beat, index }: { beat: TextBeat; index: number }) {
   const bind = useMotionBinding<HTMLDivElement>();
   const scrim = useMotionBinding<HTMLDivElement>();
   const hairline = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      scene.animate(`center text ${index} scrim breathes`, scrim, [
         at(0, { opacity: 0 }),
         hold(beat.start),
         at(beat.start + 0.45, { opacity: 0.56 }, curve.out(2)),
         hold(beat.end - 0.45),
         at(beat.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate(`center text ${index} block enters`, bind, [
         at(0, { opacity: 0, y: 36, scale: 0.96 }),
         hold(beat.start + 0.08),
         at(beat.start + 0.72, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
         hold(beat.end - 0.52),
         at(beat.end, { opacity: 0, y: -24, scale: 1.025 }, curve.inOut(2)),
      ]);

      scene.animate(`center text ${index} hairline draws`, hairline, [
         at(0, { opacity: 0, scale: 0 }),
         hold(beat.start + 0.3),
         at(beat.start + 0.95, { opacity: 1, scale: 1 }, curve.out(2)),
         hold(beat.end - 0.55),
         at(beat.end, { opacity: 0, scale: 0.2 }, curve.inOut(2)),
      ]);
   });

   return (
      <>
         <div ref={scrim.ref} className="absolute inset-0 bg-black" />
         <div
            ref={bind.ref}
            className="absolute inset-0 flex flex-col items-center justify-center px-20 text-center text-white"
         >
            <div className="mb-8 font-mono text-[15px] uppercase tracking-[0.34em] text-emerald-200/80">
               {beat.kicker}
            </div>
            <div
               ref={hairline.ref}
               className="mb-9 h-[2px] w-[360px] origin-center bg-emerald-300/90"
               style={{ boxShadow: "0 0 30px rgba(110,231,183,0.55)" }}
            />
            <div
               className="max-w-[1500px] text-[112px] font-semibold leading-[0.88] tracking-[-0.075em]"
               style={{
                  textShadow: "0 12px 54px rgba(0,0,0,0.82)",
               }}
            >
               {beat.lines.map((line, lineIndex) => (
                  <KineticLine
                     key={`${line}-${lineIndex}`}
                     line={line}
                     start={beat.start}
                     end={beat.end}
                     index={lineIndex}
                     accented={lineIndex === beat.accentLine}
                  />
               ))}
            </div>
         </div>
      </>
   );
}

function KineticLine({
   line,
   start,
   end,
   index,
   accented,
}: {
   line: string;
   start: number;
   end: number;
   index: number;
   accented: boolean;
}) {
   const bind = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const delay = index * 0.13;
      scene.animate(`kinetic line ${line}`, bind, [
         at(0, { opacity: 0, y: 42, scale: 0.98 }),
         hold(start + delay),
         at(start + delay + 0.68, { opacity: 1, y: 0, scale: 1 }, curve.out(2)),
         hold(end - 0.62 + delay * 0.2),
         at(end + delay * 0.1, { opacity: 0, y: -28, scale: 1.018 }, curve.inOut(2)),
      ]);
   });

   return (
      <div
         ref={bind.ref}
         className={accented ? "text-emerald-200" : "text-white"}
         style={{
            WebkitTextStroke: accented ? "0" : "1px rgba(255,255,255,0.08)",
         }}
      >
         {line}
      </div>
   );
}

function FacecamSpotlight() {
   const glow = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const keyframes = [
         at(0, { opacity: 0 }),
         hold(1.2),
         at(2.4, { opacity: 0.7 }, curve.out(2)),
         hold(16.2),
         at(17.2, { opacity: 0 }, curve.inOut(2)),
         hold(56.5),
         at(57.4, { opacity: 0.62 }, curve.out(2)),
         hold(66.3),
         at(67.1, { opacity: 0 }, curve.inOut(2)),
      ];
      scene.animate("facecam text spotlight breathes over talking sections", glow, keyframes);
   });

   return (
      <div
         ref={glow.ref}
         className="pointer-events-none absolute inset-0"
         style={{
            background:
               "radial-gradient(circle at 50% 52%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.56) 48%, rgba(0,0,0,0.78) 100%)",
         }}
      />
   );
}

function PersistentChrome() {
   const progress = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      scene.animate("top progress line follows source video", progress, [
         at(0, { scale: 0, opacity: 0.85 }),
         at(DURATION, { scale: 1, opacity: 0.85 }, curve.linear()),
      ]);
   });

   return (
      <div className="absolute top-0 right-0 left-0 h-px bg-white/10">
         <div ref={progress.ref} className="h-full origin-left bg-emerald-300/90" />
      </div>
   );
}

function UntitledProject19() {
   return (
      <Canvas className="relative overflow-hidden bg-black">
         <VideoBackground />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_48%,rgba(0,0,0,0.38)_100%)]" />
         <div className="absolute inset-0 bg-black/5" />
         <PersistentChrome />
         <FacecamSpotlight />
         {textBeats.map((beat, index) => (
            <CenterTextBeat key={`${beat.start}-${beat.kicker}`} beat={beat} index={index} />
         ))}
      </Canvas>
   );
}

export default definePureAnimation({
   name: "13 · untitled project 19",
   frameWidth: 1920,
   frameHeight: 1080,
   component: UntitledProject19,
   options: {
      duration: DURATION,
      loopDelay: 1.2,
   },
});
