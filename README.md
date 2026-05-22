# motion

Scripted product-demo animations authored as React components, with a
declarative timeline and a built-in scrubber. Each animation is a plain
TypeScript module whose default export is a `definePureAnimation(...)`.

## Running

```bash
npm install       # first time only
npm run dev
```

Open the URL Vite prints (defaults to <http://localhost:5174>). Pick an
animation from the dropdown in the top-right.

## How it works (30 second tour)

```
.
├── animations/<id>/
│   └── animation.tsx      # your code — a definePureAnimation() default export
├── src/
│   ├── App.tsx            # React shell: toolbar, iframe, scrubber
│   ├── registry.ts        # list of animations to show in the dropdown
│   ├── framework/
│   │   ├── definePureAnimation.tsx  # Scene + useMotion + the React mount
│   │   ├── pureMotion.ts            # the animation runtime (RAF + pose())
│   │   ├── functionTimeMotion.ts    # at(), pose(), ease, bindings
│   │   ├── elementFlight.ts         # shared-element measure helpers
│   │   ├── ui/                      # Canvas, CameraPlane, camera helpers
│   │   ├── boot.ts                  # runs inside the iframe; wires window
│   │   └── motion.css               # theme + keyframes
│   └── components/        # Toolbar, Stage, Scrubber, TimelineEditor
├── vite-plugin-runner.ts  # serves /run/<id>.html (blank shell + boot)
└── vite.config.ts
```

At runtime:

1. The React shell's `<iframe>` points at `/run/<id>.html`.
2. The Vite runner plugin returns a blank HTML shell and appends
   `<script type="module">import { boot } from ".../boot.ts"; boot("<id>")</script>`.
3. `boot.ts` imports your `animation.tsx`, calls its `mount(document)` to
   render the React tree + start the RAF loop, then exposes
   `window.lfTimeline / lfPause / lfResume / lfReplay / lfProgress / lfSeek`
   for the shell's scrubber and the capture harness.

## Authoring an animation

The model is: a tree of `<Scene>` components, each `useMotion` hook declaring
`scene.animate(description, binding, [keyframes])` tracks. The runtime
samples the keyframes every RAF tick and applies the result with `pose()`.

```tsx
// animations/my-demo/animation.tsx
import {
   Canvas,
   Scene,
   at,
   curve,
   definePureAnimation,
   useMotion,
   useMotionBinding,
} from "../../src/framework";

function HelloCard() {
   const card = useMotionBinding<HTMLDivElement>();

   useMotion((scene) => {
      const t = scene.start;
      scene.animate("hello card fades and lifts in", card, [
         at(t + 0, { opacity: 0, y: 16 }),
         at(t + 0.55, { opacity: 1, y: 0 }, curve.out(2)),
      ]);
   });

   return (
      <div ref={card.ref} className="text-4xl">
         hi there
      </div>
   );
}

function MyDemo() {
   return (
      <Canvas>
         <Scene id="hello" start={0}>
            <HelloCard />
         </Scene>
      </Canvas>
   );
}

export default definePureAnimation({
   name: "my demo",
   frameWidth: 1280,
   component: MyDemo,
   options: { duration: 1.5, loopDelay: 0.6 },
});
```

Then register it in `src/registry.ts`:

```ts
export const animations = [
   { id: "10-autosana-intro", name: "10 · autosana intro", frameWidth: 1440, frameHeight: 900 },
   { id: "my-demo", name: "my demo", frameWidth: 1280, frameHeight: 800 },
];
```

That's it. Vite HMR will reload the iframe when you edit `animation.tsx`.

## The core API

| primitive                                  | what it does                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `definePureAnimation({ component, options })` | Top-level factory. Mounts the React component, runs the RAF loop. Default export of every animation module.                           |
| `<Scene id?="..." start={seconds}>`        | Nestable wrapper that exposes `start` (absolute seconds) to descendants. Children's keyframe times must be `>= scene.start`.              |
| `useStartTime()`                           | Read the absolute start of the nearest enclosing `<Scene>`.                                                                               |
| `useMotionBinding<T>()`                    | Persistent ref binding. Pass `binding.ref` to JSX, `binding.current()` to read the live element.                                          |
| `useMotion((scene) => { ... })`            | Declare animation tracks. The builder runs once after refs mount; `scene.start` is the parent `<Scene>`'s start time. The debug id is auto-derived from the parent `<Scene id>`. |
| `scene.animate(description, bind, [keyframes])` | One animated track. `description` shows up in the timeline UI verbatim — make it a verb phrase.                                       |
| `scene.text(id, bind, (absoluteTime) => string)` | Time-driven text content (typewriters, counters).                                                                                    |
| `scene.effect(id, time, fn)`               | Discrete fire-on-cross-forward callback. Must be idempotent (replayed on seek).                                                           |
| `at(time, state, options?)`                | A single keyframe. `state` is a `MotionStyle`; options can include a `transition` for the segment arriving at this keyframe.              |
| `curve`                                    | Bezier transition helpers: `curve.linear()`, `curve.in(n)`, `curve.out(n)`, `curve.inOut(n)`, `curve.jump()`, `curve.backOut(amount)`.     |
| `useElementAnchor({ target, anchor? })` | Measure a named point on a rendered element; returns `{ x, y, rect }` in viewport coordinates for geometry-derived keyframes.                |
| `useAnchoredPosition({ target, anchor?, hotspot? })` | Return a function that measures an anchor and produces `{ x, y }` for lazy keyframe callbacks. |
| `useElementFlight({ from, to })`           | Measure two layout slots; returns `flight.from()` / `flight.to()` poses to splice into keyframes (shared-text/element transitions).       |
| `bindMotionElement<T>()`                   | Module-scope binding for refs that cross multiple `<Scene>` boundaries (paired with prop-drilling).                                       |

## Authoring tips

- **Keyframes are scrubbable by construction.** Every property is interpolated
  from `pose()`; seek to any time and the visible state is the same.
- **First paint is at t=0 keyframe state.** The host applies the initial
  pose before paint (in `useLayoutEffect`), so don't add
  `style={{ opacity: 0 }}` to bound elements. Inline `style` is for static
  CSS the framework doesn't animate (`perspective`, `borderRadius`).
- **Beats live in a sibling `beats.ts` file.** Keep timing constants out of
  the JSX. `t + chatBeats.submit + 0.04` is more grep-able than `t + 1.85`.
- **Scene-relative times always.** Write `at(t + chatBeats.reply, ...)` not
  `at(2.6, ...)` — moving a scene later only changes the parent `start`.
- **Geometry relationships should be measured.** If a motion target is visually
  relative to another DOM element, use `useElementAnchor()` instead of
  hardcoding x/y coordinates. Raw coordinates are for absolute stage positions,
  offscreen starts, and deliberate art-directed poses.
- **Cross-scene refs at module scope.** Use `bindMotionElement()` directly in
  the animation file when a ref needs to be referenced from multiple
  `<Scene>` subtrees.
- **`scene.effect` callbacks must be idempotent** — they re-fire on backward
  seek so the DOM ends in the right state.

## Debugging

- `frame.contentWindow.lfTimeline` — the current animation handle. You can
  poke at `.progress()`, `.time()`, `.getChildren()` from the DevTools
  console.
- `frame.contentWindow.lfProgress(0.3)` — seek to 30% (also pauses).
- `frame.contentWindow.lfSeek(4.2)` — seek to absolute 4.2s.
- `frame.contentWindow.lfReplay()` — restart the loop.
- **Reload** button in the toolbar blows away the iframe and reboots.

## Frame capture

A headless screenshot of an exact moment:

```bash
npm run capture -- 10-autosana-intro 12.76
npm run capture -- 10-autosana-intro 12.76 --open
```

See `scripts/capture-frame.mjs` and `capture.html` for how the deterministic
seek-then-screenshot pipeline works.

## Inspect (read motion as text)

Print the full scene graph — every track, every keyframe, every ease, all
deltas — plus a velocity-continuity report at the bottom that flags
boundaries where the value's speed step-changes:

```bash
npm run inspect -- 12-panoptive-launch
npm run inspect -- 12-panoptive-launch --scene problem
npm run inspect -- 12-panoptive-launch --track "camera"
npm run inspect -- 12-panoptive-launch --json | jq '.scenes[].animations[] | select(.discontinuities | length > 0)'
```

The inspector boots the animation in headless Chrome, walks
`window.lfTimeline._scenes`, and dumps it as text (or JSON with `--json`).
This is the cheapest way to read what an animation actually does without
scrubbing it. The discontinuity report flags velocity steps over 20% but
doesn't decide whether they're bugs — clicks, button presses, and spring
overshoots all surface here too, intentionally. The point is to be able
to *read* the motion and judge.

See `scripts/inspect-motion.mjs`.
