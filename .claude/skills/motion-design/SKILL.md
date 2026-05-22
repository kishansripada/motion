---
name: motion-design
description: "Principles for designing motion graphics in this repo's animation framework. Use when authoring or revising any animation — JSX layout, GSAP timeline, scene composition. The goal is communicating to the viewer as fast and efficiently as possible, beautifully — not making faithful UI clones."
---

# motion-design

Author and revise animations against these principles. They are NOT optional —
breaking them produces the kind of motion design that fails its job: small
floating cards, empty black space, replica UIs that don't communicate
anything quickly.

## The job of motion design

> Communicate one specific thing to the viewer as fast and as efficiently as
> possible, in a beautiful way.

Everything below is a consequence of that sentence. When in doubt, ask: "what
is the *single* thing this beat is supposed to communicate, and would a viewer
understand it from a 1-second still frame?"

## Hard rules

### 1. Don't replicate UIs. Simulate them.

When a beat shows "this happened in app X" (a phone, a GitHub PR, a Stripe
dashboard), you are not building app X. You are building the visual
*shorthand* for app X — only the bare minimum chrome the eye needs to read
"this is X". Skip:

- Sidebars that don't carry the message.
- Top nav bars / breadcrumbs / tabs that aren't actively saying something.
- Login chrome, search bars, profile menus.
- Faithful logos, faithful colors, faithful padding.
- Status bars, footers, "Add a comment" composers when no comment is being
  added.
- Anything you'd describe as "for visual context".

If the chrome isn't the subject of the beat, it's a distraction. Drop it.
Keep one or two unmistakable signals (a GitHub octocat + a PR title bar is
already enough to say "GitHub PR").

### 2. Fill the canvas.

Animations live in a fixed-size frame (typically 1440×900). Empty bg around a
small element reads as "incomplete layout". The subject of the beat should
dominate the screen.

- Center the subject and let it be **big** — comment cards, phones,
  spreadsheets should occupy ~60–90% of the canvas height when they're the
  focus.
- Don't constrain critical content with `max-w-[860px]` if the canvas is
  1440 wide. Use the whole viewport, or a deliberately oversized variant.
- If you're scaling a real UI down to fit, you're probably wasting space on
  chrome that should have been cut (rule 1).

### 3. Keep the palette continuous across scene swaps.

When the scene changes (chat → GitHub, spreadsheet → phone), the *background*
should not flip color. Color flips read as cuts. They're the opposite of
"smooth motion design".

- Default to one base canvas color across all scenes (usually black for this
  framework). Surface elements get faint white/X% backgrounds — never solid
  light cards on a black canvas unless the *thing being communicated* is
  "this is bright/light".
- If you must transition theme (dark → light), do it on its own beat as the
  message ("we are now in app X"), not as a side-effect of switching scenes.

### 4. One subject per beat.

Each beat communicates exactly one thing. If you can't say it in five words
("the agent posts a PR comment"), the beat is doing too much. Split it.

When you find yourself adding a sidebar, a Reviewers section, a code-diff
preview alongside the message, ask: is this the subject? If not, cut it.

### 5. Type sizes that read at a glance.

Body text in a "subject" element should be **comfortably readable** in a
small preview window. Defaults that work at 1440×900:

- Hero/subject body text: 18–22px.
- Secondary metadata (author name, timestamps, badges): 12–14px.
- Tertiary chrome (tab labels, repo path, commit hash): 11–13px.

If a viewer would have to lean in to read the subject text, the type is too
small.

### 6. Motion that reinforces meaning.

The *physics* of the motion should match the message. A morph from "chat
reply" to "PR comment" is "this got posted somewhere new" — that wants:

- Page chrome of the destination arriving first (so the viewer reads
  "destination") — `curve.inOut(2)`, ~0.5–0.6s.
- The subject (text, card) traveling into it — a strong in/out curve is a
  good read of "deliberate placement"; `curve.backOut(1.2–1.4)` is good
  for "lands with weight".
- The destination's container materializing *around* the arriving subject,
  not before it — that sells "being added now", not "already there".

Avoid same-duration cross-fades for everything; they read as a UI swap, not
as motion.

### 7. Decompose multi-axis motion across wrappers.

