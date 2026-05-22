import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type Ref } from "react";

export type VisualElementInfo = {
   tag: string;
   id?: string;
   classes: string[];
   dataMotion?: string;
   selector: string;
   text?: string;
   rect: { x: number; y: number; width: number; height: number };
};

export type VisualNote = {
   animationId: string;
   time: number;
   frameWidth: number;
   frameHeight: number;
   rect: { x: number; y: number; width: number; height: number };
   captureUrl: string;
   message: string;
   element?: VisualElementInfo;
};

type Props = {
   animationId: string;
   reloadToken: number;
   frameWidth: number;
   frameHeight: number;
   onLoad: (win: Window | null) => void;
   visualSelectEnabled?: boolean;
   onVisualNote?: (note: VisualNote) => void;
   /**
    * Live element from the iframe that the timeline has selected. When set,
    * we render a blue halo on the canvas at the element's current rect every
    * frame (the element is animating, so the rect moves).
    */
   selectionTarget?: Element | null;
};

type Point = { x: number; y: number };
type CssRect = { x: number; y: number; width: number; height: number };

const CLICK_THRESHOLD = 6;

function setRef<T>(ref: Ref<T>, value: T | null) {
   if (typeof ref === "function") ref(value);
   else if (ref) ref.current = value;
}

function parseTransformOrigin(origin: string, w: number, h: number): [number, number, number] {
   const parts = (origin || "0px 0px 0px").trim().split(/\s+/);
   const at = (i: number, ref: number): number => {
      const p = parts[i];
      if (!p) return 0;
      if (p.endsWith("%")) return (parseFloat(p) / 100) * ref;
      const v = parseFloat(p);
      return Number.isFinite(v) ? v : 0;
   };
   return [at(0, w), at(1, h), parts[2] ? at(2, 0) : 0];
}

function parsePerspectiveOrigin(origin: string, w: number, h: number): [number, number] {
   // CSS spec default is `50% 50%`.
   const parts = (origin || "50% 50%").trim().split(/\s+/);
   const at = (i: number, ref: number, def: number): number => {
      const p = parts[i];
      if (!p) return def;
      if (p.endsWith("%")) return (parseFloat(p) / 100) * ref;
      const v = parseFloat(p);
      return Number.isFinite(v) ? v : def;
   };
   return [at(0, w, w / 2), at(1, h, h / 2)];
}

/**
 * Walks the target's DOM parent chain and accumulates each ancestor's full
 * paint contribution: layout offset, parent scroll, computed transform around
 * its transform-origin, and — if the ancestor declares one — a perspective
 * projection (around perspective-origin) that applies to its descendants.
 *
 * The perspective step is what takes a flat rotation matrix and turns it into
 * the foreshortened parallelogram you actually see when an ancestor sets
 * `perspective: Npx`. Without it the halo and the real element's projection
 * diverge — one is affine, one is perspective, and they only happen to agree
 * when the camera is flat.
 *
 * `offsetLeft/offsetTop` is measured from `offsetParent`, which skips past
 * static intermediate ancestors. So the layout-position step below uses the
 * element's offset relative to its IMMEDIATE parent — equal to `offsetLeft`
 * when the parent IS the offsetParent, otherwise `offsetLeft - parent.offsetLeft`
 * (a static parent shares the same offsetParent as the child, so the
 * difference is the child's local position within the parent). Naively adding
 * `offsetLeft` at every ancestor double-counts the offset of any static
 * intermediate.
 */
