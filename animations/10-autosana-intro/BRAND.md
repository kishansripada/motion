# Autosana — Brand & Design Language

Reference for `10-autosana-intro` (and any future Autosana-themed scenes).
Pulled from a marketing-page snapshot of `autosana.ai` — header + hero. Keep
this doc updated as the brand evolves; the animation should track it.

## Identity

- **Name:** Autosana
- **Backed by:** Y Combinator (badge appears as a dashed pill: `Backed by [YC]`)
- **One-liner:** _AI testing to ship faster_
- **Subhead:** _The E2E testing layer to close the loop with your coding agents.
  Built for iOS, Android, and web apps. Ship faster with more confidence._
- **Audience:** developers shipping iOS / Android / web apps with coding agents
- **Voice:** crisp, technical, dev-tool register — short imperative claims
  ("Ship faster"), no marketing fluff, lots of whitespace

## Logo

- 32×32 raster mark (`/logo.png`) with `rounded-sm` and a 1px black border
- Wordmark "Autosana" set in Inter, `font-medium`, `text-xl`, sits to the right
  of the mark with `space-x-2`
- Bottom-aligned with the mark (`pb-1` lift on the mark to optical-center the
  baseline)

## Typography

| Role            | Font           | Size / weight                        | Notes                            |
| --------------- | -------------- | ------------------------------------ | -------------------------------- |
| Display / hero  | Inter          | `text-7xl` (≈72px) `font-medium`     | `line-height: 1`, `leading-tight`, often broken across two lines via `<br>` |
| Display mobile  | Inter          | `text-5xl` `font-medium`             | same line-height, no scaling     |
| Body            | Inter          | `text-lg` `leading-relaxed`          | `text-gray-600 dark:text-gray-300` |
| Nav links       | Inter          | `text-sm font-regular`               | hover → `text-primary`           |
| Wordmark        | Inter          | `text-xl font-medium`                |                                  |
| Button label    | Inter          | `text-sm font-medium`                |                                  |
| Micro-labels    | Inter          | `text-xs text-gray-500`, all caps    | wrapped in `[BRACKETS]` (see below) |

Inter is the only typeface — no display/serif accents. System-font fallbacks:
`-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`.

## Color tokens

Light / dark are first-class — every surface has a `dark:` counterpart.

| Token                | Light             | Dark              | Usage                                  |
| -------------------- | ----------------- | ----------------- | -------------------------------------- |
| Background           | `#ffffff` (white) | `#000000` (black) | page, header, hero                     |
| Foreground (text)    | `#000` (black)    | `#fff` (white)    | display, wordmark, primary copy        |
| Muted text           | `gray-600`        | `gray-300`        | body / supporting copy                 |
| Hairline border      | `black/10`        | `white/10`        | dashed rules, badge outlines           |
| Accent (only one)    | `bg-blue-500`     | `bg-blue-500`     | tiny 8×8 swatch in front of micro-label |

Buttons:
- **Primary:** `bg-black text-white` (light) / `bg-white text-black` (dark),
  `border` matches bg, `rounded-md`, `h-9 px-3` (header) or `h-10 px-4 py-2` (hero)
- **Outline / secondary:** `border-input bg-background hover:bg-accent`,
  same heights and radii

Hover state on primary: `hover:bg-black/90`, `hover:text-white` (no color shift,
just a faint darken). Outline hover swaps to `hover:bg-accent`.

## Visual signature: dashed rules

This is the strongest brand element. Treat dashed lines as a load-bearing
motif — not decoration.

- **Header pill** is wrapped in `border border-dashed`, floats `top-4` with
  `transition-[top]` on scroll
- **Vertical page rails:** the page has `border-r border-l border-dashed`
  with `mx-4 md:mx-8 lg:mx-36` so the dashed edge tracks the content gutter
- **Section separators:** `border-b border-dashed` between hero / features /
  testimonials / FAQ
