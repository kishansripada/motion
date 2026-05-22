// Scene-LOCAL beats. Each scene's authors write `scene.start + xBeats.foo`;
// composition (animation.tsx) chains scene starts using `xBeats.end`.
//
// Pacing target: ~32s total for a LinkedIn-friendly tempo. Beats are tight
// because the audience is scrolling — first 5s have to pay off the watch.

// ---------- problem (cold open) ----------
// Page tower stacks fast, then a "2-4 hrs" pain stat punches over.
const probReportIn = 0.3;
const probPagesStart = 0.7;
const probPagesEnd = 2.1;
const probPainIn = 2.6;
const probPainBeat = 3.7;
const probHold = 4.6;
export const problemBeats = {
   start: 0,
   reportIn: probReportIn,
   pagesStart: probPagesStart,
   pagesEnd: probPagesEnd,
   painIn: probPainIn,
   painBeat: probPainBeat,
   hold: probHold,
   end: probHold + 0.4,
} as const;

// ---------- title ----------
// Two-act brand reveal:
//
//   ACT 1 — lockup forms (0 → ~1.7s)
//     Logo flies in with measured Greptile-style overlapping action: scale
//     and lateral slide start together but use different curves; scale
//     finishes first while the x glide carries energy left into the rest
//     slot. Wordmark reveals letter-by-letter as the lateral follow-through
//     plays.
//       t=0.08  ─ logo opacity 1, descent begins
//       t=0.65  ─ scale reaches rest size (measured: ~0.57s after motion start)
//       t=0.91  ─ x slide finishes (measured: ~0.83s after motion start)
//
//   ACT 2 — value prop takes over (~1.78 → 3.13s)
//     The fully-formed lockup holds for a beat, then compresses (scale on
//     `circOut`, settles at 2.25) AND lifts (y on `power3InOut`, settles
//     at 2.42) — the two axes run on separate wrappers so scale finishes
//     first and y trails by 170ms. That overlapping action keeps the move
//     from reading as a Figma transform-handle drag.
//     Tagline then reveals word-by-word with a subtle pop, two lines
//     stacked. The point of the scene shifts from "this is the company"
//     to "this is what it does", and the staging makes that shift legible.
//
// One ease per axis-segment, transit waypoints share 0-velocity boundaries,
// so the inspector stays clean.
const titleLogoIn = 0.08;
const titleYDescentEnd = 0.62; // y arrives at rest slightly before scale finishes
const titleScaleSettle = 0.65; // scale reaches rest size before the lateral glide finishes
const titleXStart = titleLogoIn; // lateral slide starts with the shrink; its bezier delays visible motion
const titleXEnd = 0.91; // lateral slide finishes after scale has already settled
const titleLetter0 = 0.78; // first letter reveals while the logo finishes its measured x glide
const titleLetterStagger = 0.06;
const titleLetterCount = 9; // "Panoptive"
const titleLetterReveal = 0.5; // each letter takes 0.5s — backOut needs room to overshoot AND settle
const titleLastLetterDone = titleLetter0 + (titleLetterCount - 1) * titleLetterStagger + titleLetterReveal;
// Lockup holds at full size briefly so the brand reads, then compresses
// and lifts. The two axes run on SEPARATE wrappers with different end
// times — overlapping-action decomposition per rule 7 of motion-design
// SKILL.md. Coupling them onto one track makes the move read like a
// Figma transform handle being dragged.
//
//   scale ends at ~2.25 with power3InOut
//   y     ends at ~2.42 with power3InOut
//
// Both eases are `power3InOut` because both segments are SETTLES that
// follow a ~1.8s visible hold (rule 7 anti-pattern: never use `*Out`
// family after a visible hold — it produces an instant 0→MAX velocity
// jolt the eye reads as a "boom"). The 170ms end-time separation is
// what creates the "shrunk, then tucked" perceptual rhythm; the SAME
// curve shape on both axes keeps them feeling like one coherent move
// rather than two unrelated tweens.
const titleLockupHoldEnd = titleLastLetterDone + 0.12; // ~1.80
const titleLockupScaleEnd = titleLockupHoldEnd + 0.45; // ~2.25 — scale finishes first
const titleLockupLiftEnd = titleLockupHoldEnd + 0.62; // ~2.42 — y trails by 170ms
// Words start revealing while the lockup is still settling into its smaller
// upper slot — overlapping action keeps the scene feeling alive instead of
// strict-sequential.
const titleWord0 = titleLockupHoldEnd + 0.32; // ~2.12
const titleWordStagger = 0.11;
const titleWordCount = 6; // "Run / and / defend / clinical / trial / oversight"
const titleWordReveal = 0.46; // duration of each word's pop
const titleLastWordDone = titleWord0 + (titleWordCount - 1) * titleWordStagger + titleWordReveal;
// = 2.12 + 0.55 + 0.46 = 3.13
const titleHold = titleLastWordDone + 1.55; // hold so the value prop reads
export const titleBeats = {
   start: 0,
   logoIn: titleLogoIn,
   yDescentEnd: titleYDescentEnd,
   scaleSettle: titleScaleSettle,
   xStart: titleXStart,
   xEnd: titleXEnd,
   letter0: titleLetter0,
   letterStagger: titleLetterStagger,
   letterCount: titleLetterCount,
   letterReveal: titleLetterReveal,
   lockupHoldEnd: titleLockupHoldEnd,
   lockupScaleEnd: titleLockupScaleEnd,
   lockupLiftEnd: titleLockupLiftEnd,
   word0: titleWord0,
   wordStagger: titleWordStagger,
   wordCount: titleWordCount,
   wordReveal: titleWordReveal,
   hold: titleHold,
   end: titleHold + 0.4,
} as const;

