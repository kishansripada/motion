import type { MotionElementBinding, MotionStyle } from "./functionTimeMotion";
import { measureRect } from "./measureRect";

export type ElementFlightCapture = "geometry" | "text";

export type ElementFlightOptions = {
   from: MotionElementBinding;
   to: MotionElementBinding;
   /**
    * "geometry" captures only x/y/scale. "text" also captures fontSize,
    * lineHeight, and color, and uses destination font metrics as the flyer's
    * baseline while scaling the source pose down/up to match.
    */
   capture?: ElementFlightCapture;
};

export type ElementFlightPose = {
   x: number;
   y: number;
   scale: number;
   fontSize?: number;
   lineHeight?: number;
   color?: string;
};

export type ElementFlight = {
   /**
    * Lazy query for the source slot's pose. Returns a thunk; the runtime
    * re-evaluates it every frame the keyframe contributes to interpolation,
    * so the flight always tracks the slot's actual current screen position.
    */
   from(extra?: MotionStyle): () => MotionStyle;
   /** Lazy query for the destination slot's pose. Same semantics as `from`. */
   to(extra?: MotionStyle): () => MotionStyle;
   /** Eager measurement, for callers who want a snapshot right now. */
   measure(): { from: ElementFlightPose; to: ElementFlightPose };
};

function px(value: string, fallback: number) {
   const n = Number.parseFloat(value);
   return Number.isFinite(n) ? n : fallback;
}

function textMetrics(el: HTMLElement) {
   const style = el.ownerDocument.defaultView?.getComputedStyle(el) ?? getComputedStyle(el);
   const fontSize = px(style.fontSize, 16);
   const lineHeight = px(style.lineHeight, fontSize * 1.2);
   return { fontSize, lineHeight, color: style.color };
}

function mergePose(pose: ElementFlightPose, extra?: MotionStyle): MotionStyle {
   return { ...pose, ...extra };
}

/**
 * Returns lazy poses for a flying element that travels between two layout
 * slots. The poses are queries, not snapshots — passing
 * `replyFlight.to({ opacity: 1 })` into `at(...)` records the **query**
 * itself in the keyframe, and the runtime re-evaluates it every frame, so
 * the dock target tracks the slot wherever it actually lives, even if its
 * ancestors are being animated (3D camera moves, scene fades, layout
 * changes).
 *
 * No discipline is required from the author: the call site reads exactly the
 * same as before. Mount-time measurement and frozen integers were a
 * footgun — this is the corrected design.
 */
export function useElementFlight({ from, to, capture = "geometry" }: ElementFlightOptions): ElementFlight {
   function measure() {
      const fromEl = from.current();
      const toEl = to.current();
      // strict:false because we measure live every frame; there is no later
      // moment for the result to "go stale" against.
      const fromRect = measureRect(fromEl, { strict: false });
      const toRect = measureRect(toEl, { strict: false });

      if (capture === "text") {
         const fromText = textMetrics(fromEl);
         const toText = textMetrics(toEl);
         return {
            from: {
               x: fromRect.left,
               y: fromRect.top,
               scale: fromText.fontSize / toText.fontSize,
               fontSize: toText.fontSize,
               lineHeight: toText.lineHeight,
               color: fromText.color,
            },
            to: {
               x: toRect.left,
               y: toRect.top,
               scale: 1,
               fontSize: toText.fontSize,
               lineHeight: toText.lineHeight,
               color: toText.color,
            },
         };
      }

      return {
         from: { x: fromRect.left, y: fromRect.top, scale: 1 },
         to: { x: toRect.left, y: toRect.top, scale: 1 },
      };
   }

   return {
      from(extra) {
         return () => mergePose(measure().from, extra);
      },
      to(extra) {
         return () => mergePose(measure().to, extra);
      },
      measure,
   };
}
