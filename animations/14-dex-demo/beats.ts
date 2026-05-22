// All cold-open beats are scene-LOCAL — seconds since the cold-open scene
// began. Compose into absolute time at the call site as `sceneStart + beat`.
//
// The cold open is a six-word hook — "still stuck in linkedin DM hell?" — with
// each word fading up one after another. First word fires immediately at
// scene start (no warm-up buffer); the cloud bg gets to be the bg during
// the hold + fade-out tail.

export const COLD_OPEN_WORDS = [
   ["still", "stuck", "in"],
   ["linkedin", "DM", "hell?"],
] as const;

const FLAT_WORDS = COLD_OPEN_WORDS.flat();
export const COLD_OPEN_WORD_COUNT = FLAT_WORDS.length;

export const COLD_OPEN_FIRST_WORD = 0.0;
export const COLD_OPEN_WORD_GAP = 0.11;

// Hero word reveal: single-track fade + lift. opacity 0→1 + y 14→0 with
// power2Out. No scale, no overshoot — a backOut bounce on body/hero copy
// reads as gimmicky (see TitleScene.Word in 12-panoptive-launch). The
// staggered start times across words carry the rhythm; the per-word
// motion just lets each word *arrive*.
export const WORD_REVEAL_DUR = 0.42;

const lastWordStart = COLD_OPEN_FIRST_WORD + (COLD_OPEN_WORD_COUNT - 1) * COLD_OPEN_WORD_GAP;
const lastWordLand = lastWordStart + WORD_REVEAL_DUR;

// Container-level scale flourish that runs concurrent with the word
// reveal: the whole headline grows from 0.86 to 1.0 (the natural size)
// over the duration of the reveal, with a tiny follow-through tail past
// the last word's landing. power5InOut puts the velocity peak in the
// middle of the reveal — when most of the words are appearing — so the
// scale feels "active" through the whole arrival rather than front-loaded
// or back-loaded.
export const HEADLINE_SCALE_FROM = 0.7;
export const HEADLINE_SCALE_END = 0.65;

export const COLD_OPEN_HOLD = 0.0;
export const COLD_OPEN_FADE = 0.08;

export const coldOpenBeats = {
   start: 0,
   firstWord: COLD_OPEN_FIRST_WORD,
   wordGap: COLD_OPEN_WORD_GAP,
   lastWordLand,
   hold: lastWordLand + COLD_OPEN_HOLD,
   end: lastWordLand + COLD_OPEN_HOLD + COLD_OPEN_FADE,
} as const;

export const SCENE_GAP = 0.0;
export const LOOP_DELAY = 1.0;

// ---------------------------------------------------------------------------
// Windows scene — sales-tool homepages popping onto the canvas in their own
// chrome windows. The brief: all of them appear within ~1s, scaling in from
// 0 to full size with a subtle bounce. After landing they keep drifting
// gently (continuous "playful" idle motion). The whole stage is tilted
// back as if the camera is below and right of its look-at point.
//
// Per-window timing inside the entry window:
//   - Stagger between windows: 0.07s start-to-start
//   - Each window's scale-in: 0.42s with backOut(1.6) — explicit case
//     where bounce is correct, see motion-design rule 6 (impact, weight)
//   - Last window finishes at 0.07*(N-1) + 0.42 = ~0.84s for 7 windows
//
// The continuous idle then runs from ~0.85s for the rest of the scene.

export const WINDOWS_STAGGER = 0.07;
export const WINDOWS_SCALE_IN_DUR = 0.42;
export const WINDOWS_COUNT = 7;
const windowsAllLanded = WINDOWS_STAGGER * (WINDOWS_COUNT - 1) + WINDOWS_SCALE_IN_DUR;

// Length the windows scene holds past "all landed" before handing off. The
// idle drift is bounded internally by each window's individual dropStart
// (the cascade of falls starts well before this value), so this number is
// effectively the scene tail — set it tight so the next scene starts the
// moment the last window has fallen off-screen.
export const WINDOWS_IDLE_DUR = 1.59;

