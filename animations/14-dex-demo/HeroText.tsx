import { at, curve, hold, useMotion, useMotionBinding } from "../../src/framework";
import type { CSSProperties, Ref } from "react";

// Canonical hero-text reveal for this animation — single track per word,
// opacity 0→1 + y 16→0, power2Out, no scale/overshoot. Inline-block spans
// with literal " " between siblings so inter-word spacing matches a static
// composition (no flex+gap). See .claude/skills/hero-text/SKILL.md for the
// reasoning behind these defaults.
//
// Container-level transforms (scale flourishes, fly-past exits) belong on
// the caller — pass `innerRef` to attach a binding to the typography div.

export const HERO_DEFAULT_WORD_GAP = 0.11;
export const HERO_DEFAULT_REVEAL_DUR = 0.42;

const HERO_BASE_CLASSNAME = "text-center font-light text-black";
const HERO_BASE_STYLE: CSSProperties = {
   fontSize: 144,
   lineHeight: 1.05,
   letterSpacing: "-0.035em",
   fontFamily:
      '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
};

function WordLine({ words, sceneStart, lineIdx, allWords, firstWord, wordGap, revealDur }: WordLineProps) {
   const lineStartIndex = allWords.slice(0, lineIdx).reduce((sum, l) => sum + l.length, 0);

   return (
      <div>
         {words.map((word, i) => {
            const flatIndex = lineStartIndex + i;
            const wordStart = firstWord + flatIndex * wordGap;
            return (
               <RisingWord
                  key={`${word}-${i}`}
                  text={word}
                  sceneStart={sceneStart}
                  startOffset={wordStart}
                  revealDur={revealDur}
                  isLast={i === words.length - 1}
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
};

function RisingWord({ text, sceneStart, startOffset, revealDur, isLast }: RisingWordProps) {
   const word = useMotionBinding<HTMLSpanElement>();

   useMotion((scene) => {
      const t = sceneStart;
      const start = t + startOffset;

      // First-word special case: when startOffset is 0 the explicit hold
      // would collide with the t+0 keyframe (the runtime asserts no
      // duplicate times). Drop the hold and use two keyframes.
      const keyframes =
         startOffset > 0
            ? [
                 at(t + 0, { opacity: 0, y: 16 }),
                 hold(start),
                 at(start + revealDur, { opacity: 1, y: 0 }, curve.out(2)),
              ]
            : [at(start, { opacity: 0, y: 16 }), at(start + revealDur, { opacity: 1, y: 0 }, curve.out(2))];

      scene.animate(`word "${text}" fades up`, word, keyframes);
   });

   return (
      <>
         <span ref={word.ref} style={{ display: "inline-block" }}>
            {text}
         </span>
         {isLast ? null : " "}
      </>
   );
}
