import type { CSSProperties, Ref } from "react";
import { at, curve, hold, useMotion, useMotionBinding } from "../../src/framework";
import { FONT_SERIF, PALETTE } from "./beats";

// Canonical hero-text reveal — single track per word, opacity 0→1 + y 18→0
// with curve.out(2). No scale, no overshoot (see .claude/skills/hero-text).
// Inline-block spans with literal " " separators so inter-word spacing
// matches a static composition (no flex+gap).
//
// Differs from the dex-demo HeroText only in default typography: this one
// uses the editorial serif (Fraunces) at a heavy weight and tighter
// tracking. Container-level scale flourishes belong on the caller — pass
// `innerRef` to attach a binding to the typography div.

export const HERO_DEFAULT_WORD_GAP = 0.13;
export const HERO_DEFAULT_REVEAL_DUR = 0.55;

const HERO_BASE_CLASSNAME = "text-center";
const HERO_BASE_STYLE: CSSProperties = {
   fontSize: 220,
   lineHeight: 1.02,
   letterSpacing: "-0.035em",
   fontFamily: FONT_SERIF,
   fontWeight: 600,
   color: PALETTE.ink,
};

export type HeroTextProps = {
   words: ReadonlyArray<ReadonlyArray<string>>;
   sceneStart: number;
   firstWord?: number;
   wordGap?: number;
   revealDur?: number;
   className?: string;
   style?: CSSProperties;
   innerRef?: Ref<HTMLDivElement>;
   accentWords?: ReadonlyArray<string>;
};

export function HeroText({
   words,
   sceneStart,
   firstWord = 0,
   wordGap = HERO_DEFAULT_WORD_GAP,
   revealDur = HERO_DEFAULT_REVEAL_DUR,
   className,
   style,
   innerRef,
   accentWords,
}: HeroTextProps) {
   return (
      <div ref={innerRef} className={className ?? HERO_BASE_CLASSNAME} style={{ ...HERO_BASE_STYLE, ...style }}>
         {words.map((line, lineIdx) => (
            <WordLine
               key={lineIdx}
               words={line}
               sceneStart={sceneStart}
               lineIdx={lineIdx}
               allWords={words}
               firstWord={firstWord}
               wordGap={wordGap}
               revealDur={revealDur}
               accentWords={accentWords}
            />
         ))}
      </div>
   );
}

type WordLineProps = {
   words: ReadonlyArray<string>;
   sceneStart: number;
   lineIdx: number;
   allWords: ReadonlyArray<ReadonlyArray<string>>;
   firstWord: number;
   wordGap: number;
   revealDur: number;
   accentWords?: ReadonlyArray<string>;
};

function WordLine({ words, sceneStart, lineIdx, allWords, firstWord, wordGap, revealDur, accentWords }: WordLineProps) {
   const lineStartIndex = allWords.slice(0, lineIdx).reduce((sum, l) => sum + l.length, 0);
   return (
      <div>
         {words.map((word, i) => {
            const flatIndex = lineStartIndex + i;
            const wordStart = firstWord + flatIndex * wordGap;
            const accent = accentWords?.includes(word) ?? false;
            return (
               <RisingWord
                  key={`${word}-${i}`}
                  text={word}
                  sceneStart={sceneStart}
                  startOffset={wordStart}
                  revealDur={revealDur}
                  isLast={i === words.length - 1}
                  accent={accent}
               />
            );
         })}
      </div>
   );
}

type RisingWordProps = {
   text: string;
   sceneStart: number;
   startOffset: number;
   revealDur: number;
   isLast: boolean;
   accent: boolean;
};

function RisingWord({ text, sceneStart, startOffset, revealDur, isLast, accent }: RisingWordProps) {
   const word = useMotionBinding<HTMLSpanElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const start = t + startOffset;

      // First-word special case (offset 0): the explicit hold collides
      // with the t+0 keyframe and the runtime asserts no duplicates.
      const keyframes =
         startOffset > 0
            ? [
                 at(t + 0, { opacity: 0, y: 18 }),
                 hold(start),
                 at(start + revealDur, { opacity: 1, y: 0 }, curve.out(2)),
              ]
            : [at(start, { opacity: 0, y: 18 }), at(start + revealDur, { opacity: 1, y: 0 }, curve.out(2))];

      scene.animate(`word "${text}" fades up`, word, keyframes);
   });

   return (
      <>
         <span
            ref={word.ref}
            style={{
               display: "inline-block",
               color: accent ? PALETTE.amber : "inherit",
               fontStyle: accent ? "italic" : "normal",
            }}
         >
            {text}
         </span>
         {isLast ? null : " "}
      </>
   );
}
