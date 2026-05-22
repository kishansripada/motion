import {
   at,
   curve,
   hold,
   useMotion,
   useMotionBinding,
   useStartTime,
   type MotionElementBinding,
} from "../../src/framework";
import {
   PROOF_CAPTION_DELAY,
   PROOF_CAPTION_DUR,
   PROOF_CHIP_DUR,
   PROOF_CHIP_FIRST,
   PROOF_CHIP_STAGGER,
   PROOF_COUNT_DUR,
   PROOF_COUNT_FROM,
   PROOF_COUNT_TO,
   PROOF_CUSTOMERS,
   PROOF_FUNDING_DELAY,
   PROOF_FUNDING_DUR,
   PROOF_NUMBER_DUR,
   PROOF_NUMBER_ENTRY,
   proofBeats,
} from "./beats";
import { logoUrl } from "./logoDev";

type Props = {
   sceneBind: MotionElementBinding<HTMLDivElement>;
};

const ORANGE = "#FF7A1A";
const ORANGE_DEEP = "#E0570A";
const INK = "rgba(20, 24, 32, 0.94)";
const INK_DIM = "rgba(20, 24, 32, 0.58)";
const INK_FAINT = "rgba(20, 24, 32, 0.40)";

const FONT_STACK =
   '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Social-proof beat. Centred composition with two lines of text and a row
// of customer-name chips. The big number ("5,000+") counts up from a low
// value through PROOF_COUNT_DUR so the scene feels "earned" — not a poster
// frame, a tally arriving in real time. Customer chips fan in below.
//
// Bottom row is a faint funding announcement banner ($5.3M seed) — it's
// secondary credibility, so it lands last and stays muted.