When a single beat animates more than one transform axis (scale + y, x +
opacity, rotation + scale), put each axis on its own nested wrapper div
with its own track, and **stagger the end times** by 80–250ms. The
staggered end times are the primary signal — that's what the eye reads
as decomposed motion. Same curve family on every axis is fine; per-axis
Bezier handles are an optional stylistic choice, not a requirement.

Couple axes onto one track only when they're conceptually one motion
(e.g. a card sliding diagonally where x and y must move together to
draw the path). For "shrink and reposition", "fly in and rotate",
"land and fade" — never couple.

**Why coupling looks bad.** One curve across multiple axes makes every
axis peak velocity at the same instant; the trajectory through
state-space is a straight line; the eye reads ONE event —
indistinguishable from a Figma transform handle being dragged.
Disney's *overlapping action* principle, applied to the axes of a
single transform: stagger the end times and the viewer parses *N
causally-connected sub-events* instead of one combined morph.

**The mechanical pattern.** Nested wrappers, OUTER → INNER, one binding
per axis. Keep scale **innermost** so it doesn't multiply parent
translates and turn canvas px into scaled px:

```tsx
const x     = useMotionBinding<HTMLDivElement>(); // outermost
const y     = useMotionBinding<HTMLDivElement>(); // middle
const scale = useMotionBinding<HTMLDivElement>(); // innermost

<div ref={x.ref}>
   <div ref={y.ref}>
      <div ref={scale.ref}>{/* content */}</div>
   </div>
</div>
```

`scene.animate(...)` once per axis. Each track writes ONLY its own
property; the others fall through to identity (`x:0, y:0, scale:1`).

**Stagger heuristic.** End times 80–250ms apart. The trailing axis is
the follow-through. If all axes end within 30ms of each other you've
effectively coupled them again, even with separate tracks.

**Failure-mode signature.** A multi-axis tween that "looks like a Figma
transform handle being dragged" — split the rig and stagger the end
times.

### 8. Share named timing anchors across dependent tracks.

When two or more tracks must meet at the same perceptual event, that event
must have **one named time**. Do not encode the same moment as separate
magic numbers in different components or files.

The source of truth should be the invariant the viewer cares about:

- A text flight docks into a measured slot.
- A camera is allowed to start moving only after that dock.
- A placeholder appears exactly when the traveling element hides.
- A reveal, impact, click, or exit must line up across several wrappers.

Name that event (`dockLocal`, `impactTime`, `revealAt`, `exitAt`) and derive
starts, ends, and holds from it. Changing duration should move the start or
end that is *not* the invariant.

```
// RIGHT — dock is the invariant; faster flight starts later but lands there.
const dockTime = githubStart + morph.dockLocal;
const morphEnd = dockTime - morph.dockHold;
const morphStart = morphEnd - morph.textTravelDuration;

scene.animate("text flies into slot", text, [
  at(scene.start, from({ opacity: 0 })),
  hold(morphStart),
  at(morphEnd, to({ opacity: 1 }), curve.inOut(2)),
  at(dockTime, to({ opacity: 0 }), curve.jump()),
]);

scene.animate("destination camera holds until dock", camera, [
  at(t + 0, DEFAULT_POSE),
  hold(t + morph.dockLocal),
  at(t + morph.dockLocal + 0.85, CLOSE_POSE, curve.inOut(2)),
]);

// WRONG — the same dock moment is implicit in multiple unrelated numbers.
const morphStart = githubStart + 0.05;
const morphEnd = morphStart + textTravelDuration;
const dockTime = morphEnd + 0.05;
hold(t + 1.26); // "same" moment, but now it can drift
```

**Failure-mode signature.** You change one duration to make motion faster
and a different element starts early, docks late, or measures the wrong
target. The fix is not a bigger framework abstraction; first, name the
shared beat and make every dependent track reference it.

### 9. Author Bezier boundary velocities — don't hide stops in curve names.

> Rule 7 (above) covers the orthogonal concern of *multiple axes inside a
> single segment*. Rule 8 covers shared timing ownership across tracks.
> This rule covers *one axis through multiple waypoints*.
> Both apply simultaneously to most non-trivial motion.

> **Tool first**: `npm run inspect -- <id>` prints the entire animation
> as text (every keyframe, every Bezier handle, every delta) and ends with a
> velocity-continuity report. Run it before, during, and after any
> non-trivial timeline change. The discontinuity report flags every
> velocity step it can find; *you* judge which are intentional snaps and
> which are bugs. The rest of this rule explains how the math behind
> that report works so the output is readable.

