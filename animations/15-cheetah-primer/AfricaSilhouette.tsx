import type { CSSProperties, Ref } from "react";
import { PALETTE } from "./beats";

// A stylized Africa silhouette — simplified enough to be readable at
// preview size, recognizable enough to anchor the geographic claim
// ("wild cheetahs in 1900 vs today"). NOT a survey-grade map: the
// coast paths are approximated with smooth cubic curves to fit a
// 400×480 viewBox.
//
// The "range" overlays are two organic blobs drawn in viewBox-local
// coordinates: HISTORIC_RANGE covers most of the interior (sub-Saharan
// + horn) representing the early-20th-century distribution, and
// MODERN_RANGE is a much smaller cluster over the eastern/southern
// strongholds (Kenya/Tanzania, Namibia/Botswana) where cheetahs
// actually persist today. The Population scene fades one out as the
// other fades in during the count-down.

const COAT_DEEP = PALETTE.coatDeep;

// Simplified Africa outline. Hand-traced control points for a single
// closed path. Geography is intentionally smoothed — we want the
// silhouette to read as "Africa" in half a second, not pass a
// cartography test.
const AFRICA_PATH = `
   M 110 30
   C 160 18 230 22 290 36
   C 330 46 358 58 374 80
   C 380 100 372 122 362 138
   C 372 162 388 192 388 220
   C 386 252 374 280 360 304
   C 348 326 332 348 314 374
   C 296 400 274 432 240 458
   C 222 472 200 478 180 470
   C 162 462 152 444 142 426
   C 124 392 104 358 92 320
   C 80 282 70 248 60 214
   C 52 184 48 156 56 128
   C 64 100 78 76 92 56
   C 98 46 102 36 110 30
   Z
`;

// Historic (early-20th-c.) range — covers most of the African interior
// south of the Sahara, plus the horn. Cheetahs were absent from the
// Congo basin (rainforest) and the deep south Cape.
const HISTORIC_RANGE = `
   M 120 130
   C 150 110 200 100 270 110
   C 330 122 360 140 366 170
   C 366 200 358 230 344 260
   C 332 290 318 314 296 340
   C 274 364 248 384 218 388
   C 190 388 164 376 144 352
   C 124 326 110 296 100 260
   C 92 226 90 196 96 168
   C 102 148 108 138 120 130
   Z
`;

// Modern (today) range — a much smaller cluster of viable populations
// in East Africa (Kenya/Tanzania) plus a couple of pockets in Southern
// Africa (Namibia/Botswana). Approximated as three small irregular
// blobs at those coordinates.
const MODERN_RANGE_BLOBS = [
   // East Africa cluster (Kenya/Tanzania) — the biggest remaining pop.
   `M 290 220 C 310 215 322 230 318 248 C 314 264 296 268 282 260 C 270 248 274 228 290 220 Z`,
   // Southern Africa cluster (Namibia/Botswana) — second-largest.
   `M 220 350 C 244 345 258 362 252 380 C 244 392 222 392 210 380 C 200 366 206 352 220 350 Z`,
   // Tiny North Africa / Sahel remnant.
   `M 180 150 C 196 146 206 158 202 170 C 196 180 184 180 176 172 C 172 162 174 154 180 150 Z`,
];

type Props = {
   width?: number;
   height?: number;
   showHistoric?: number; // 0..1 opacity of the historic range
   showModern?: number; // 0..1 opacity of the modern range
   innerRef?: Ref<SVGSVGElement>;
   style?: CSSProperties;
};

export function AfricaSilhouette({
   width = 400,
   height = 480,
   showHistoric = 1,
   showModern = 0,
   innerRef,
   style,
}: Props) {
   return (
      <svg
         ref={innerRef}
         viewBox="0 0 400 480"
         width={width}
         height={height}
         preserveAspectRatio="xMidYMid meet"
         style={style}
         aria-hidden="true"
      >
         {/* Continent silhouette — faint ink on the warm canvas, just
              enough to read as "Africa" without competing with the
              numeric hero. */}
         <path d={AFRICA_PATH} fill={`${PALETTE.ink}`} fillOpacity={0.05} stroke={PALETTE.inkFaint} strokeWidth="1.5" />

         {/* Historic range — large warm wash. */}
         <path d={HISTORIC_RANGE} fill={COAT_DEEP} fillOpacity={0.7 * showHistoric} />

         {/* Modern range — small isolated pockets in saturated amber. */}
         {MODERN_RANGE_BLOBS.map((d, i) => (
            <path key={i} d={d} fill={PALETTE.amber} fillOpacity={0.95 * showModern} />
         ))}
      </svg>
   );
}
