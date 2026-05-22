// 15 · cheetah primer
//
// A ~22s editorial-style explainer: title → speed numbers → anatomy
// callouts → population crash → conservation outro. Every scene runs on
// the same warm-savanna canvas so the bg never flips between cuts
// (motion-design rule 3).
//
// All times below are scene-LOCAL seconds; the parent stage composes
// absolute time as `sceneStart + beat` at the call site.

// ---------------------------------------------------------------------------
// Palette + typography — shared by every scene so the eye reads "one film"
// across all five beats.

export const PALETTE = {
   // Background base / horizon mix (deep umber → russet at the floor).
   bgDeep: "#150E08",
   bgMid: "#241710",
   bgWarm: "#3A2316",
   // Sun / accent — pulled from late-afternoon savanna light.
   amber: "#E89B2C",
   amberDeep: "#C77B1B",
   // Cheetah-coat tints — the "spot" decoration system.
   coat: "#D9A35E",
   coatDeep: "#A06A2C",
   spot: "#1A0E07",
   // Text (warm ivory on a warm dark canvas reads as paper-on-leather).
   ink: "#F2E5C8",
   inkDim: "rgba(242, 229, 200, 0.66)",
   inkFaint: "rgba(242, 229, 200, 0.38)",
   // Hairlines / dividers.
   hairline: "rgba(242, 229, 200, 0.16)",
   hairlineSoft: "rgba(242, 229, 200, 0.08)",
} as const;

// Display serif for hero text; sans for body / numbers. Loaded via the
// `<FontShim />` component which renders a Google-Fonts <link> in the
// document head (React 19 hoists it automatically).
export const FONT_SERIF = '"Fraunces", "Playfair Display", ui-serif, Georgia, "Times New Roman", serif';
export const FONT_SANS =
   '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Loop tail before the timeline restarts.
export const LOOP_DELAY = 1.4;
// Inter-scene gap — zero by construction; each scene's `holdEnd` already
// reserves the fade-down window, so the next scene's fade-in overlaps
// rather than waiting for a beat of empty canvas.
export const SCENE_GAP = 0.0;

// ---------------------------------------------------------------------------
// Title scene — "Built to run." The hero serif lands first, the byline
// fades up a beat later, and a faint sun glow blooms behind the text.

export const TITLE_WORDS = ["Built", "to", "run."] as const;
export const TITLE_FIRST_WORD = 0.18; // tiny warm-up so the sun begins blooming first
export const TITLE_WORD_GAP = 0.14;
export const TITLE_REVEAL_DUR = 0.62; // slightly slower than the 0.42s default — this is THE beat
export const TITLE_SUN_DUR = 1.1;
export const TITLE_BYLINE_DELAY = 0.32;
export const TITLE_BYLINE_DUR = 0.5;

const titleLastWordLand = TITLE_FIRST_WORD + (TITLE_WORDS.length - 1) * TITLE_WORD_GAP + TITLE_REVEAL_DUR;
const titleBylineLand = titleLastWordLand + TITLE_BYLINE_DELAY + TITLE_BYLINE_DUR;
export const TITLE_HOLD = 0.6;
export const TITLE_FADE = 0.42;

export const titleBeats = {
   start: 0,
   lastWordLand: titleLastWordLand,
   bylineLand: titleBylineLand,
   holdEnd: titleBylineLand + TITLE_HOLD,
   end: titleBylineLand + TITLE_HOLD + TITLE_FADE,
} as const;

// ---------------------------------------------------------------------------
// Speed scene — "75 MPH" big numeral counts up from 0; a tachometer-style
// progress arc sweeps in behind it; three stat rows cascade in below.

