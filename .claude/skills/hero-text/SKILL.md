---
name: hero-text
description: "How hero text — headlines, cold-open hooks, title cards, taglines — should reveal on screen in this repo's animation framework. Use when authoring or revising any beat where words land on the canvas as the subject of the moment (cold opens, section titles, taglines, value-prop headlines). Specifies the canonical motion (single-track fade-up), speed envelope (~0.42s per word, ~0.11s stagger, no warm-up buffer), and the layout rules that keep word spacing identical to a static composition."
---

# hero-text

Hero text is the subject of its beat — headlines, cold-open hooks, title
cards, taglines. The viewer is supposed to *read the words*, full stop.
Every motion choice serves that, or it gets cut.

This skill specifies the canonical reveal: what it looks like, how fast
it goes, and how to lay it out so it reads exactly like the static
composition would.

## The motion

**Single track per word. Opacity 0→1 + y 16→0. `curve.out(2)`. No scale.
No overshoot. No bounce.**

```tsx
scene.animate(`word "${text}" fades up`, word, [
   at(t + 0, { opacity: 0, y: 16 }),
   hold(t + start),
   at(t + start + WORD_REVEAL_DUR, { opacity: 1, y: 0 }, curve.out(2)),
]);
```

Each word is an `inline-block` `<span>` with a single motion binding.
Both axes (opacity and y) ride one track because y is the only transform
axis — there is no multi-axis decomposition to do (rule 7 of
[motion-design](../motion-design/SKILL.md) doesn't apply when only one
transform axis moves).

### Why no bounce / no scale

A `backOut` overshoot or scale-pop on a hero word reads as **gimmicky**.
It says "look how I move" instead of "read the word." For UI artefacts
that are meant to *land with weight* — a logomark, a count-up impact
number, a button being pressed — bounce is correct. For body words doing
the talking, the word just needs to **arrive**.

The eye reads:

- `curve.out(2)` fade-up → "the word is here, it was already coming."
- `curve.backOut(...)` scale-pop → "the word did a thing on the way in."

Hero text wants the first reading.

## The speed envelope

Defaults that work across a wide range of headline lengths and font sizes:

| variable               | value  | role |
| ---------------------- | ------ | ---- |
| first-word offset      | `0.0s` | first word fires at scene-start; no warm-up buffer |
| word stagger           | `0.11s`| start-to-start gap between consecutive words |
| per-word reveal        | `0.42s`| opacity / y duration on each word |
| `y` distance           | `16px` | how far below natural slot each word starts |
| curve                  | `curve.out(2)` | transition arriving at the final keyframe |

**Total reveal time** for a phrase of N words is roughly
`(N − 1) × 0.11 + 0.42` seconds. A six-word hook lands by ~0.97s. A
two-word tagline lands by ~0.53s. That's the right pacing for a hero
beat — fast enough to feel decisive, slow enough that the eye can read
each word as it arrives.

### When to deviate

- **Slower (`stagger ≈ 0.16–0.20s`, `reveal ≈ 0.55–0.65s`)**: when the
  hero text *is* the entire beat and you want the reveal to breathe —
  e.g. a brand title-card with no other on-screen action competing.
- **Faster (`stagger ≈ 0.07–0.09s`, `reveal ≈ 0.30–0.36s`)**: when the
  text is a *reaction* to something else on screen and shouldn't hold
  the audience.
- **Add a warm-up buffer (`first-word offset 0.2–0.5s`)** ONLY when the
  scene needs the bg/composition to register *before* text starts to
  arrive. If the bg is already on screen from a prior scene, skip it —
  the buffer reads as dead air.

Don't tune the per-word reveal duration *and* the stagger together
without thinking. The stagger controls **rhythm** (how quickly the next
word follows); the reveal duration controls each word's **weight** (how
emphatically it arrives). They're orthogonal.

## The layout rules

The motion math above only works if word spacing matches what a static
composition would produce. Two non-negotiable layout rules:

### 1. Use natural CSS text flow, not `flex` + `gap`.

Each word goes in an `inline-block` `<span>` with a literal `" "` between
siblings in the JSX. CSS uses the font's actual space character, kerned
by `letter-spacing`, instead of an authored gap value. Tracking and
leading become parent CSS properties — change them and positions
auto-update because the text *is* text.

```tsx
// RIGHT — natural inline layout
<div style={{ fontSize: 132, lineHeight: 1.05, letterSpacing: "-0.035em" }}>
   <RisingWord>still</RisingWord>{" "}
   <RisingWord>stuck</RisingWord>{" "}
   <RisingWord>in</RisingWord>
</div>

// WRONG — flex + gap diverges from static spacing
<div className="flex items-baseline" style={{ gap: "0.34em" }}>
   <RisingWord>still</RisingWord>
   <RisingWord>stuck</RisingWord>
   <RisingWord>in</RisingWord>
</div>
```