- **Hero grid:** the desktop layout is a 12-col × 7-row grid (`md:grid-cols-12
  md:grid-rows-7 md:h-[28rem]`). Several cells just exist to anchor an
  internal dashed border (`border-r border-dashed`, `border-b border-dashed`)
- **Cards / badges:** `border-dashed border-black/10 dark:border-white/10`
  with `rounded` (NOT `rounded-md` — the cards stay sharper than the buttons)

When in doubt: if you would draw a solid line, draw a dashed one instead.

## Layout primitives

- **Sticky header:** `sticky z-50 w-full top-4` with a `transition-[top]
  duration-300 ease-in-out`. The header itself is a horizontal pill,
  `h-14 py-8 px-4`, white/black background, dashed border, centered with
  `mx-auto` and width clamps `max-w-[calc(100%-2rem)] md:max-w-[calc(100%-4rem)]
  lg:max-w-[calc(100%-18rem)]`
- **Header content:** logo + nav on the left (`space-x-8` between groups,
  `space-x-6` between nav links), CTAs on the right pushed with `ml-auto`
- **Hero grid (desktop):** 12 columns × 7 rows, `h-[28rem]`. Display headline
  occupies cols 2–12 of rows 1–5 with a bottom-aligned `pb-6`. CTA stack
  occupies cols 9–12 of rows 6–7 (right-aligned). Dashed dividers seam the
  rest. Mobile collapses to a stacked single-column layout.
- **Container gutters:** `mx-4 md:mx-8 lg:mx-36` — the lg gutter is unusually
  wide (~144px), giving the dashed rails room to breathe at desktop sizes

## Components

### "Backed by" badge

Dashed pill, `rounded`, `border border-dashed border-black/10 dark:border-white/10`,
`px-3 py-1`. Inline children: `<span>Backed by</span>` (text-sm font-medium) +
the YC logo image. No background color, no shadow, no glow — just the dashed outline.

### Micro-label / section tag

Used to label hero CTAs, feature columns, etc. Format:

```
[ small blue square ]  [SECTION LABEL IN ALL CAPS]
```

- `text-xs text-gray-500`, all caps, wrapped in literal square brackets
- Preceded by a 2×2 (`w-2 h-2`) `bg-blue-500` swatch with `mr-2`
- This is the only place the brand uses the blue accent — keep it scarce

### CTA buttons

- Primary "Get Started": black bg, white text, with a `lucide-arrow-right`
  icon (`w-3.5 h-3.5` in header, `w-4 h-4` in hero), gap `gap-1.5`
- Secondary "Book a demo": dashed-input outline button, same height
- Both use `rounded-md` and `text-sm font-medium`

### Iconography

- [Lucide](https://lucide.dev) — `arrow-right`, `menu` are the only icons
  in the visible markup. Stroke `2`, `stroke-linecap="round"`,
  `stroke-linejoin="round"`. Stays monochrome; never colored.

## Motion notes (for animations)

When animating Autosana surfaces, lean into the brand vocabulary:

- **Dashed rules should _draw in_**, not fade. Animate `stroke-dashoffset`
  on SVG strokes, or mask a solid div behind a moving clip-path. Direction
  follows reading order: top-down for vertical rails, left-to-right for
  horizontal separators.
- **Grid-cell reveals** feel native — stagger fades along the dashed grid
  cells of the hero, ~60ms per cell, `power2.out`.
- **Type entrance:** the display headline often breaks across two lines
  (`AI testing` / `to ship faster`). Reveal each line as a single mask
  wipe, top line first, ~120ms gap.
- **Color is the punctuation:** the only non-monochrome moment in the
  brand is the blue swatch on micro-labels. Use it sparingly in motion
  too — a single accent flash at a key beat lands harder than a colored
  gradient sweep.
- **Easing:** prefer `power2.out` / `power3.out` for entrances, `power1.inOut`
  for camera moves. Avoid bounce / elastic — too playful for the dev-tool
  register.

## Source

The reference markup is the autosana.ai homepage header + hero (light theme),
captured 2026-04-26. Update this doc whenever you re-snapshot the site.