export const SPEED_COUNT_FROM = 0;
export const SPEED_COUNT_TO = 75;
export const SPEED_EYEBROW_DUR = 0.36;
export const SPEED_NUMBER_DUR = 0.42;
export const SPEED_COUNT_DUR = 1.45;
export const SPEED_ARC_DUR = 1.45; // matches the count so the arc & numeral resolve together
export const SPEED_ARC_DELAY = 0.0;
export const SPEED_UNIT_DELAY = 0.32;
export const SPEED_UNIT_DUR = 0.36;
export const SPEED_CAPTION_DELAY = 0.18;
export const SPEED_CAPTION_DUR = 0.42;
export const SPEED_STAT_FIRST = 0.95;
export const SPEED_STAT_STAGGER = 0.18;
export const SPEED_STAT_DUR = 0.46;
export const SPEED_STAT_COUNT = 3;

const speedCountEnd = SPEED_NUMBER_DUR + SPEED_COUNT_DUR;
const speedLastStatLand = SPEED_STAT_FIRST + (SPEED_STAT_COUNT - 1) * SPEED_STAT_STAGGER + SPEED_STAT_DUR;
export const SPEED_HOLD = 0.65;
export const SPEED_FADE = 0.4;

export const speedBeats = {
   start: 0,
   eyebrowLand: SPEED_EYEBROW_DUR,
   numberLand: SPEED_NUMBER_DUR,
   countEnd: speedCountEnd,
   statsLanded: speedLastStatLand,
   holdEnd: Math.max(speedCountEnd, speedLastStatLand) + SPEED_HOLD,
   end: Math.max(speedCountEnd, speedLastStatLand) + SPEED_HOLD + SPEED_FADE,
} as const;

// Stats grid for the speed scene. Each row's label/value rises in cascade.
export const SPEED_STATS = [
   { value: "3.0s", label: "0 → 60 mph", caption: "faster than a Porsche 911" },
   { value: "23 ft", label: "single stride", caption: "longer than a Mini Cooper" },
   { value: "4 / s", label: "strides per second", caption: "front paws never both touch ground" },
] as const;

// ---------------------------------------------------------------------------
// Anatomy scene — a stylized cheetah silhouette mid-stride, with four
// hand-laid callouts that draw a line + label sequentially. Each label
// names a feature that enables the 75 mph figure from the previous scene.

export const ANATOMY_SILHOUETTE_DUR = 0.85;
export const ANATOMY_HEADLINE_DELAY = 0.12;
export const ANATOMY_HEADLINE_DUR = 0.5;
export const ANATOMY_LABEL_FIRST = 0.85;
export const ANATOMY_LABEL_STAGGER = 0.42;
export const ANATOMY_LABEL_DRAW_DUR = 0.36; // the connector line draw
export const ANATOMY_LABEL_DOT_DUR = 0.22; // the anchor dot pulse
export const ANATOMY_LABEL_FADE_DUR = 0.38; // the label text fade
export const ANATOMY_LABEL_COUNT = 4;

// Each anatomy label. `anchorX/Y` are fractions of the cheetah-
// silhouette viewBox (0..1700, 0..620). `corner` is where the label
// card sits on the canvas — the connector runs from corner toward
// the anchor. Heading + body explain why the feature matters.
export const ANATOMY_LABELS = [
   {
      id: "spine",
      anchorX: 0.33, // spine arch peak (top of dorsal curve)
      anchorY: 0.34,
      corner: "top-left",
      heading: "Flexible spine",
      body: "Bends like a spring — extends each stride to 23 ft.",
   },
   {
      id: "tail",
      anchorX: 0.93, // tail tip
      anchorY: 0.16,
      corner: "top-right",
      heading: "Counterweight tail",
      body: "Steers the body through 70 mph mid-air turns.",
   },
   {
      id: "lungs",
      anchorX: 0.22, // chest / lungs area (just behind shoulder)
      anchorY: 0.55,
      corner: "bottom-left",
      heading: "Oversized heart & lungs",
      body: "Drives the 150 bpm sprint pulse — but only for ~30 s.",
   },
   {
      id: "claws",
      anchorX: 0.79, // extended hind paw tip
      anchorY: 0.78,
      corner: "bottom-right",
      heading: "Semi-retractable claws",
      body: "Stay out — gripping the dirt like soccer cleats.",
   },
] as const;

