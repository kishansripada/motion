---
name: motion-capture
description: "Capture deterministic, high-res screenshots of a motion animation at specified timeline times. Use when authoring or revising any animation under animations/ — every meaningful edit should be followed by a capture of the frames that prove it does what you think it does. Returns one PNG per timestamp plus a labelled contact sheet, and prints a velocity-discontinuity report. Pixel + math evidence in one command, no manual scrubbing."
---

# motion-capture

Boot the animation in headless Chrome, seek to one or many timeline times,
screenshot each, stitch them into a labelled contact sheet, and print the
velocity-discontinuity report — all from a single command.

## When to use

Use this skill **after every edit that touches motion**. The framework's
fast feedback loop is:

```
edit → capture frames you think prove the edit → look at the sheet
```

If you're tempted to stop at "the code compiled, ship it", you will miss
the bugs the type system can't catch — element off-path, wrong opacity at
the wrong beat, layout collapse at peak, two elements colliding mid-flight.
A capture takes ~5 seconds. Run it.

Specifically:

- Someone asks what an animation "looks like at N seconds".
- You authored / revised any beat and want to verify it before claiming done.
- You're debugging a missing/wrong/flashing element and need pixel evidence.
- You want to compare candidate animations side-by-side.
- You want a 1:1 sanity check that the velocity inspector is happy.

Do **not** use this skill for:

- Full-motion playback review (use the dev shell timeline editor — captures
  show stills, not vibes/pacing).
- Production export (this is a dev harness, not a renderer).

## The mindset: be aggressive about specifying frames

The capture tool will happily render one frame, ten frames, or a sweep.
The bug-catching power comes from **you choosing the right frames for what
you just built**. Hold-frames are not enough. Defaults are not enough.
After you write a beat, stop and ask:

> If this motion is broken in some way I haven't anticipated, which
> timestamp would expose the bug?

Examples (illustrative, not exhaustive):

- You wrote an entry animation (anything fading/lifting in). Capture the
  moment **just after entry completes** — that's where layout collapse
  and overlap bugs show up. One frame is usually enough.
- You wrote a sequence (chips popping in one after another). Capture
  **once during the stagger** and **once after all chips have landed** —
  the stagger frame proves the timing, the landed frame proves the final
  composition.
- You wrote anything that *moves through space* (a scan line, a card
  flying between slots, a packet dot, a camera dolly). Hold-frames will
  not catch path bugs. Capture **at least 4 frames spread across the
  motion's duration** — `--scene <id> --every <s>` is the easy path.
- You wrote a typewriter or counter. Capture **mid-type** and **at the
  final value** — the framework's typewrite is reliable but the start /
  end times may not be where you think.
- You changed the timing of one beat. Capture the **whole scene** as a
  sweep — re-timing one beat often desynchronises adjacent beats and
  the contact sheet shows that instantly.
- You changed the layout of a card. Capture **at hold** — that's the
  poster frame for that beat, where layout bugs are most obvious.

When in doubt, capture more frames. A 12-frame sweep takes ~8 seconds
and the contact sheet fits in one screen.

## Procedure

### 0. Make sure the dev server is running

The capture tool talks to `http://localhost:5174` (override with
`MOTION_ORIGIN=...` if needed).

```bash
npm run dev
```

Wait for `Local: http://localhost:5174/` before continuing. (Check the
terminals folder first; a server is often already running.)

### 1. Run capture in the form you need

#### Single frame (legacy form preserved)

```bash
npm run capture -- 12-panoptive-launch 7.0
# → .captures/12-panoptive-launch-7.00.png
# → inspector summary
```

#### Multiple specific timestamps → contact sheet

```bash
npm run capture -- 12-panoptive-launch 3.7 7.0 11.5 19.5 25.0 29.5
# → .captures/12-panoptive-launch-<t>.png × 6
# → .captures/12-panoptive-launch-sheet.png  ← labelled grid
# → inspector summary
```

The contact sheet lays out frames in a grid with their timestamps
labelled below each cell. Black canvas, half-scale thumbs (720×450 from
a 1440×900 native), readable at a glance.

#### Sweep within a top-level scene (auto-derives [start, end])

```bash
# Step-based — capture every 0.4s through the loop scene
npm run capture -- 12-panoptive-launch --scene loop --every 0.4

# Count-based — N evenly-spaced frames across the loop scene
npm run capture -- 12-panoptive-launch --scene loop --frames 8
```

`--scene <id>` matches the `<Scene id="...">` you wrote in
`animation.tsx`. The tool reads the live timeline, finds the scene's
[start, end] from its registered tracks, and sweeps.

#### Sweep within an arbitrary range

```bash
npm run capture -- 12-panoptive-launch --range 22 26 --every 0.5
npm run capture -- 12-panoptive-launch --range 22 26 --frames 12
```

#### Default sanity check (no times, no scene)

```bash
npm run capture -- 12-panoptive-launch
```

Captures one frame at the **midpoint** of each top-level scene. Cheap
"did anything obviously break" check; **always specify exact times for
any motion you actually want to verify** (the midpoint is a heuristic,
not a peak).

### 2. Read the output

The tool prints:

