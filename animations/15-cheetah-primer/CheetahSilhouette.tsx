import type { CSSProperties, Ref } from "react";
import { PALETTE } from "./beats";

// A stylized profile cheetah mid-stride, head-left, in the iconic
// "flying" frame where all four paws are off the ground: front legs
// reaching forward, hind legs extended back, spine arched at the apex,
// tail trailing up for balance. This is the pose the cheetah's body is
// LITERALLY built for — and it gives the four anatomy callouts natural
// anchor points spread across the canvas (spine peak top-center, chest
// far-left, hind paw bottom-right, tail tip top-right).
//
// The silhouette is built from composite shapes (a body path, head and
// snout overlays, two pairs of legs as thick strokes, a tail stroke,
// and a coat-spot field). The "tear stripe" from inner eye to mouth is
// the visual disambiguator from a leopard — keep it.
//
// Coordinates are in a 0 0 1700 620 viewBox. The Anatomy scene reads
// ANATOMY_LABELS[].anchorX/Y from beats.ts as fractions of that box.
// If you re-tune body proportions, re-verify those fractions.

const COAT = PALETTE.coat;
const COAT_DEEP = PALETTE.coatDeep;
const SPOT = PALETTE.spot;
const SHADOW = "rgba(20, 12, 6, 0.30)";

// Spots — denser on the dorsal surface, sparser on the limbs and belly
// to match the natural cheetah coat distribution. Hand-laid so the
// pattern reads as an animal rather than visual noise.
const SPOTS: Array<{ x: number; y: number; r: number }> = [
   // upper back / spine
   { x: 380, y: 260, r: 6 },
   { x: 440, y: 248, r: 7 },
   { x: 500, y: 252, r: 6 },
   { x: 560, y: 244, r: 8 },
   { x: 620, y: 240, r: 7 },
   { x: 680, y: 236, r: 8 },
   { x: 740, y: 238, r: 7 },
   { x: 800, y: 244, r: 8 },
   { x: 860, y: 252, r: 7 },
   { x: 920, y: 262, r: 7 },
   { x: 980, y: 272, r: 6 },
   // mid-body band
   { x: 360, y: 295, r: 5 },
   { x: 420, y: 290, r: 6 },
   { x: 480, y: 295, r: 7 },
   { x: 540, y: 290, r: 6 },
   { x: 600, y: 288, r: 7 },
   { x: 660, y: 285, r: 7 },
   { x: 720, y: 290, r: 6 },
   { x: 780, y: 295, r: 6 },
   { x: 840, y: 295, r: 7 },
   { x: 900, y: 298, r: 6 },
   { x: 970, y: 300, r: 5 },
   // lower belly band (sparse)
   { x: 460, y: 330, r: 5 },
   { x: 540, y: 335, r: 5 },
   { x: 620, y: 340, r: 5 },
   { x: 700, y: 338, r: 5 },
   { x: 800, y: 332, r: 5 },
   { x: 880, y: 326, r: 5 },
   // shoulder
   { x: 300, y: 280, r: 5 },
   { x: 280, y: 308, r: 4 },
   // hip
   { x: 1020, y: 290, r: 5 },
   { x: 1050, y: 320, r: 4 },
   // tail
   { x: 1200, y: 240, r: 5 },
   { x: 1290, y: 195, r: 5 },
   { x: 1380, y: 150, r: 4 },
];

type Props = {
   width?: number;
   height?: number;
   innerRef?: Ref<SVGSVGElement>;
   style?: CSSProperties;
};