export const windowsBeats = {
   start: 0,
   allLanded: windowsAllLanded,
   end: windowsAllLanded + WINDOWS_IDLE_DUR,
} as const;

// ---------------------------------------------------------------------------
// Sales-tools hero text — the answer to the visual punchline of the windows
// scene. Six-word two-line phrase, canonical hero reveal (opacity + y per
// word, power2Out, no bounce — see .claude/skills/hero-text). Once the line
// is read, the entire headline accelerates into the camera with power3In
// scale + a trailing opacity fade so it "passes through" the viewer.

export const SALES_TOOLS_WORDS = [
   ["13", "tools."],
   ["to", "send", "1", "email."],
] as const;

const SALES_TOOLS_FLAT_WORDS = SALES_TOOLS_WORDS.flat();
export const SALES_TOOLS_WORD_COUNT = SALES_TOOLS_FLAT_WORDS.length;

export const SALES_TOOLS_FIRST_WORD = 0.0;
export const SALES_TOOLS_WORD_GAP = 0.11;
export const SALES_TOOLS_REVEAL_DUR = 0.42;

const salesLastWordStart = SALES_TOOLS_FIRST_WORD + (SALES_TOOLS_WORD_COUNT - 1) * SALES_TOOLS_WORD_GAP;
const salesLastWordLand = salesLastWordStart + SALES_TOOLS_REVEAL_DUR;

// Read pause before the fly-past. Tight on purpose — the line is short
// ("13 tools. to send 1 email.") and the user wants the exit to feel
// immediate, not contemplative.
export const SALES_TOOLS_HOLD = 0.45;

// Fly-past tuning. Scale ramps with power3In so the headline is slow to
// start moving (still legible as it begins to grow), then exponential into
// the camera. Opacity holds at 1 for the first part then drops with
// power2In in the trailing window so the text "passes through" rather
// than just shrinking back out.
export const SALES_TOOLS_FLY_DUR = 0.32;
export const SALES_TOOLS_FLY_SCALE = 18;
export const SALES_TOOLS_FADE_FRACTION = 0.62;

const salesFlyStart = salesLastWordLand + SALES_TOOLS_HOLD;

export const salesToolsBeats = {
   start: 0,
   firstWord: SALES_TOOLS_FIRST_WORD,
   wordGap: SALES_TOOLS_WORD_GAP,
   revealDur: SALES_TOOLS_REVEAL_DUR,
   lastWordLand: salesLastWordLand,
   flyStart: salesFlyStart,
   flyDur: SALES_TOOLS_FLY_DUR,
   end: salesFlyStart + SALES_TOOLS_FLY_DUR,
} as const;

// ---------------------------------------------------------------------------
// Product HTML scene — the real Orange Slice motion-designer export enters
// inside the same chrome vocabulary as the sales-tool windows, then the
// camera surveys the product (top-left header → bottom-left prompt). The
// scene ends with a gentle fade-down so the next beat (the agent loop) can
// claim the canvas without a hard cut.
//
// `cameraSettled` is the moment the camera lands at the bottom-left prompt;
// `holdEnd` is when the fade-down begins; `end` is total scene length.

export const PRODUCT_HTML_FADE_DUR = 0.42;

export const productHtmlBeats = {
   start: 0,
   cameraSettled: 2.14,
   holdEnd: 2.78,
   end: 2.78 + PRODUCT_HTML_FADE_DUR,
} as const;

// ---------------------------------------------------------------------------
// Agent loop scene — the demonstration beat. A clean prompt bar materializes
// on the cloud bg, a query types in, the user "sends" it, and three pillar
// cards (FIND · ENRICH · ACTION) drop into a row underneath. Each card has
// its own micro-animation so the viewer reads "one prompt → three things
// happen in parallel" within ~3 seconds of the scene starting.

export const AGENT_PROMPT_TEXT = "find 200 RevOps managers at series-A fintechs, enrich emails, queue lemlist";