The flex+gap version produces inter-word gaps that are wider than the
font's natural space character at hero sizes (often 50–60% wider). It
reads as "double-spaced headline" instead of a tight hero. The
difference is visible at any font size ≥ 80px.

### 2. The wrapper must be `display: inline-block` (or `block`).

Plain `<span>` is `display: inline` by default, and inline elements
**don't honour `transform`**. Set `display: inline-block` explicitly on
the span so the y-translate animation actually translates.

```tsx
<span ref={word.ref} style={{ display: "inline-block" }}>{text}</span>
```

Inline-block is layout-transparent for natural text flow: the wrapper
takes exactly the width of the word, sits on the same baseline as
neighbouring inline content, and breaks at the next space. The only
difference from plain inline is that it accepts transforms.

## Typography defaults

Defaults that pair well with this motion at hero sizes (≥ 80px font),
white-ish or light backgrounds, modern product-demo aesthetic:

```tsx
className="font-medium text-black"
style={{
   fontSize: 132,            // size to taste; subject should fill ~70% of canvas
   lineHeight: 1.05,         // tight, but lines don't kiss
   letterSpacing: "-0.035em",// tight tracking — Inter / system-sans look
   fontFamily: '"Inter", ui-sans-serif, system-ui, ...',
}}
```

Notes:

- **`font-medium` (500)**, not `font-semibold` (600) and not `font-bold`
  (700). Bolder weights at hero size start to feel heavy/promotional;
  medium reads confident without shouting.
- **Tight tracking (`-0.025em` to `-0.04em`)**. Inter and similar modern
  sans serifs are designed with slightly loose default kerning; for
  hero use the eye wants the letters slightly tighter than their UI
  default.
- **`lineHeight: 1.05`** for two-line headlines. Drop to `1.0` only if
  the lines *should* nearly kiss for compositional reasons.

For dark canvases, swap `text-black` for `text-white` and (optionally)
add a faint cyan/accent color span for one keyword. Don't put two
accent colors in the same hero — the eye should land on one focal
word.

## Edge case: first word at scene-start

When the first word's start offset is `0` (no warm-up buffer), the
canonical keyframe pattern collapses two keyframes onto the same
time:

```tsx
at(t + 0, { ... }),    // ← scene start
hold(t + 0),           // ← collides with the above
at(t + 0.42, { ... }),
```

The runtime asserts no duplicate keyframe times, so this throws.
Drop the `hold` for the first word:

```tsx
const keyframes =
   startOffset > 0
      ? [
           at(t + 0, { opacity: 0, y: 16 }),
           hold(t + startOffset),
           at(t + startOffset + WORD_REVEAL_DUR, { opacity: 1, y: 0 }, curve.out(2)),
        ]
      : [
           at(t + 0, { opacity: 0, y: 16 }),
           at(t + WORD_REVEAL_DUR, { opacity: 1, y: 0 }, curve.out(2)),
        ];
```

## Reference implementation

[`animations/14-dex-demo/ColdOpenScene.tsx`](../../../animations/14-dex-demo/ColdOpenScene.tsx)
is the canonical reference: 6-word two-line phrase, all rules above
applied, font-medium / letter-spacing / lineHeight tuned, edge case
handled. Look at `RisingWord` and `WordLine`.

[`animations/12-panoptive-launch/TitleScene.tsx`](../../../animations/12-panoptive-launch/TitleScene.tsx)'s
`Word` component is an earlier draft of the same pattern; it predates
the natural-CSS layout rule (still uses `flex` + `gap: 28`) and uses
`font-medium` with a slightly slower envelope. If you're retrofitting
that scene, applying this skill's layout rules is a clean upgrade.

## Anti-patterns

- **`backOut` / `scale: 0.7→1` on hero copy.** Reads as gimmicky. Save
  it for logomarks, impact numbers, button presses.
- **`flex` + authored `gap` between words.** Inter-word spacing
  diverges from static; visible at hero sizes. Use natural CSS flow.
- **`<span>` without `display: inline-block`.** Transforms silently
  do nothing on inline elements. Always set inline-block on the
  motion-bound span.
- **Warm-up buffer when nothing's there to register.** A 0.5s empty
  canvas before the first word reads as dead air, not anticipation.
  Only buffer when the bg / preceding composition needs that time.
- **All words at full opacity from `t=0`** (forgotten initial keyframe).
  Verify with a capture at `t = 0`: the canvas should be empty (or
  showing only the first word mid-fade).