1. The list of saved PNG paths.
2. The contact sheet path (when N > 1).
3. The inspector summary:

   ```
   ── inspector  ·  31.25s  ·  12 · panoptive launch
      velocity: ✓ none (>20% drift)
   ```

   Or, when there are violations:

   ```
   ── inspector  ·  31.25s  ·  12 · panoptive launch
      velocity: ⚠ 2 discontinuities
        · signals · scan line traverses the document  @ 9.10s  [power2Out → linear]
            y          vIn=      0  vOut=    195  100% step
        · signals · scan glow tracks behind  @ 9.18s  [power2Out → linear]
            y          vIn=      0  vOut=    199  100% step
      (full report: npm run inspect -- 12-panoptive-launch)
   ```

Read the sheet PNG with the file reader directly — it's the fastest path
to "is the composition working?" Read individual PNGs when you need to
scrutinise one frame at full resolution.

### 3. Iterate

Edit → capture again with the same arguments → compare. Re-using the
same `--scene` / `--every` arguments produces the same sheet path each
time, so the previous version is overwritten and you can flip between
"before" and "after" by reloading the same image in your viewer.

## Useful flags

| flag | effect |
| ---- | ------ |
| `--out <path>` | override default output path (single frame OR sheet) |
| `--w <px>` `--h <px>` | override frame dimensions; default 1440×900 |
| `--open` | open the saved PNG (or sheet) in Preview |
| `--no-sheet` | with N>1, keep individual PNGs but skip stitching |
| `--no-individuals` | with a sheet, delete per-frame PNGs after stitching |
| `--no-inspect` | skip the velocity-discontinuity summary |
| `--threshold <pct>` | velocity drift threshold for the inspector, default 20 |
| `MOTION_ORIGIN=…` | dev server origin, default `http://localhost:5174` |

## What the velocity report catches

The inspector reports any keyframe where the value's velocity *into*
the keyframe differs from its velocity *out of* the keyframe by more
than the threshold (default 20%). Common offenders:

- `power2Out → linear` at the start of a sweep (decelerates to 0,
  then jumps to full sweep speed). Fix: split the value's track from
  its other-axis tracks so the swept axis runs as one continuous
  segment.
- `linear → power2Out` at the end of a sweep (full speed, then snaps
  to a decelerating exit). Same fix.
- `power2InOut → power2Out` mid-arc (camera arrives at 0 velocity
  then leaves at MAX velocity).

Discontinuities are not always bugs — a button-press impact or a
spring overshoot is a deliberate velocity step. The inspector flags
every step it can detect; you judge which ones are intentional and
leave them alone. Otherwise, fix.

For the full per-track keyframe dump (states, eases, deltas), run
`npm run inspect -- <id>`. That prints every track in every scene; use
it when the summary alone doesn't tell you which keyframe boundary
is the problem.

## Mental model

```
/capture.html?id=<animation>&t=<seconds>
```

is the page that boots an animation in an iframe, pauses its timeline,
seeks to `t`, and flips `document.title` to `READY | <id> @ <t>s` once
a clean frame has rendered. The capture script:

1. Boots Chrome once (headless).
2. Navigates to `capture.html?t=<first time>`, waits for READY.
3. For each subsequent time, calls
   `frame.contentWindow.lfSeek(t)` directly — no re-navigation, just a
   timeline seek + 2 RAF ticks. Each subsequent shot costs ~50ms.
4. Screenshots, writes PNG.
5. Stitches the contact sheet by composing the captured PNGs as data
   URLs into a small grid HTML page and screenshotting that.
6. Reads `window.lfTimeline._scenes` from the iframe to compute the
   velocity report — same browser session, no second boot.

The wiring lives in:

- `motion/capture.html` — the capture harness page.
- `motion/src/framework/boot.ts` — exposes `window.lfSeek(seconds)`,
  `window.lfDuration()`, `window.lfPause()`, `window.lfTimeline`.
- `motion/src/registry.ts` — provides `frameWidth` / `frameHeight` per
  animation.
- `motion/scripts/capture-frame.mjs` — the capture script itself.

## Troubleshooting

- **`Frame readiness timed out after 15000ms`** → the iframe failed to
  boot. Open `/run/<id>.html` directly in the browser and check the
  console for errors in the animation module.
- **Title shows `ERROR | timeout waiting for lf-ready`** → animation
  didn't post `lf-ready`. Usually means `build()` threw inside a
  `useMotion` callback. Check the iframe's console.
- **Sheet is huge / hard to read** → use `--scene` to scope to one
  scene instead of the whole timeline, or specify fewer frames with
  `--frames N`.
- **`--scene <id>: not found`** → the id passed must match the
  `<Scene id="...">` in your `animation.tsx`. The error message lists
  the available top-level scenes.
- **Captured frames look identical / all the same time** → check the
  printed `captured N frames @ ...` line for actual timestamps. If
  they're all the same, your time arguments collapsed to one value.
- **Camera / 3D state looks wrong even though DOM is correct** →
  three.js-driven animations drive `camera.position` etc. via tween
  `onUpdate` callbacks, which only fire during playback. The harness
  already seeks twice for this; if you still see stale state, capture
  the same time twice and use the second.

## Reference: API exposed by the framework

```
// In the animation iframe (exposed on window by boot.ts):
window.lfDuration(): number                 // total timeline duration in s
window.lfSeek(seconds: number): number      // pauses + seeks, returns clamped t
window.lfPause(): void
window.lfResume(): void
window.lfProgress(p?: 0..1): number         // pre-existing
window.lfTimeline._scenes                   // raw scene graph (inspector source)

// In the capture page (exposed on the top-level window):
window.__LF_CAPTURE_READY: boolean          // true once seek+render complete
document.title = "READY | <id> @ <t>s"      // machine-readable done signal
```