function cumulativeViewportMatrix(target: HTMLElement, win: Window): DOMMatrix {
   const chain: HTMLElement[] = [];
   let cur: HTMLElement | null = target;
   while (cur) {
      chain.unshift(cur);
      cur = cur.parentElement;
   }

   const matrix = new DOMMatrix();
   let parentScrollX = 0;
   let parentScrollY = 0;

   for (let i = 0; i < chain.length; i++) {
      const el = chain[i];
      const parent = i > 0 ? chain[i - 1] : null;

      // 1. Account for the PARENT'S scroll position. Each element's offsetLeft
      //    is in the parent's unscrolled content frame; if the parent is
      //    scrolled, the child renders shifted by -scrollLeft/-scrollTop.
      if (parentScrollX !== 0 || parentScrollY !== 0) {
         matrix.translateSelf(-parentScrollX, -parentScrollY);
      }

      // 2. Translate to this element's layout position within its IMMEDIATE
      //    parent. `offsetLeft` is from `offsetParent` (which skips past
      //    static parents), so when the immediate parent isn't the
      //    offsetParent we subtract the parent's offsetLeft — both are
      //    measured from the same offsetParent in that case.
      const offsetParent = el.offsetParent;
      let dx = el.offsetLeft;
      let dy = el.offsetTop;
      if (parent && offsetParent && parent !== offsetParent) {
         dx -= parent.offsetLeft;
         dy -= parent.offsetTop;
      }
      matrix.translateSelf(dx, dy);

      const cs = win.getComputedStyle(el);

      // 3. Apply this element's own transform around its transform-origin.
      const t = cs.transform;
      if (t && t !== "none") {
         const [ox, oy, oz] = parseTransformOrigin(cs.transformOrigin, el.offsetWidth, el.offsetHeight);
         matrix.translateSelf(ox, oy, oz);
         matrix.multiplySelf(new DOMMatrix(t));
         matrix.translateSelf(-ox, -oy, -oz);
      }

      // 4. If this element declares a perspective, apply the perspective
      //    projection now — it sits BETWEEN this element's own transform
      //    stack and its descendants' transform stacks. The order of ops
      //    is: translate to perspective-origin, multiply by perspective
      //    matrix (m34 = -1/p), translate back. Children inherit through
      //    matrix multiplication.
      const perspective = cs.perspective;
      if (perspective && perspective !== "none") {
         const pVal = parseFloat(perspective);
         if (Number.isFinite(pVal) && pVal > 0) {
            const [px, py] = parsePerspectiveOrigin(cs.perspectiveOrigin, el.offsetWidth, el.offsetHeight);
            const persp = new DOMMatrix();
            persp.m34 = -1 / pVal;
            matrix.translateSelf(px, py);
            matrix.multiplySelf(persp);
            matrix.translateSelf(-px, -py);
         }
      }

      parentScrollX = el.scrollLeft;
      parentScrollY = el.scrollTop;
   }
   return matrix;
}

function normalizeRect(a: Point, b: Point): CssRect {
   return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(a.x - b.x),
      height: Math.abs(a.y - b.y),
   };
}

function timeFromWindow(win: Window | null): number {
   const host = win as any;
   try {
      const tl = host?.lfTimeline;
      if (tl && typeof tl.time === "function") return Number(tl.time()) || 0;
      if (typeof host?.lfDuration === "function" && typeof host?.lfProgress === "function") {
         return (Number(host.lfDuration()) || 0) * (Number(host.lfProgress()) || 0);
      }
   } catch {
      /* iframe may be mid-reload */
   }
   return 0;
}