export const AGENT_PROMPT_ENTRY = 0.32;
export const AGENT_PROMPT_TYPE_START = 0.42;
export const AGENT_PROMPT_TYPE_DUR = 1.36;
export const AGENT_RETURN_BEAT = AGENT_PROMPT_TYPE_START + AGENT_PROMPT_TYPE_DUR + 0.18;
export const AGENT_PILLAR_FIRST = AGENT_RETURN_BEAT + 0.18;
export const AGENT_PILLAR_STAGGER = 0.22;
export const AGENT_PILLAR_COUNT = 3;
export const AGENT_PILLAR_ENTRY_DUR = 0.5;
export const AGENT_PILLAR_FILL_DUR = 0.8;
export const AGENT_PILLAR_DONE_DELAY = 0.4;

const agentLastPillarStart = AGENT_PILLAR_FIRST + (AGENT_PILLAR_COUNT - 1) * AGENT_PILLAR_STAGGER;
const agentLastPillarFilled = agentLastPillarStart + AGENT_PILLAR_ENTRY_DUR + AGENT_PILLAR_FILL_DUR;

export const AGENT_HOLD = 0.42;
export const AGENT_FADE_DUR = 0.32;

export const agentLoopBeats = {
   start: 0,
   promptEntry: AGENT_PROMPT_ENTRY,
   promptType: AGENT_PROMPT_TYPE_START,
   promptTypeEnd: AGENT_PROMPT_TYPE_START + AGENT_PROMPT_TYPE_DUR,
   returnBeat: AGENT_RETURN_BEAT,
   pillarFirst: AGENT_PILLAR_FIRST,
   pillarStagger: AGENT_PILLAR_STAGGER,
   pillarsDone: agentLastPillarFilled,
   holdEnd: agentLastPillarFilled + AGENT_HOLD,
   end: agentLastPillarFilled + AGENT_HOLD + AGENT_FADE_DUR,
} as const;

// ---------------------------------------------------------------------------
// Slack scene — the "works where you work" beat. A simplified Slack channel
// (#sales-team) where a user @mentions Orange Slice, the bot responds, an
// approval card slides up, the user clicks Approve, and the bot delivers
// results. Every message has its own bind so the cascade is real (not faked
// with css delays — those wouldn't reverse correctly on scrub-back).
//
// All beats are scene-local seconds; absolute time = sceneStart + beat.

export const SLACK_CHROME_ENTRY = 0.0;
export const SLACK_CHROME_DUR = 0.46;

export const SLACK_PROMPT_TYPE_START = 0.36;
export const SLACK_PROMPT_TEXT = "@Orange Slice find 20 series A fintech companies in NYC and get me the CEO's email";
export const SLACK_PROMPT_TYPE_DUR = 1.65;
export const SLACK_PROMPT_LAND = SLACK_PROMPT_TYPE_START + SLACK_PROMPT_TYPE_DUR;

export const SLACK_BOT_ACK_DELAY = 0.32;
export const SLACK_BOT_ACK_DUR = 0.42;
export const SLACK_BOT_ACK_LAND = SLACK_PROMPT_LAND + SLACK_BOT_ACK_DELAY + SLACK_BOT_ACK_DUR;

export const SLACK_APPROVAL_DELAY = 0.28;
export const SLACK_APPROVAL_DUR = 0.5;
export const SLACK_APPROVAL_LAND = SLACK_BOT_ACK_LAND + SLACK_APPROVAL_DELAY + SLACK_APPROVAL_DUR;

export const SLACK_CURSOR_TRAVEL_DELAY = 0.28;
export const SLACK_CURSOR_TRAVEL_DUR = 0.46;
export const SLACK_APPROVE_PRESS = SLACK_APPROVAL_LAND + SLACK_CURSOR_TRAVEL_DELAY + SLACK_CURSOR_TRAVEL_DUR;
export const SLACK_APPROVE_RELEASE = SLACK_APPROVE_PRESS + 0.22;

export const SLACK_RESULT_DELAY = 0.42;
export const SLACK_RESULT_DUR = 0.42;
export const SLACK_RESULT_LAND = SLACK_APPROVE_RELEASE + SLACK_RESULT_DELAY + SLACK_RESULT_DUR;

export const SLACK_HOLD = 0.85;
export const SLACK_FADE_DUR = 0.32;