// ---------- signals (report → extracted findings) ----------
// Document fades in, scan line sweeps top-to-bottom, three signal chips fly
// out as the scan crosses their pages.
const sigDocIn = 0.3;
const sigScanStart = 0.95;
const sigScanEnd = 4.1;
// Signal chips appear at moments the scan crosses each page (14, 31, 56 of 73).
// We map page → fraction of scan duration so the timing reads as "real".
const sigChip0 = sigScanStart + (sigScanEnd - sigScanStart) * 0.22;
const sigChip1 = sigScanStart + (sigScanEnd - sigScanStart) * 0.5;
const sigChip2 = sigScanStart + (sigScanEnd - sigScanStart) * 0.8;
const sigHold = sigScanEnd + 1.4;
export const signalsBeats = {
   start: 0,
   docIn: sigDocIn,
   scanStart: sigScanStart,
   scanEnd: sigScanEnd,
   chip0: sigChip0,
   chip1: sigChip1,
   chip2: sigChip2,
   hold: sigHold,
   end: sigHold + 0.4,
} as const;

// ---------- decision (auto-drafted record) ----------
// A decision card autofills field-by-field with a "47s" timer ticking in the
// corner — payoff for the previous beat.
const decCardIn = 0.3;
const decClassifyIn = 0.95;
const decRationaleStart = 1.55;
const decRationaleEnd = 4.0;
const decCite0 = 4.1;
const decCite1 = 4.35;
const decCite2 = 4.6;
const decActionIn = 5.05;
const decTimerStart = 0.9;
const decTimerStop = 5.1;
const decHold = 6.4;
export const decisionBeats = {
   start: 0,
   cardIn: decCardIn,
   classifyIn: decClassifyIn,
   rationaleStart: decRationaleStart,
   rationaleEnd: decRationaleEnd,
   cite0: decCite0,
   cite1: decCite1,
   cite2: decCite2,
   actionIn: decActionIn,
   timerStart: decTimerStart,
   timerStop: decTimerStop,
   hold: decHold,
   end: decHold + 0.4,
} as const;

// ---------- loop (the Panoptive Loop) ----------
// Four nodes light up in sequence, then a curved arrow ties #4 → #1 to
// announce "this loops continuously".
const loopHeadlineIn = 0.3;
const loopNode0 = 0.85;
const loopNode1 = 1.45;
const loopNode2 = 2.05;
const loopNode3 = 2.65;
const loopArc = 3.4;
const loopSubline = 4.05;
const loopHold = 5.1;
export const loopBeats = {
   start: 0,
   headlineIn: loopHeadlineIn,
   node0: loopNode0,
   node1: loopNode1,
   node2: loopNode2,
   node3: loopNode3,
   arc: loopArc,
   subline: loopSubline,
   hold: loopHold,
   end: loopHold + 0.4,
} as const;

// ---------- outro (stats + CTA) ----------
// Payoff line lands first (the seller), three numeric receipts back it up,
// URL chip closes. Audience reads top-down: claim → proof → CTA.
const outroPayoff = 0.5;
const outroStat0 = 1.4;
const outroStat1 = 1.7;
const outroStat2 = 2.0;
const outroUrl = 2.55;
const outroHold = 4.5;
export const outroBeats = {
   start: 0,
   stat0: outroStat0,
   stat1: outroStat1,
   stat2: outroStat2,
   payoff: outroPayoff,
   url: outroUrl,
   hold: outroHold,
   end: outroHold + 0.5,
} as const;

// Hard-cut between scenes; each scene fades itself in/out, so a 0 gap keeps
// the cadence punchy.
export const SCENE_GAP = 0.0;
export const LOOP_DELAY = 1.2;
