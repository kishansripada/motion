import { at, curve, useMotion, useMotionBinding } from "../../src/framework";
import { PALETTE } from "./beats";

// The film's continuous stage: warm dark canvas evoking late-afternoon
// savanna. Three layers do the work, stacked back-to-front:
//
// 1. Base vertical gradient: deep umber sky → russet floor.
// 2. A wide amber sun glow hanging low-right (off-centre on purpose —
//    a centred glow reads as a vignette, an off-centre glow reads as
//    a light source).
// 3. A horizon haze that lifts the floor and gives the sun "atmosphere".
// 4. Two SVG turbulence passes — large soft puffs for organic gradient
//    break-up, fine grain on top to suppress any visible color banding
//    at hero-text sizes.
//
// The whole assembly drifts ~50 px right over the full duration so the
// scene never feels frozen between text beats. The sun also rises a
// little (~14 px up) over the same window — gives the back layer a
// living, breathing quality without competing with any foreground
// motion.

type Props = {
   duration: number;
};

export function SavannaBackground({ duration }: Props) {
   const drift = useMotionBinding<HTMLDivElement>();
   const sun = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      scene.animate("savanna haze drifts slowly", drift, [
         at(0, { x: 0 }),
         at(duration, { x: -52 }, curve.linear()),
      ]);
      scene.animate("sun rises imperceptibly", sun, [
         at(0, { y: 0 }),
         at(duration, { y: -14 }, curve.linear()),
      ]);
   });

   return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
         {/* Base sky→horizon: the stops are weighted toward the bottom so
              the warmer russet "floor" feels taller than the umber sky. */}
         <div
            className="absolute inset-0"
            style={{
               background: `linear-gradient(to bottom, ${PALETTE.bgDeep} 0%, ${PALETTE.bgMid} 38%, ${PALETTE.bgWarm} 78%, #4A2A18 100%)`,
            }}
         />

         {/* Sun + haze (the parts that should drift). Wrapped in `drift`
              so the wash moves while the base gradient stays put. */}
         <div ref={drift.ref} className="absolute inset-0">
            {/* Off-centre sun. Two stacked radial gradients: a saturated
                 amber core + a much wider warm bloom. Mid-right placement
                 reads as "sun low on the horizon" rather than a vignette. */}
            <div
               ref={sun.ref}
               className="absolute inset-0"
               style={{
                  background: [
                     `radial-gradient(ellipse 600px 540px at 68% 62%, rgba(232, 155, 44, 0.85) 0%, rgba(232, 155, 44, 0) 60%)`,
                     `radial-gradient(ellipse 1400px 900px at 70% 65%, rgba(232, 155, 44, 0.30) 0%, rgba(232, 155, 44, 0) 70%)`,
                     `radial-gradient(ellipse 1800px 700px at 70% 100%, rgba(199, 123, 27, 0.40) 0%, rgba(199, 123, 27, 0) 65%)`,
                  ].join(", "),
                  mixBlendMode: "screen",
               }}
            />

            {/* Cool deep-shadow pull at the upper-left corner — gives the
                 composition a one-sided light by subtraction (a corner that
                 the sun doesn't reach). Subtle on purpose. */}
            <div
               className="absolute inset-0"
               style={{
                  background:
                     "radial-gradient(ellipse 1100px 700px at 0% 0%, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 60%)",
               }}
            />

            {/* Horizon haze: a thin warm band across the floor of the
                 canvas. Sells "ground meets sky" without drawing an
                 explicit horizon line. */}
            <div
               className="absolute inset-x-0 bottom-0"
               style={{
                  height: "32%",
                  background:
                     "linear-gradient(to top, rgba(232, 155, 44, 0.22) 0%, rgba(232, 155, 44, 0.10) 50%, rgba(232, 155, 44, 0) 100%)",
                  mixBlendMode: "screen",
               }}
            />
         </div>

         {/* Atmospheric turbulence — big soft cloud-shaped noise channel-
              mixed to amber. Multiplied through soft-light at low opacity
              so it modulates the gradient without graying the palette. */}
         <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            style={{ opacity: 0.42, mixBlendMode: "soft-light" }}
         >
            <defs>
               <filter id="cheetah-haze-coarse" x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.0078" numOctaves="3" seed="11" />
                  <feColorMatrix
                     type="matrix"
                     values="0.95 0 0 0 0.18
                             0.85 0 0 0 0.10
                             0.55 0 0 0 0.04
                             0    0 0 1 0"
                  />
               </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#cheetah-haze-coarse)" />
         </svg>

         {/* Fine film grain. Suppresses gradient banding at hero text
              sizes (visible on 240px+ numerals over a soft gradient). */}
         <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            style={{ opacity: 0.18, mixBlendMode: "overlay" }}
         >
            <defs>
               <filter id="cheetah-grain-fine" x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                  <feColorMatrix
                     type="matrix"
                     values="0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 0.6 0"
                  />
               </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#cheetah-grain-fine)" />
         </svg>

         {/* Top-left vignette emphasis: thin dark wash to seat the hero
              text. Keeps the upper-left corner readable on light frames. */}
         <div
            className="absolute inset-0"
            style={{
               background:
                  "radial-gradient(ellipse 1600px 1000px at 100% 0%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 65%)",
            }}
         />
      </div>
   );
}
