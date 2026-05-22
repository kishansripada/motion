import { COLD_OPEN_HOLD, FIX_PROMPT, FIX_SEC_PER_CHAR, HOLD_BEFORE_SUBMIT, PROMPT, SEC_PER_CHAR } from "./shared";

// All beats below are scene-LOCAL offsets — seconds elapsed since the scene
// they belong to begins. To use them inside motion, write
// `scene.start + chatBeats.reply` (etc.). To compose scenes in
// animation.tsx, write `chatStart + chatBeats.reply + 1.0` to derive the
// next scene's absolute start.

const promptTypeDuration = PROMPT.length * SEC_PER_CHAR;

// ---------- chat scene ----------
const chatSubmit = COLD_OPEN_HOLD + promptTypeDuration + HOLD_BEFORE_SUBMIT;
const chatTest = chatSubmit + 1.1;
const chatClick1 = chatTest + 1.55;
const chatClick2 = chatClick1 + 1.35;
const chatClick3 = chatClick2 + 1.35;
const chatExit = chatClick3 + 1.95;
const chatReply = chatExit + 0.4;

export const chatBeats = {
   start: 0,
   submit: chatSubmit,
   test: chatTest,
   click1: chatClick1,
   click2: chatClick2,
   click3: chatClick3,
   exit: chatExit,
   reply: chatReply,
} as const;

// ---------- checkout failure demo (sub-scene of chat, starts at chatBeats.test) ----------
// All offsets below are relative to demo.start = chatBeats.test.
export const demoBeats = {
   start: 0,
   click1: chatClick1 - chatTest,
   click2: chatClick2 - chatTest,
   click3: chatClick3 - chatTest,
   exit: chatExit - chatTest,
} as const;

// ---------- github scene ----------
// `morphIn` is when the scene begins fading in (immediately, at start).
// `secondComment` is when the second comment slides up.
// `fadeOut` is when the github scene fades out (also when the fix scene begins).
const githubMorphInEnd = 0.7;
const githubSecondComment = 1.65;
const githubFadeOut = githubSecondComment + 5.8;
const githubEnd = githubFadeOut + 0.5;

export const githubBeats = {
   start: 0,
   morphInEnd: githubMorphInEnd,
   secondComment: githubSecondComment,
   fadeOut: githubFadeOut,
   end: githubEnd,
} as const;

// ---------- fix scene ----------
const fixTyping = 0.65;
const fixSubmit = fixTyping + FIX_PROMPT.length * FIX_SEC_PER_CHAR + 0.18;
const fixPatch = fixSubmit + 0.55;
const fixRetest = fixPatch + 2.35;
const fixSuccessClick = fixRetest + 1.58;
const fixEnd = fixSuccessClick + 1.92;

export const fixBeats = {
   start: 0,
   typing: fixTyping,
   submit: fixSubmit,
   patch: fixPatch,
   retest: fixRetest,
   successClick: fixSuccessClick,
   end: fixEnd,
} as const;

// ---------- morph (cross-scene coordinator, lives at root scene = 0) ----------
// The morph beat happens between chat and github. We define the gap between
// chat.reply and the start of github here so animation.tsx can use it both
// to position the github scene and to drive the singleton traveling text.
export const morphCoordination = {
   chatToGithubGap: 1.0,
   dockLocal: 1.25,
   chatFadeDuration: 0.55,
   textTravelDuration: 0.6,
   dockHold: 0.05,
} as const;

export const HOLD_AFTER_REPLY = 1.4;
export const LOOP_DELAY = 0.6;
