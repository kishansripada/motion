import { at, hold, curve, type PoseKeyframe } from "../../src/framework";

const BTN_BLACK_ON_WHITE = { backgroundColor: "rgb(0,0,0)", color: "rgb(255,255,255)" } as const;
const BTN_WHITE_ON_BLACK = { backgroundColor: "rgb(255,255,255)", color: "rgb(0,0,0)" } as const;

/**
 * Cursor click at (x, y): press to scale 0.85 at `start`, release with backOut at +0.3.
 * If `drift` is set, bounce out by (dx, dy) at +0.5 and return to (x, y) at +1.27.
 *
 * Every keyframe re-states opacity/x/y/scale so the action composes safely no
 * matter what the surrounding track says about those props.
 */
export function click(
   start: number,
   params: { x: number; y: number; drift?: { dx: number; dy: number } },
): PoseKeyframe[] {
   const out: PoseKeyframe[] = [
      at(start, { opacity: 1, x: params.x, y: params.y, scale: 0.85 }, curve.out(2)),
      at(start + 0.3, { opacity: 1, x: params.x, y: params.y, scale: 1 }, curve.backOut(2)),
   ];
   if (params.drift) {
      out.push(
         at(
            start + 0.5,
            { opacity: 1, x: params.x + params.drift.dx, y: params.y + params.drift.dy, scale: 1 },
            curve.inOut(2),
         ),
      );
      out.push(at(start + 1.27, { opacity: 1, x: params.x, y: params.y, scale: 1 }, curve.inOut(2)));
   }
   return out;
}

/**
 * Press-flash a black-on-white button: snap to inverted colors at +0.09,
 * return to black-on-white by +0.37. The first keyframe locks the baseline
 * color so the button reads black before the press too.
 */
export function buttonFlash(start: number): PoseKeyframe[] {
   return [
      at(start, BTN_BLACK_ON_WHITE),
      at(start + 0.09, BTN_WHITE_ON_BLACK, curve.out(2)),
      at(start + 0.37, BTN_BLACK_ON_WHITE, curve.out(2)),
   ];
}

/**
 * Press-flash that settles on a different color instead of returning to black.
 * Holds the inverted state briefly before easing to `settle` — used for the
 * fix scene's pay button settling on success green.
 */
export function buttonFlashTo(start: number, settle: { backgroundColor: string; color: string }): PoseKeyframe[] {
   return [
      at(start, BTN_BLACK_ON_WHITE),
      at(start + 0.09, BTN_WHITE_ON_BLACK, curve.out(2)),
      hold(start + 0.16),
      at(start + 0.42, settle, curve.out(2)),
   ];
}