export const slackBeats = {
   start: 0,
   chromeEnter: SLACK_CHROME_ENTRY,
   chromeLand: SLACK_CHROME_ENTRY + SLACK_CHROME_DUR,
   promptType: SLACK_PROMPT_TYPE_START,
   promptLand: SLACK_PROMPT_LAND,
   botAckLand: SLACK_BOT_ACK_LAND,
   approvalLand: SLACK_APPROVAL_LAND,
   approvePress: SLACK_APPROVE_PRESS,
   approveRelease: SLACK_APPROVE_RELEASE,
   resultLand: SLACK_RESULT_LAND,
   holdEnd: SLACK_RESULT_LAND + SLACK_HOLD,
   end: SLACK_RESULT_LAND + SLACK_HOLD + SLACK_FADE_DUR,
} as const;

// ---------------------------------------------------------------------------
// Speed scene — the "5 minutes from prompt to pipeline" claim. A big
// numeral lands, a circular ring fills 0 → 100% behind it, and 4 status
// pills cascade in below as the ring runs. Short and punchy on purpose:
// this is a callout, not a card grid — the eye should read the number
// in one beat and the proof underneath in the next.

export const SPEED_NUMBER_ENTRY = 0.0;
export const SPEED_NUMBER_DUR = 0.46;
export const SPEED_RING_DELAY = 0.18;
export const SPEED_RING_DUR = 1.65;
export const SPEED_CAPTION_DELAY = 0.18;
export const SPEED_CAPTION_DUR = 0.4;
export const SPEED_PILL_FIRST = SPEED_NUMBER_DUR + 0.16;
export const SPEED_PILL_STAGGER = 0.24;
export const SPEED_PILL_DUR = 0.36;
export const SPEED_PILL_COUNT = 4;
const speedLastPillLand = SPEED_PILL_FIRST + (SPEED_PILL_COUNT - 1) * SPEED_PILL_STAGGER + SPEED_PILL_DUR;
export const SPEED_HOLD = 0.5;
export const SPEED_FADE_DUR = 0.32;

export const speedBeats = {
   start: 0,
   numberLand: SPEED_NUMBER_DUR,
   ringEnd: SPEED_NUMBER_DUR + SPEED_RING_DELAY + SPEED_RING_DUR,
   pillsLanded: speedLastPillLand,
   holdEnd: Math.max(SPEED_NUMBER_DUR + SPEED_RING_DELAY + SPEED_RING_DUR, speedLastPillLand) + SPEED_HOLD,
   end: Math.max(SPEED_NUMBER_DUR + SPEED_RING_DELAY + SPEED_RING_DUR, speedLastPillLand) + SPEED_HOLD + SPEED_FADE_DUR,
} as const;

// ---------------------------------------------------------------------------
// Ecosystem scene — TWO horizontal logo carousels scrolling in opposite
// directions. The motion arc is explicit and shared across both rows so
// the velocity behaviour reads as one coherent motion event:
//
//   accel  (0 → cruiseV)        ECO_ACCEL_DUR   power3In-like curve
//   cruise (linear at cruiseV)  ECO_CRUISE_DUR  constant velocity
//   decel  (cruiseV → 0)        ECO_DECEL_DUR   power3Out-like curve
//
// Boundary velocities are matched at each segment join (see motion-design
// rule 9 — "Author Bezier boundary velocities"). Concretely: at the
// accel→cruise handoff both sides resolve to exactly cruiseV; same at
// cruise→decel. The velocity-continuity inspector verifies this is C¹.