The framework's convention: `at(time, state, options)` stores the
**transition arriving at that keyframe**. A segment from keyframe A to
keyframe B is owned by B's `transition`; there is no competing `A.out`.
The helper `curve.out(2)`, `curve.inOut(3)`, etc. is sugar for
`transition.start` and `transition.end` on the segment arriving at B.

The primitive values:

- `speed`: boundary velocity as a multiple of the segment's average speed.
  `0` stops, `1` is linear, `2–5` are hard accelerations/decelerations.
- `velocity`: absolute value/second velocity when the actual slope matters.
- `influence`: Bezier handle length as a fraction of segment duration.

Examples:

```
// start and end the incoming segment at rest
at(tB, B, { transition: { start: { speed: 0 }, end: { speed: 0 } } })

// slow pass-through at B
at(tB, B, { transition: { start: { speed: 0.25 }, end: { speed: 0.25 } } })

// old-style hard acceleration into B, then stop
at(tB, B, { transition: { start: { speed: 3 }, end: { speed: 0 } } })

// transition preset arriving at B
at(tB, B, curve.out(2))
```

#### The first segment of a track is a special case

A track's first non-hold segment doesn't have a preceding tween segment
to be continuous with — but the *viewer* might. The question is whether
the element was visually at rest before the segment fires:

- **Held visible** (continuation from rest): the element has been
  sitting on screen at velocity 0 — typically a `hold(...)`. The new
  transition must start at velocity 0 too, or the eye sees a perceptual
  jolt. Use `curve.in(...)` / `curve.inOut(...)`, or an explicit
  `transition.start: { speed: 0 }`; do not use `curve.out(...)`
  immediately after a visible hold unless the jolt is the intended impact.
- **First-visible entry**: the element was held at opacity 0,
  off-screen, or unmounted before the segment. The viewer has no prior
  frame to be discontinuous with — non-zero start velocity reads as
  "the thing arrived with weight". `curve.out(...)` and `curve.backOut(...)`
  are good here.

This is Disney's 5th principle (**Slow In and Slow Out**) on a
velocity-boundary basis: natural motion both starts AND ends slow unless
the scene gives the viewer a reason for impact.

**Anti-pattern: fast out after a visible hold.** A track that holds a
visible state and then settles to a new state with `curve.out(...)`
starts with non-zero velocity. Diagnostic: the settle "booms" or "hits"
when nothing else in the scene has any reason to suddenly accelerate.

```
// WRONG — fast outgoing velocity after visible rest
at(t + 0,    { scale: 1 }),
at(t + 1.80, { scale: 1 }),                       // hold
at(t + 2.25, { scale: 0.6 }, curve.out(4)),       // boom

// RIGHT — zero velocity at both boundaries
at(t + 0,    { scale: 1 }),
at(t + 1.80, { scale: 1 }),                       // hold
at(t + 2.25, { scale: 0.6 }, curve.inOut(3)),     // smooth
```

**Per-axis curve quick-reference**, indexed on boundary condition
(not on the property type):

| axis      | continuation from rest          | first-visible entry           |
| --------- | ------------------------------- | ----------------------------- |
| scale     | `curve.inOut(3)`, `{ transition: { start: { speed: 0 } } }` | `curve.backOut(1.2)`, `curve.out(3)` |
| translate | `curve.inOut(2)`                          | `curve.out(2)`, `curve.out(3)`       |
| rotation  | `curve.inOut(3)`                          | `curve.out(2)`                       |
| opacity   | `curve.inOut(2)`                          | `curve.out(2)`                       |

Velocity is continuous across an intermediate keyframe K only if the
transition ending at K and the next transition starting after K resolve
to the same velocity **on every animated axis**. With hand-authored 3D
camera poses the per-axis average speeds often differ, so explicit
pass-through transition handles are safer than stitching unrelated
presets.

This leaves three reliable patterns:

- **Destination / brake-and-go.** The waypoint is a beat the viewer should
  read. Give it zero incoming and outgoing velocity.

  ```
  at(t + 0,   FLAT),
  at(t + 1.5, DOLLY_L, { transition: { start: { speed: 0 }, end: { speed: 0 } } }),
  at(t + 3.0, DOLLY_R, { transition: { start: { speed: 0 }, end: { speed: 0 } } }),
  at(t + 4.5, SETTLE,  { transition: { end: { speed: 0 } } }),
  ```