const anatomyLastLabelStart = ANATOMY_LABEL_FIRST + (ANATOMY_LABEL_COUNT - 1) * ANATOMY_LABEL_STAGGER;
const anatomyLastLabelLand = anatomyLastLabelStart + ANATOMY_LABEL_DRAW_DUR + ANATOMY_LABEL_FADE_DUR;
export const ANATOMY_HOLD = 0.7;
export const ANATOMY_FADE = 0.4;

export const anatomyBeats = {
   start: 0,
   silhouetteLand: ANATOMY_SILHOUETTE_DUR,
   labelsLanded: anatomyLastLabelLand,
   holdEnd: anatomyLastLabelLand + ANATOMY_HOLD,
   end: anatomyLastLabelLand + ANATOMY_HOLD + ANATOMY_FADE,
} as const;

// ---------------------------------------------------------------------------
// Population scene — counts DOWN from 100,000 (the 1900 wild population)
// to 7,100 (today's IUCN figure). A simplified Africa map with the
// remaining range shaded sits beside the number; the range shape shrinks
// during the count.

export const POP_COUNT_FROM = 100_000;
export const POP_COUNT_TO = 7_100;
export const POP_EYEBROW_DUR = 0.36;
export const POP_NUMBER_DUR = 0.42;
export const POP_COUNT_DELAY = 0.12;
export const POP_COUNT_DUR = 1.55;
export const POP_MAP_DUR = 0.6;
export const POP_MAP_DELAY = 0.18;
export const POP_RANGE_DELAY = 0.6; // range shrink begins as the count starts to drop
export const POP_RANGE_DUR = 1.4;
export const POP_CAPTION_DELAY = 0.22;
export const POP_CAPTION_DUR = 0.45;

const popCountEnd = POP_NUMBER_DUR + POP_COUNT_DELAY + POP_COUNT_DUR;
const popCaptionLand = popCountEnd + POP_CAPTION_DELAY + POP_CAPTION_DUR;
export const POP_HOLD = 0.85;
export const POP_FADE = 0.42;

export const popBeats = {
   start: 0,
   numberLand: POP_NUMBER_DUR,
   countEnd: popCountEnd,
   captionLand: popCaptionLand,
   holdEnd: popCaptionLand + POP_HOLD,
   end: popCaptionLand + POP_HOLD + POP_FADE,
} as const;

// ---------------------------------------------------------------------------
// Outro — Cheetah Conservation Fund wordmark + cheetah.org CTA.
// Glyph (spot motif) drops in first, the two wordmark words stagger in,
// then the tagline and URL pill fade up last.

export const OUTRO_GLYPH_ENTRY = 0.2;
export const OUTRO_GLYPH_DUR = 0.6;
export const OUTRO_WORDMARK_FIRST = 0.4;
export const OUTRO_WORDMARK_GAP = 0.14;
export const OUTRO_WORDMARK_DUR = 0.56;
export const OUTRO_WORDMARK_WORDS = ["Save", "the", "cheetah."] as const;
export const OUTRO_TAGLINE_DELAY = 0.18;
export const OUTRO_TAGLINE_DUR = 0.5;
export const OUTRO_URL_DELAY = 0.22;
export const OUTRO_URL_DUR = 0.4;

const outroLastWordLand =
   OUTRO_WORDMARK_FIRST + (OUTRO_WORDMARK_WORDS.length - 1) * OUTRO_WORDMARK_GAP + OUTRO_WORDMARK_DUR;
const outroTaglineLand = outroLastWordLand + OUTRO_TAGLINE_DELAY + OUTRO_TAGLINE_DUR;
const outroUrlLand = outroTaglineLand + OUTRO_URL_DELAY + OUTRO_URL_DUR;
export const OUTRO_HOLD = 1.6;

export const outroBeats = {
   start: 0,
   glyphLand: OUTRO_GLYPH_ENTRY + OUTRO_GLYPH_DUR,
   wordmarkLand: outroLastWordLand,
   taglineLand: outroTaglineLand,
   urlLand: outroUrlLand,
   end: outroUrlLand + OUTRO_HOLD,
} as const;