// Domains are the lookup keys for logo.dev. Picked the brand's primary
// site (e.g. apollo.io, not apollo.com) so the CDN returns the right
// mark every time.
export const ECO_CHIPS = [
   { id: "salesforce", label: "Salesforce", domain: "salesforce.com" },
   { id: "hubspot", label: "HubSpot", domain: "hubspot.com" },
   { id: "slack", label: "Slack", domain: "slack.com" },
   { id: "gmail", label: "Gmail", domain: "gmail.com" },
   { id: "lemlist", label: "Lemlist", domain: "lemlist.com" },
   { id: "apollo", label: "Apollo", domain: "apollo.io" },
   { id: "firecrawl", label: "Firecrawl", domain: "firecrawl.dev" },
   { id: "openai", label: "OpenAI", domain: "openai.com" },
   { id: "attio", label: "Attio", domain: "attio.com" },
   { id: "instantly", label: "Instantly", domain: "instantly.ai" },
   { id: "heyreach", label: "HeyReach", domain: "heyreach.io" },
   { id: "linkedin", label: "LinkedIn", domain: "linkedin.com" },
   { id: "hunter", label: "Hunter", domain: "hunter.io" },
   { id: "salesloft", label: "Salesloft", domain: "salesloft.com" },
   { id: "outreach", label: "Outreach", domain: "outreach.io" },
   { id: "clay", label: "Clay", domain: "clay.com" },
] as const;

// Rotation motion for the ring. Phase 1 is the fast spin-up window:
// angular velocity drops linearly from PHASE1_START_VEL → PHASE2_VEL.
// Phase 2 is a slow constant-velocity cruise that holds until the
// hold/fade tail. Velocity is C¹-continuous at the phase boundary
// by construction.
export const ECO_PHASE1_DUR = 0.8;
export const ECO_PHASE2_DUR = 2.6;
export const ECO_PHASE1_START_VEL_DEG = -540; // negative = clockwise; logos at the top move right→left
export const ECO_PHASE2_VEL_DEG = -42;
export const ECO_MOTION_DUR = ECO_PHASE1_DUR + ECO_PHASE2_DUR;

export const ECO_HEADLINE_DUR = 0.5;
export const ECO_CAPTION_DELAY = 0.3;
export const ECO_CAPTION_DUR = 0.4;
export const ECO_HOLD = 0.4;
export const ECO_FADE_DUR = 0.32;

// Returns the ring's total rotation in degrees at scene-local time
// `localT`, integrating the piecewise-linear angular velocity profile.
// Monotonically decreasing (negative slope), C¹-continuous at the
// phase boundary because v_phase1(PHASE1_DUR) = PHASE2_VEL.
export function ecoRotationAt(localT: number): number {
   if (localT <= 0) return 0;
   if (localT <= ECO_PHASE1_DUR) {
      const v0 = ECO_PHASE1_START_VEL_DEG;
      const v1 = ECO_PHASE2_VEL_DEG;
      // v(t) = v0 + (v1 - v0) * (t / phase1Dur)
      // θ(t) = ∫₀ᵗ v dτ = v0·t + (v1 - v0)·t² / (2·phase1Dur)
      return v0 * localT + ((v1 - v0) * localT * localT) / (2 * ECO_PHASE1_DUR);
   }
   const phase1End = ((ECO_PHASE1_START_VEL_DEG + ECO_PHASE2_VEL_DEG) * ECO_PHASE1_DUR) / 2;
   return phase1End + ECO_PHASE2_VEL_DEG * (localT - ECO_PHASE1_DUR);
}

export const ecoBeats = {
   start: 0,
   headlineLand: ECO_HEADLINE_DUR,
   phase1End: ECO_PHASE1_DUR,
   motionEnd: ECO_MOTION_DUR,
   captionLand: ECO_MOTION_DUR + ECO_CAPTION_DELAY + ECO_CAPTION_DUR,
   holdEnd: ECO_MOTION_DUR + ECO_HOLD,
   end: ECO_MOTION_DUR + ECO_HOLD + ECO_FADE_DUR,
} as const;

// ---------------------------------------------------------------------------
// Social proof scene — "trusted by 5,000+ teams" with a few customer-name
// chips arriving in cascade beneath a big number. The number itself counts
// up from a low value to land on the final figure for an "earning it" feel.

// Customer brand list with domains for logo.dev. The names match the
// "Trusted by" strip from orangeslice.ai; domains are best-effort
// matches (some brands share a name — these were chosen to match the
// HQ/canonical site).
export const PROOF_CUSTOMERS = [
   { label: "Oracle", domain: "oracle.com" },
   { label: "Confido Health", domain: "confidohealth.com" },
   { label: "Glass Health", domain: "glass.health" },
   { label: "August", domain: "august.com" },
   { label: "Default", domain: "default.com" },
   { label: "Bloom", domain: "trybloom.com" },
   { label: "Pirros", domain: "pirros.com" },
   { label: "Ramp", domain: "ramp.com" },
] as const;