function shortText(el: Element): string | undefined {
   const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
   if (!text) return undefined;
   return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function selectorFor(el: Element): string {
   const html = el as HTMLElement;
   if (html.dataset.motion) return `[data-motion="${html.dataset.motion}"]`;
   if (html.id) return `#${html.id}`;

   const tag = el.tagName.toLowerCase();
   const classes = typeof html.className === "string" ? html.className.trim().split(/\s+/).filter(Boolean) : [];
   if (classes.length > 0) return `${tag}.${classes.slice(0, 3).join(".")}`;
   return tag;
}

function describeElement(el: Element, scale: number): VisualElementInfo {
   const html = el as HTMLElement;
   const r = el.getBoundingClientRect();
   return {
      tag: el.tagName.toLowerCase(),
      id: html.id || undefined,
      classes: typeof html.className === "string" ? html.className.trim().split(/\s+/).filter(Boolean).slice(0, 8) : [],
      dataMotion: html.dataset.motion || undefined,
      selector: selectorFor(el),
      text: shortText(el),
      rect: {
         x: Math.round(r.left),
         y: Math.round(r.top),
         width: Math.round(r.width),
         height: Math.round(r.height),
      },
   };
}

function makeMessage(note: Omit<VisualNote, "message">): string {
   const { animationId, time, frameWidth, frameHeight, rect, captureUrl, element } = note;
   const lines = [`I'm referring to \`${animationId}\` at \`${time.toFixed(2)}s\`.`, ""];

   if (element) {
      lines.push(`Selected DOM element in the ${frameWidth}x${frameHeight} frame:`);
      lines.push(`- selector: \`${element.selector}\``);
      lines.push(`- tag: \`${element.tag}\``);
      if (element.id) lines.push(`- id: \`${element.id}\``);
      if (element.dataMotion) lines.push(`- data-motion: \`${element.dataMotion}\``);
      if (element.classes.length) lines.push(`- classes: \`${element.classes.join(" ")}\``);
      if (element.text) lines.push(`- text: ${JSON.stringify(element.text)}`);
      lines.push(`- rect: x ${element.rect.x}, y ${element.rect.y}, w ${element.rect.width}, h ${element.rect.height}`);
   } else {
      lines.push(`Selected region in the ${frameWidth}x${frameHeight} frame:`);
      lines.push(`- x: ${rect.x}`);
      lines.push(`- y: ${rect.y}`);
      lines.push(`- width: ${rect.width}`);
      lines.push(`- height: ${rect.height}`);
   }

   lines.push("", `Capture URL: ${captureUrl}`, "", "Please inspect exactly this element/region/timestamp and make the visual change I'm describing.");
   return lines.join("\n");
}

/**
 * The iframe viewport. Renders the animation at its native frameWidth × frameHeight
 * and scales the whole thing down (letter-boxed / pillar-boxed) to fit whatever
 * space the stage pane has. Visual select mode supports:
 *   - click: pick the DOM element under the cursor inside the iframe
 *   - drag: select a rectangular region in native frame pixels
 */
export const Stage = forwardRef<HTMLIFrameElement, Props>(function Stage(
   { animationId, reloadToken, frameWidth, frameHeight, onLoad, visualSelectEnabled = false, onVisualNote, selectionTarget = null },
   ref,
) {
   const fitRef = useRef<HTMLDivElement>(null);
   const shellRef = useRef<HTMLDivElement>(null);
   const iframeRef = useRef<HTMLIFrameElement>(null);
   const dragStartRef = useRef<Point | null>(null);
   const [scale, setScale] = useState(1);
   const [selection, setSelection] = useState<CssRect | null>(null);
   const [hoverRect, setHoverRect] = useState<CssRect | null>(null);

   // Halo: rendered as a sibling of #lf-react-root at the iframe's body
   // level so it sits OUTSIDE every opacity stacking context inside the
   // animation tree (chat scene fading to opacity 0, etc.). To still track
   // 3D motion, we copy the cumulative transform of the target's ancestor
   // chain onto the halo every frame. Transforms are composable through the
   // chain; opacity is not — that's why we can't sit the halo inside the
   // target's subtree.
   useEffect(() => {
      if (!selectionTarget) return;
      const ownerDoc = selectionTarget.ownerDocument;
      if (!ownerDoc) return;
      const win = ownerDoc.defaultView;
      if (!win) return;
      if (!selectionTarget.isConnected) return;

      const STYLE_ID = "__lf_motion_halo_style__";
      if (!ownerDoc.getElementById(STYLE_ID)) {
         const style = ownerDoc.createElement("style");
         style.id = STYLE_ID;
         style.textContent = `
            #__lf_motion_halo__ {
               position: absolute;
               top: 0;
               left: 0;
               transform-origin: 0 0;
               pointer-events: none;
               outline: 2px solid #60a5fa;
               outline-offset: 1px;
               box-shadow:
                  0 0 0 1px rgba(0, 0, 0, 0.55),
                  0 0 14px rgba(96, 165, 250, 0.55);
               z-index: 2147483647;
               opacity: 1;
               will-change: transform, width, height;
            }
         `;
         ownerDoc.head?.appendChild(style);
      }

      let halo = ownerDoc.getElementById("__lf_motion_halo__") as HTMLDivElement | null;
      if (!halo) {
         halo = ownerDoc.createElement("div");
         halo.id = "__lf_motion_halo__";
         ownerDoc.body.appendChild(halo);
      }

      let raf = 0;
      const tick = () => {
         if (!halo) return;
         if (!selectionTarget.isConnected) {
            halo.style.display = "none";
            raf = requestAnimationFrame(tick);
            return;
         }
         const target = selectionTarget as HTMLElement;
         const w = target.offsetWidth;
         const h = target.offsetHeight;
         if (w <= 0 && h <= 0) {
            halo.style.display = "none";
         } else {
            const m = cumulativeViewportMatrix(target, win);
            halo.style.display = "";
            halo.style.width = `${w}px`;
            halo.style.height = `${h}px`;
            halo.style.transform = m.toString();
         }
         raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      return () => {
         cancelAnimationFrame(raf);
         halo?.remove();
      };
   }, [selectionTarget]);

   useEffect(() => {
      document.documentElement.style.setProperty("--frame-w", `${frameWidth}px`);
      document.documentElement.style.setProperty("--frame-h", `${frameHeight}px`);
   }, [frameWidth, frameHeight]);

   useEffect(() => {
      if (!visualSelectEnabled) {
         dragStartRef.current = null;
         setSelection(null);
         setHoverRect(null);
      }
   }, [visualSelectEnabled]);

   useLayoutEffect(() => {
      const el = fitRef.current;
      if (!el) return;
      const compute = () => {
         const w = el.clientWidth;
         const h = el.clientHeight;
         if (w <= 0 || h <= 0) return;
         const s = Math.min(1, w / frameWidth, h / frameHeight);
         setScale(s > 0 ? s : 1);
      };
      compute();
      const ro = new ResizeObserver(compute);
      ro.observe(el);
      return () => ro.disconnect();
   }, [frameWidth, frameHeight]);

   function localPoint(e: PointerEvent<HTMLDivElement>): Point {
      const rect = shellRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
         x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
         y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
      };
   }

   function framePoint(cssPoint: Point): Point {
      return { x: cssPoint.x / scale, y: cssPoint.y / scale };
   }

   function elementAt(cssPoint: Point): Element | null {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return null;
      const p = framePoint(cssPoint);
      return doc.elementFromPoint(p.x, p.y);
   }

   function cssRectFromFrameRect(frameRect: CssRect): CssRect {
      return {
         x: frameRect.x * scale,
         y: frameRect.y * scale,
         width: frameRect.width * scale,
         height: frameRect.height * scale,
      };
   }

   function noteBase(rect: VisualNote["rect"]) {
      const time = timeFromWindow(iframeRef.current?.contentWindow ?? null);
      const captureUrl = `${location.origin}/capture.html?id=${encodeURIComponent(animationId)}&t=${time.toFixed(2)}&chromeless=1&w=${frameWidth}&h=${frameHeight}`;
      return { animationId, time, frameWidth, frameHeight, rect, captureUrl };
   }

   function finishRegion(cssRect: CssRect) {
      const frameRect = {
         x: Math.round(cssRect.x / scale),
         y: Math.round(cssRect.y / scale),
         width: Math.round(cssRect.width / scale),
         height: Math.round(cssRect.height / scale),
      };

      if (frameRect.width < 2 || frameRect.height < 2) return;
      const base = noteBase(frameRect);
      onVisualNote?.({ ...base, message: makeMessage(base) });
   }

   function finishElement(cssPoint: Point) {
      const element = elementAt(cssPoint);
      if (!element) return;
      const info = describeElement(element, scale);
      const base = noteBase(info.rect);
      onVisualNote?.({ ...base, element: info, message: makeMessage({ ...base, element: info }) });
   }

   function updateHover(cssPoint: Point) {
      const element = elementAt(cssPoint);
      if (!element) {
         setHoverRect(null);
         return;
      }
      const info = describeElement(element, scale);
      setHoverRect(cssRectFromFrameRect(info.rect));
   }

   function onPointerDown(e: PointerEvent<HTMLDivElement>) {
      if (!visualSelectEnabled) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = localPoint(e);
      dragStartRef.current = p;
      setSelection({ x: p.x, y: p.y, width: 0, height: 0 });
   }

   function onPointerMove(e: PointerEvent<HTMLDivElement>) {
      if (!visualSelectEnabled) return;
      e.preventDefault();
      const p = localPoint(e);
      if (!dragStartRef.current) {
         updateHover(p);
         return;
      }
      setSelection(normalizeRect(dragStartRef.current, p));
   }

   function onPointerLeave() {
      if (!dragStartRef.current) setHoverRect(null);
   }

   function onPointerUp(e: PointerEvent<HTMLDivElement>) {
      if (!visualSelectEnabled || !dragStartRef.current) return;
      e.preventDefault();
      try {
         e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
         /* noop */
      }
      const end = localPoint(e);
      const rect = normalizeRect(dragStartRef.current, end);
      const start = dragStartRef.current;
      dragStartRef.current = null;
      setSelection(null);

      if (rect.width < CLICK_THRESHOLD && rect.height < CLICK_THRESHOLD) finishElement(end);
      else finishRegion(rect);

      updateHover(start);
   }

   return (
      <div ref={fitRef} className="stage-fit">
         <div
            ref={shellRef}
            className="frame-shell"
            style={{ width: `${frameWidth * scale}px`, height: `${frameHeight * scale}px` }}
         >
            <iframe
               ref={(node) => {
                  iframeRef.current = node;
                  setRef(ref, node);
               }}
               className="frame"
               src={`/run/${animationId}.html?t=${reloadToken}`}
               style={{
                  width: `${frameWidth}px`,
                  height: `${frameHeight}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "0 0",
               }}
               onLoad={(e) => {
                  const win = (e.currentTarget as HTMLIFrameElement).contentWindow;
                  onLoad(win);
               }}
            />

            {visualSelectEnabled ? (
               <div
                  className="visual-select-overlay"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onPointerLeave={onPointerLeave}
               >
                  <div className="visual-select-hint">click element or drag region</div>
                  {hoverRect && !selection ? (
                     <div
                        className="visual-select-hover"
                        style={{
                           left: `${hoverRect.x}px`,
                           top: `${hoverRect.y}px`,
                           width: `${hoverRect.width}px`,
                           height: `${hoverRect.height}px`,
                        }}
                     />
                  ) : null}
                  {selection ? (
                     <div
                        className="visual-select-box"
                        style={{
                           left: `${selection.x}px`,
                           top: `${selection.y}px`,
                           width: `${selection.width}px`,
                           height: `${selection.height}px`,
                        }}
                     />
                  ) : null}
               </div>
            ) : null}
         </div>
      </div>
   );
});
