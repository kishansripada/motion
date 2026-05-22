import { at, curve, useMotion, useMotionBinding } from "../../src/framework";

// The bg is the show's stage. Light blue at top, white at bottom, with
// imperfect cloud puffs broken across the canvas so the gradient never
// reads as a clean linear blend. Three layers do the work:
//
// 1. Base linear gradient — sky → horizon.
// 2. Soft white radial puffs — cloud highlights.
// 3. Slightly cooler blue patches — sky depth (so the top isn't a flat tint).
// 4. A low-frequency SVG turbulence pass — the "not quite perfect" texture
//    that breaks the visible banding of stacked gradients into something
//    organic.
//
// The whole bg drifts ~40px right over the full timeline. At 1440 wide that's
// imperceptible per second, but it stops the scene from feeling stuck on a
// frozen poster while text is still motion-design's primary subject.

export function CloudBackground({ duration }: { duration: number }) {
   const drift = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      scene.animate("cloud bg drifts slowly", drift, [at(0, { x: 0 }), at(duration, { x: -36 }, curve.linear())]);
   });

   return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
         {/* Base sky→horizon. The gradient stops are NOT evenly distributed —
              they're weighted toward the bottom so the white "floor" feels
              taller than the blue "sky". */}
         <div
            className="absolute inset-0"
            style={{
               background:
                  "linear-gradient(to bottom, #7fb8dc 0%, #a8cfe6 24%, #cee1ef 54%, #ecf3f8 82%, #ffffff 100%)",
            }}
         />

         {/* Cloud puffs + sky depth. Wrapped in the drifting div so the
              "where the clouds are" detail moves while the linear base
              stays put. */}
         <div ref={drift.ref} className="absolute inset-0">
            {/* White cloud highlights. Ellipse radii are wildly different so
                  no two puffs read as the same shape. */}
            <div
               className="absolute -inset-x-[8%] inset-y-0"
               style={{
                  background: [
                     "radial-gradient(ellipse 1100px 280px at 18% 18%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 62%)",
                     "radial-gradient(ellipse 880px 220px at 78% 8%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0) 65%)",
                     "radial-gradient(ellipse 1280px 360px at 50% 64%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 58%)",
                     "radial-gradient(ellipse 720px 200px at 28% 88%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 55%)",
                     "radial-gradient(ellipse 540px 180px at 92% 42%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 65%)",
                  ].join(", "),
               }}
            />

            {/* Sky depth — slightly deeper blue patches at the top so the
                  blue isn't one flat color. Subtle on purpose. */}
            <div
               className="absolute -inset-x-[8%] inset-y-0"
               style={{
                  background: [
                     "radial-gradient(ellipse 720px 240px at 62% 14%, rgba(110,176,216,0.45) 0%, rgba(255,255,255,0) 65%)",
                     "radial-gradient(ellipse 540px 180px at 14% 6%, rgba(130,190,222,0.40) 0%, rgba(255,255,255,0) 60%)",
                     "radial-gradient(ellipse 480px 160px at 86% 30%, rgba(125,185,218,0.32) 0%, rgba(255,255,255,0) 65%)",
                  ].join(", "),
               }}
            />
         </div>

         {/* Atmospheric turbulence. Low baseFrequency = big soft cloud-shaped
              noise (vs. high freq = grain). Channel-mixed to white and
              slammed through low opacity + soft-light blend so it adds
              organic break-up without graying the palette. */}
         <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            style={{ opacity: 0.55, mixBlendMode: "soft-light" }}
         >
            <defs>
               <filter id="dex-cloud-tex" x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.0085" numOctaves="3" seed="7" />
                  <feColorMatrix
                     type="matrix"
                     values="0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 1 0"
                  />
               </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#dex-cloud-tex)" />
         </svg>

         {/* Second turbulence pass — finer, lower opacity. Adds the "wisp"
              sub-detail that the big puffs miss. */}
         <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            style={{ opacity: 0.18, mixBlendMode: "overlay" }}
         >
            <defs>
               <filter id="dex-cloud-tex-fine" x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.024" numOctaves="2" seed="13" />
                  <feColorMatrix
                     type="matrix"
                     values="0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 1 0"
                  />
               </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#dex-cloud-tex-fine)" />
         </svg>
      </div>
   );
}