export function SocialProofScene({ sceneBind }: Props) {
   const sceneStart = useStartTime();
   const eyebrow = useMotionBinding<HTMLDivElement>();
   const number = useMotionBinding<HTMLDivElement>();
   const counter = useMotionBinding<HTMLSpanElement>();
   const caption = useMotionBinding<HTMLDivElement>();
   const fundingPill = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = sceneStart;

      scene.animate("social proof scene fades in then out", sceneBind, [
         at(t + 0, { opacity: 0 }),
         at(t + 0.18, { opacity: 1 }, curve.out(2)),
         hold(t + proofBeats.holdEnd),
         at(t + proofBeats.end, { opacity: 0 }, curve.inOut(2)),
      ]);

      scene.animate("eyebrow tag rises", eyebrow, [
         at(t + 0, { opacity: 0, y: 10 }),
         at(t + 0.45, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      // The big number itself does a tight scale-up + opacity fade with a
      // slight bounce — this is the "headline number" landing as a beat
      // (motion-design rule 6: bounce for "lands with weight").
      scene.animate("big number lands", number, [
         at(t + 0, { opacity: 0, scale: 0.8, y: 14 }),
         hold(t + PROOF_NUMBER_ENTRY),
         at(t + PROOF_NUMBER_ENTRY + PROOF_NUMBER_DUR, { opacity: 1, scale: 1, y: 0 }, curve.backOut(1.2)),
      ]);

      // The actual counting — `scene.text` is the framework's
      // arbitrary-text-over-time hook (used by `typewrite` under the
      // hood). We get a `times` object with `local` (= absolute - scene.start)
      // and compute the current value of the counter inline.
      scene.text("count up to 5000", counter, (times) => {
         const localT = times.local;
         const startAt = PROOF_NUMBER_ENTRY;
         const endAt = startAt + PROOF_COUNT_DUR;
         if (localT < startAt) return formatCount(PROOF_COUNT_FROM);
         if (localT >= endAt) return formatCount(PROOF_COUNT_TO);
         // power3Out so the counter rapidly accelerates from the start
         // value and decelerates into 5000 — feels like a real tally
         // converging, not a linear scrub.
         const u = (localT - startAt) / (endAt - startAt);
         const eased = 1 - Math.pow(1 - u, 3);
         const current = Math.round(PROOF_COUNT_FROM + (PROOF_COUNT_TO - PROOF_COUNT_FROM) * eased);
         return formatCount(current);
      });

      const captionStart = proofBeats.numberLand + PROOF_CAPTION_DELAY;
      scene.animate("caption fades in", caption, [
         at(t + 0, { opacity: 0, y: 8 }),
         hold(t + captionStart),
         at(t + captionStart + PROOF_CAPTION_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);

      const fundingStart = proofBeats.chipsLanded + PROOF_FUNDING_DELAY;
      scene.animate("funding pill fades up last", fundingPill, [
         at(t + 0, { opacity: 0, y: 6 }),
         hold(t + fundingStart),
         at(t + fundingStart + PROOF_FUNDING_DUR, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={sceneBind.ref} className="absolute inset-0 grid place-items-center">
         <div className="flex flex-col items-center" style={{ width: 1500, fontFamily: FONT_STACK }}>
            <div
               ref={eyebrow.ref}
               className="flex items-center"
               style={{
                  gap: 10,
                  paddingInline: 14,
                  paddingBlock: 6,
                  borderRadius: 999,
                  background: "rgba(255, 122, 26, 0.10)",
                  border: "1px solid rgba(255, 122, 26, 0.20)",
                  color: ORANGE_DEEP,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 32,
               }}
            >
               <span
                  style={{
                     display: "inline-block",
                     width: 6,
                     height: 6,
                     borderRadius: "50%",
                     background: ORANGE,
                     boxShadow: `0 0 0 4px rgba(255,122,26,0.18)`,
                  }}
               />
               trusted by GTM teams worldwide
            </div>

            <div
               ref={number.ref}
               className="flex items-baseline"
               style={{
                  gap: 6,
                  fontSize: 240,
                  fontWeight: 600,
                  letterSpacing: "-0.045em",
                  color: INK,
                  lineHeight: 1,
                  fontFamily: FONT_STACK,
               }}
            >
               <span ref={counter.ref} />
               <span style={{ color: ORANGE_DEEP, fontSize: 180 }}>+</span>
            </div>

            <div
               ref={caption.ref}
               style={{
                  fontSize: 30,
                  color: INK_DIM,
                  marginTop: 22,
                  letterSpacing: "-0.005em",
                  lineHeight: 1.3,
                  textAlign: "center",
                  fontWeight: 400,
               }}
            >
               sales &amp; RevOps teams running outbound on{" "}
               <span style={{ color: INK, fontWeight: 600 }}>Orange Slice</span>
            </div>

            <div
               className="flex flex-wrap items-center justify-center"
               style={{ gap: 14, marginTop: 36, maxWidth: 1200 }}
            >
               {PROOF_CUSTOMERS.map((customer, i) => (
                  <CustomerChip
                     key={customer.label}
                     sceneStart={sceneStart}
                     index={i}
                     name={customer.label}
                     domain={customer.domain}
                  />
               ))}
            </div>

            <div
               ref={fundingPill.ref}
               className="flex items-center"
               style={{
                  marginTop: 36,
                  paddingInline: 22,
                  paddingBlock: 12,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.78)",
                  border: "1px solid rgba(20,24,32,0.10)",
                  boxShadow: "0 16px 36px -18px rgba(28,40,80,0.20)",
                  fontSize: 16,
                  color: INK_DIM,
                  letterSpacing: "0.005em",
                  gap: 14,
                  fontWeight: 500,
               }}
            >
               <span
                  style={{
                     display: "inline-flex",
                     alignItems: "center",
                     gap: 6,
                     paddingInline: 8,
                     paddingBlock: 3,
                     borderRadius: 5,
                     background: "rgba(255, 122, 26, 0.14)",
                     color: ORANGE_DEEP,
                     fontSize: 12,
                     fontWeight: 700,
                     letterSpacing: "0.06em",
                     textTransform: "uppercase",
                  }}
               >
                  news
               </span>
               <span>
                  We raised <b style={{ color: INK }}>$5.3M</b> in seed funding
               </span>
               <span style={{ color: INK_FAINT, fontSize: 18 }}>→</span>
            </div>
         </div>
      </div>
   );
}

function CustomerChip({
   sceneStart,
   index,
   name,
   domain,
}: {
   sceneStart: number;
   index: number;
   name: string;
   domain: string;
}) {
   const chip = useMotionBinding<HTMLDivElement>();
   const chipStart = PROOF_CHIP_FIRST + index * PROOF_CHIP_STAGGER;

   useMotion((scene) => {
      const t = sceneStart;
      scene.animate(`customer chip ${name} drops in`, chip, [
         at(t + 0, { opacity: 0, y: 18, scale: 0.94 }),
         hold(t + chipStart),
         at(t + chipStart + PROOF_CHIP_DUR, { opacity: 1, y: 0, scale: 1 }, curve.backOut(1.3)),
      ]);
   });

   return (
      <div
         ref={chip.ref}
         className="flex items-center"
         style={{
            gap: 12,
            paddingInline: 20,
            paddingBlock: 14,
            background: "rgba(255,255,255,0.94)",
            borderRadius: 12,
            border: "1px solid rgba(20,24,32,0.08)",
            boxShadow: "0 12px 28px -14px rgba(28,40,80,0.18)",
            backdropFilter: "blur(6px)",
         }}
      >
         <span
            style={{
               display: "inline-flex",
               alignItems: "center",
               justifyContent: "center",
               width: 32,
               height: 32,
               borderRadius: 8,
               background: "#ffffff",
               border: "1px solid rgba(20,24,32,0.06)",
               flexShrink: 0,
               overflow: "hidden",
            }}
         >
            <img
               src={logoUrl(domain, { size: 64, retina: true, format: "png" })}
               alt=""
               width={26}
               height={26}
               style={{ width: 26, height: 26, objectFit: "contain", display: "block" }}
               draggable={false}
            />
         </span>
         <span style={{ fontSize: 19, fontWeight: 600, color: INK, letterSpacing: "-0.005em" }}>
            {name}
         </span>
      </div>
   );
}

function formatCount(value: number) {
   if (value < 1000) return String(value);
   const thousands = Math.floor(value / 1000);
   const remainder = value % 1000;
   return `${thousands},${remainder.toString().padStart(3, "0")}`;
}
