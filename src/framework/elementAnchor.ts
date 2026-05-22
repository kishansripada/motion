import type { MotionElementBinding } from "./functionTimeMotion";
import { measureRect } from "./measureRect";
import type { Rect } from "./measureRect";

export type ElementAnchorName =
   | "topLeft"
   | "top"
   | "topRight"
   | "left"
   | "center"
   | "right"
   | "bottomLeft"
   | "bottom"
   | "bottomRight";

export type ElementAnchorPoint = ElementAnchorName | { x: number; y: number };

export type ElementAnchorOptions = {
   target: MotionElementBinding;
   /**
    * Named anchors map to points on the target rect. Object anchors use
    * normalized rect coordinates: { x: 0, y: 0 } is top-left, { x: 1, y: 1 }
    * is bottom-right.
    */
   anchor?: ElementAnchorPoint;
};

export type ElementAnchorMeasurement = {
   x: number;
   y: number;
   rect: Rect;
};

export type ElementAnchor = {
   /** Measure the target anchor in viewport coordinates. */
   measure(): ElementAnchorMeasurement;
};

export type AnchoredPositionOffset = {
   x?: number;
   y?: number;
};

export type AnchoredPositionOptions = ElementAnchorOptions & {
   hotspot?: AnchoredPositionOffset;
};

export type AnchoredPosition = (offset?: AnchoredPositionOffset) => {
   x: number;
   y: number;
};

const ANCHOR_POINTS: Record<ElementAnchorName, { x: number; y: number }> = {
   topLeft: { x: 0, y: 0 },
   top: { x: 0.5, y: 0 },
   topRight: { x: 1, y: 0 },
   left: { x: 0, y: 0.5 },
   center: { x: 0.5, y: 0.5 },
   right: { x: 1, y: 0.5 },
   bottomLeft: { x: 0, y: 1 },
   bottom: { x: 0.5, y: 1 },
   bottomRight: { x: 1, y: 1 },
};

function resolveAnchorPoint(anchor: ElementAnchorPoint): { x: number; y: number } {
   return typeof anchor === "string" ? ANCHOR_POINTS[anchor] : anchor;
}

/**
 * Returns a measurable x/y anchor for a point on a rendered element.
 *
 * Use this whenever motion is visually relative to another DOM element. Raw
 * coordinates are still fine for absolute stage composition, but geometry
 * relationships should be measured from bindings.
 */
export function useElementAnchor({
   target,
   anchor = "center",
}: ElementAnchorOptions): ElementAnchor {
   function measure() {
      const targetRect = measureRect(target.current(), { strict: false });
      const point = resolveAnchorPoint(anchor);
      const x = targetRect.left + targetRect.width * point.x;
      const y = targetRect.top + targetRect.height * point.y;

      return { x, y, rect: targetRect };
   }

   return {
      measure,
   };
}

export function useAnchoredPosition({ hotspot, ...anchorOptions }: AnchoredPositionOptions): AnchoredPosition {
   const anchor = useElementAnchor(anchorOptions);

   return (offset = {}) => {
      const { x, y } = anchor.measure();
      return {
         x: x + (offset.x ?? 0) - (hotspot?.x ?? 0),
         y: y + (offset.y ?? 0) - (hotspot?.y ?? 0),
      };
   };
}