- **Timed transit.** The waypoint must be hit at a fixed time but should
  not stop. Match the incoming and outgoing speeds.

  ```
  at(t + 0.30, CAMERA_HEAD_ON),
  at(t + 1.08, CAMERA_TOP_LEFT, {
    transition: { end: { speed: 0.25 } },
  }),
  at(t + 1.96, CAMERA_BOTTOM_LEFT, {
    transition: { start: { speed: 0.25 } },
  }),
  ```

- **Auto pass-through.** Let the runtime infer a continuous tangent from
  neighboring values, clamped to zero at flats/reversals.

  ```
  at(t + 0.30, CAMERA_HEAD_ON),
  at(t + 1.08, CAMERA_TOP_LEFT, curve.auto()),
  at(t + 1.96, CAMERA_BOTTOM_LEFT),
  ```

Decision tree:

- If the viewer should read this as a destination, use zero
  `transition.start` / `transition.end` velocity handles.
- If time is fixed and only velocity should smooth through, match the
  previous transition's `end` handle with the next transition's `start`
  handle or use `curve.auto()`.
- If the camera needs to travel through multiple spatial waypoints without
  treating every waypoint as a timed beat, use `scene.follow(...)` with
  `xyTrack(...)`, `xyzTrack(...)`, or the camera track helpers.

NEVER use generic AI-generated aesthetics like cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

IMPORTANT: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

### 9. Bake the principle into JSX layout, not just timeline tweens.

Half of motion design is the static composition that the timeline reveals.
A great tween on a poorly-composed scene still reads as bad motion. Before
you write GSAP, audit:

- Does the layout fill the canvas?
- Is the subject visually dominant (size, contrast, position)?
- Has every non-subject element earned its space?

## When applying to this repo

- **Inspect before you fiddle.** `npm run inspect -- <id>` dumps the entire
  scene graph as text. Use it to (1) verify the timeline matches your
  intent before you start adjusting, (2) read what the discontinuity
  report flags after a change, and (3) compare two states by saving the
  output and diffing. It's faster than scrubbing for any timing question.
  `--scene <id>` filters to one top-level scene; `--track <substr>` to
  one track; `--json` for `jq` pipelines.
- **Capture before you debate composition.** `npm run capture -- <id> <t>`
  for a still at exact time `t`. Use it for layout questions (does the
  beat read in 1 second?) where motion isn't the subject.
- **Use Tailwind's full canvas.** `<Canvas>` is `h-full w-full` by default.
  Do NOT wrap the subject in `max-w-[860px] mx-auto` "for safety" — that's a
  web-page habit, not a motion habit. Pick a width that lets the subject
  dominate.
- **Use the framework tokens.** `bg-motion-canvas`, `text-motion-foreground`,
  `border-motion-border-soft`, etc. They keep palette continuity (rule 3).
- **Keep scene swaps tween-driven, not class-driven.** All visible state
  must be reachable by reverse-interpolating the timeline (the framework
  rebuilds loop iterations on backward seek, but bidirectional tween state
  is still the gold standard).
- **Audit each scene before timing it.** Open a frame at peak-of-beat and
  ask: would a stranger looking at this still frame for one second
  understand what the animation is saying? If not, fix the layout, not the
  curve.
- **Don't mirror keyframe state in JSX.** The framework applies the t=0
  keyframe before first paint, so `<div ref={x.ref}>` is enough — never
  add `style={{ opacity: 0 }}` "to prevent FOUC". Inline `style` is for
  static CSS the framework doesn't animate (`perspective`, `borderRadius`,
  `boxShadow`).

## Anti-examples we keep producing

- A 600px comment card centered in a 1440 viewport, surrounded by black,
  with a sidebar that says "No reviews / No assignees / None yet". The
  subject is the bug-finding *text*, not the absence of reviewers.
- A 14px GitHub-style font in a card that fills 30% of the screen, when the
  same beat could use 22px in a card filling 70% of the screen.
- A solid white GitHub PR view fading in over an Autosana black canvas, so
  the bg flips white→black between cuts.
- A scene with a phone in the middle, a chat composer at the bottom, AND a
  sent message in the corner, all visible at once. Three subjects, one
  beat — pick one.

When a reviewer looks at a beat and thinks "what is this?", it is almost
always because one of these rules was broken. Re-read this skill and fix
the composition first; the timeline is usually fine.