export const PROOF_NUMBER_ENTRY = 0.18;
export const PROOF_NUMBER_DUR = 0.58;
export const PROOF_NUMBER_HOLD_BEFORE_COUNT = 0.0;
export const PROOF_COUNT_DUR = 1.05;
export const PROOF_COUNT_FROM = 200;
export const PROOF_COUNT_TO = 5000;
export const PROOF_CAPTION_DELAY = 0.12;
export const PROOF_CAPTION_DUR = 0.42;
export const PROOF_CHIP_FIRST = PROOF_NUMBER_ENTRY + PROOF_NUMBER_DUR + 0.16;
export const PROOF_CHIP_STAGGER = 0.07;
export const PROOF_CHIP_DUR = 0.42;
const proofLastChipLand = PROOF_CHIP_FIRST + (PROOF_CUSTOMERS.length - 1) * PROOF_CHIP_STAGGER + PROOF_CHIP_DUR;
export const PROOF_FUNDING_DELAY = 0.22;
export const PROOF_FUNDING_DUR = 0.5;
const proofFundingLand = proofLastChipLand + PROOF_FUNDING_DELAY + PROOF_FUNDING_DUR;

export const PROOF_HOLD = 0.85;
export const PROOF_FADE_DUR = 0.32;

export const proofBeats = {
   start: 0,
   numberEntry: PROOF_NUMBER_ENTRY,
   numberLand: PROOF_NUMBER_ENTRY + PROOF_NUMBER_DUR,
   countStart: PROOF_NUMBER_ENTRY + PROOF_NUMBER_HOLD_BEFORE_COUNT,
   countEnd: PROOF_NUMBER_ENTRY + PROOF_NUMBER_HOLD_BEFORE_COUNT + PROOF_COUNT_DUR,
   chipFirst: PROOF_CHIP_FIRST,
   chipsLanded: proofLastChipLand,
   fundingLand: proofFundingLand,
   holdEnd: proofFundingLand + PROOF_HOLD,
   end: proofFundingLand + PROOF_HOLD + PROOF_FADE_DUR,
} as const;

// ---------------------------------------------------------------------------
// Brand outro — Orange Slice wordmark + tagline on a warmed-up cloud bg.
// Reveal is the canonical hero-text pattern for the wordmark and a single
// fade-up for the tagline. The whole composition scales up subtly through
// the hold so the final frame is visibly "settling in" rather than frozen.

export const OUTRO_LOGO_ENTRY = 0.18;
export const OUTRO_LOGO_DUR = 0.62;
export const OUTRO_WORDMARK_WORDS = ["Orange", "Slice"] as const;
export const OUTRO_WORDMARK_WORD_GAP = 0.12;
export const OUTRO_WORDMARK_REVEAL_DUR = 0.56;
const outroLastWordLand =
   OUTRO_LOGO_ENTRY + (OUTRO_WORDMARK_WORDS.length - 1) * OUTRO_WORDMARK_WORD_GAP + OUTRO_WORDMARK_REVEAL_DUR;
export const OUTRO_TAGLINE_DELAY = 0.16;
export const OUTRO_TAGLINE_DUR = 0.48;
export const OUTRO_URL_DELAY = 0.24;
export const OUTRO_URL_DUR = 0.36;

const outroTaglineLand = outroLastWordLand + OUTRO_TAGLINE_DELAY + OUTRO_TAGLINE_DUR;
const outroUrlLand = outroTaglineLand + OUTRO_URL_DELAY + OUTRO_URL_DUR;
export const OUTRO_HOLD = 1.5;

export const outroBeats = {
   start: 0,
   logoLand: outroLastWordLand,
   taglineLand: outroTaglineLand,
   urlLand: outroUrlLand,
   end: outroUrlLand + OUTRO_HOLD,
} as const;