export function CheetahSilhouette({ width = 1700, height = 620, innerRef, style }: Props) {
   return (
      <svg
         ref={innerRef}
         viewBox="0 0 1700 620"
         width={width}
         height={height}
         preserveAspectRatio="xMidYMid meet"
         style={style}
         aria-hidden="true"
      >
         <defs>
            <linearGradient id="cheetah-coat-grad-2" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stopColor="#EBB680" />
               <stop offset="55%" stopColor={COAT} />
               <stop offset="100%" stopColor={COAT_DEEP} />
            </linearGradient>
            <radialGradient id="cheetah-eye-grad-2" cx="0.5" cy="0.5" r="0.5">
               <stop offset="0%" stopColor="#FFE9C2" />
               <stop offset="100%" stopColor={PALETTE.amber} />
            </radialGradient>
         </defs>

         {/* Soft ground shadow below the leaping cheetah. Offset slightly
              down and centred under the cheetah's centre of gravity. */}
         <ellipse cx="780" cy="565" rx="480" ry="20" fill={SHADOW} />

         {/* Tail (drawn FIRST so the body covers its attachment). Long
              graceful sweep up and to the right; the dark tuft anchors
              the eye at the top-right of frame. */}
         <path
            d="M 1080 290 C 1200 270, 1340 240, 1450 180 C 1540 140, 1580 105, 1600 80"
            stroke={COAT}
            strokeWidth="38"
            fill="none"
            strokeLinecap="round"
         />
         <circle cx="1602" cy="82" r="24" fill={SPOT} />

         {/* Far hind leg — extended back, slightly darker to recede into
              the depth. Bends at a hock (knee) joint roughly halfway. */}
         <path
            d="M 1030 320 C 1100 370, 1190 420, 1290 460 L 1300 480"
            stroke={COAT_DEEP}
            strokeWidth="30"
            fill="none"
            strokeLinecap="round"
         />

         {/* Far front leg — extended forward, also darker for depth. */}
         <path
            d="M 320 330 C 270 360, 195 400, 105 425 L 90 435"
            stroke={COAT_DEEP}
            strokeWidth="26"
            fill="none"
            strokeLinecap="round"
         />

         {/* Main body — single flowing path. Shoulder hump rises into the
              spine arch (peak left of centre), settles into the rump.
              Belly is DEEPLY tucked — that "waist" is what distinguishes
              a sighthound-built cat from a stocky one. */}
         <path
            d="
               M 250 285
               C 280 230 380 215 560 210
               C 720 207 870 215 1000 240
               C 1055 250 1090 270 1095 300
               C 1095 325 1075 340 1030 345
               C 920 355 800 365 700 365
               C 580 365 470 358 400 348
               C 340 340 290 325 270 312
               C 250 300 240 295 250 285
               Z
            "
            fill="url(#cheetah-coat-grad-2)"
         />

         {/* Near front leg — extended forward. Thicker stroke than the
              far leg so the eye reads it as the "front" leg. */}
         <path
            d="M 340 320 C 290 360, 215 400, 125 425 C 110 430 105 442 115 450 C 125 458 145 455 160 448"
            stroke={COAT}
            strokeWidth="32"
            fill="none"
            strokeLinecap="round"
         />

         {/* Second near front leg — slightly behind the first, mid-fold
              under the body (the limbs cycle out of phase mid-stride).
              Short visible "hint" so the eye reads two front legs. */}
         <path
            d="M 380 330 C 380 380, 395 410, 410 440"
            stroke={COAT_DEEP}
            strokeWidth="22"
            fill="none"
            strokeLinecap="round"
         />

         {/* Near hind leg — the powerful one. Extended back, bent at the
              hock so the toes drag forward. The bend is the read of
              "this leg just pushed off". */}
         <path
            d="M 1060 320 C 1130 380, 1220 440, 1330 480 C 1345 486 1352 498 1340 506 C 1328 512 1308 506 1295 498"
            stroke={COAT}
            strokeWidth="36"
            fill="none"
            strokeLinecap="round"
         />

         {/* Second near hind leg — folded forward under the body
              (counter-phase to the extended back leg). */}
         <path
            d="M 1000 330 C 990 370, 985 405, 990 440"
            stroke={COAT_DEEP}
            strokeWidth="24"
            fill="none"
            strokeLinecap="round"
         />

         {/* Neck wedge — fills the gap between head and shoulder so the
              outline doesn't read as a notch. */}
         <path
            d="M 220 270 C 240 250 280 248 310 270 C 290 290 250 295 220 290 Z"
            fill={COAT}
         />

         {/* Head — small ellipse, low and forward. Cheetahs have a
              notably small head for their body size — keep this small. */}
         <ellipse cx="200" cy="252" rx="52" ry="40" fill={COAT} />

         {/* Snout — extends forward, tapers to the nose. */}
         <path
            d="M 162 250 C 110 260 80 274 70 290 C 78 300 100 304 130 300 L 155 280 Z"
            fill={COAT}
         />

         {/* Lower jaw / chin shadow */}
         <path
            d="M 128 296 C 118 306 132 316 152 312 C 168 308 170 302 165 296 Z"
            fill={COAT_DEEP}
         />

         {/* Nose */}
         <circle cx="74" cy="285" r="6" fill={SPOT} />

         {/* Ears — small, pointed, upright. Cheetah ears are notably
              petite for a big cat — keep these tight. */}
         <path d="M 175 222 L 180 192 L 198 220 Z" fill={COAT_DEEP} />
         <path d="M 212 220 L 220 188 L 235 220 Z" fill={COAT_DEEP} />
         {/* Inner-ear hairline */}
         <path
            d="M 184 215 L 188 200"
            stroke={SPOT}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
         />
         <path
            d="M 221 213 L 224 197"
            stroke={SPOT}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
         />

         {/* Eye — small amber dot. */}
         <circle cx="180" cy="248" r="6" fill="url(#cheetah-eye-grad-2)" />
         <circle cx="180" cy="248" r="3" fill={SPOT} />

         {/* Tear stripe — the cheetah signature. Curves from inner eye
              down past the muzzle. */}
         <path
            d="M 174 256 Q 144 274 110 290"
            stroke={SPOT}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
         />

         {/* Coat spots */}
         {SPOTS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={SPOT} />
         ))}

         {/* Mouth line */}
         <path
            d="M 95 295 Q 110 300 132 298"
            stroke={SPOT}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
         />
      </svg>
   );
}
