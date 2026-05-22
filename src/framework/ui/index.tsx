import {
   useCallback,
   useLayoutEffect,
   useRef,
   useState,
   type CSSProperties,
   type HTMLAttributes,
   type ReactNode,
   type Ref,
} from "react";
import { createPortal } from "react-dom";

type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
   return classes.filter(Boolean).join(" ");
}

export type CanvasProps = HTMLAttributes<HTMLDivElement>;

export function Canvas({ className, children, ...props }: CanvasProps) {
   return (
      <div
         className={cn(
            "relative h-full w-full overflow-hidden bg-motion-canvas font-sans text-motion-foreground",
            className,
         )}
         {...props}
      >
         {children}
      </div>
   );
}

export type PortalProps = HTMLAttributes<HTMLDivElement> & {
   children: ReactNode;
   container?: Element;
};

export function Portal({ children, className, container, ...props }: PortalProps) {
   const target = container ?? (typeof document === "undefined" ? null : document.body);
   if (!target) return null;

   return createPortal(
      <div className={cn("pointer-events-none fixed inset-0 z-50", className)} {...props}>
         {children}
      </div>,
      target,
   );
}

export type CameraPlanePoint = {
   /** Normalized frame x. 0 = left edge, 1 = right edge. */
   x: number;
   /** Normalized frame y. 0 = top edge, 1 = bottom edge. */
   y: number;
   /**
    * Camera distance from the plane in arbitrary units. Larger = farther from
    * the plane, which yields smaller derived rotations for the same x/y offset.
    */
   z?: number;
};

export type CameraPlaneView = {
   /**
    * Where the viewer/camera is, described from the final frame's point of
    * view. Example: { x: 0.18, y: 0.82, z: 1.2 } means the camera sits near
    * lower-left and looks toward `target`.
    */
   from?: CameraPlanePoint;
   /**
    * CSS perspective distance in px. Smaller = closer / more dramatic.
    * Typical UI-animation range: 1200-2600.
    */
   distance?: number;
   /**
    * Look-at point in normalized plane coordinates. This only controls aim;
    * `from` remains the camera's absolute left/right/up/down position.
    */
   target?: { x: number; y: number };
   /**
    * Camera roll in degrees around the viewing direction. Positive values
    * rotate the projected image clockwise, like rotating a physical camera.
    */
   roll?: number;
   /**
    * Apply the roll that makes the plane's projected top edge parallel with
    * the viewport top. `roll` is then treated as an extra offset.
    */
   naturalRoll?: boolean;
};

export type CameraPlaneProps = HTMLAttributes<HTMLDivElement> & {
   view?: CameraPlaneView;
   planeClassName?: string;
   planeRef?: Ref<HTMLDivElement>;
   planeStyle?: CSSProperties;
};

export type CameraPlaneSize = {
   width: number;
   height: number;
};

type Vec2 = { x: number; y: number };
type Vec3 = { x: number; y: number; z: number };

const CAMERA_EPSILON = 1e-6;

function dot(a: Vec3, b: Vec3) {
   return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
   return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
   };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
   return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function normalize(v: Vec3, fallback: Vec3): Vec3 {
   const length = Math.hypot(v.x, v.y, v.z);
   if (length < CAMERA_EPSILON) return fallback;
   return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function solveLinearSystem(matrix: number[][], rhs: number[]) {
   const n = rhs.length;
   const rows = matrix.map((row, index) => [...row, rhs[index]]);

   for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
         if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
      }

      if (Math.abs(rows[pivot][col]) < CAMERA_EPSILON) return null;
      [rows[col], rows[pivot]] = [rows[pivot], rows[col]];

      const pivotValue = rows[col][col];
      for (let i = col; i <= n; i += 1) rows[col][i] /= pivotValue;

      for (let row = 0; row < n; row += 1) {
         if (row === col) continue;
         const factor = rows[row][col];
         for (let i = col; i <= n; i += 1) rows[row][i] -= factor * rows[col][i];
      }
   }

   return rows.map((row) => row[n]);
}

function homographyFromCorners(source: Vec2[], destination: Vec2[]) {
   const matrix: number[][] = [];
   const rhs: number[] = [];

   for (let i = 0; i < 4; i += 1) {
      const { x, y } = source[i];
      const u = destination[i].x;
      const v = destination[i].y;

      matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      rhs.push(u);
      matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      rhs.push(v);
   }

   const solved = solveLinearSystem(matrix, rhs);
   if (!solved) return null;

   return [solved[0], solved[1], solved[2], solved[3], solved[4], solved[5], solved[6], solved[7], 1];
}

function cssMatrix3dFromHomography(h: number[]) {
   const values = [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, h[8]];

   return `matrix3d(${values.map((value) => Number(value.toPrecision(12))).join(", ")})`;
}

export function cameraPlaneHomography(view: CameraPlaneView = {}, size: CameraPlaneSize) {
   const {
      from = { x: 0.5, y: 0.5, z: 1 },
      distance = 2000,
      target = { x: 0.5, y: 0.5 },
      roll = 0,
      naturalRoll = false,
   } = view;
   const focalLength = Math.max(1, distance);
   const cameraDepth = Math.max(1, (from.z ?? 1) * focalLength);
   const halfW = size.width / 2;
   const halfH = size.height / 2;

   const camera: Vec3 = {
      x: (from.x - 0.5) * size.width,
      y: (from.y - 0.5) * size.height,
      z: -cameraDepth,
   };
   const lookAt: Vec3 = {
      x: (target.x - 0.5) * size.width,
      y: (target.y - 0.5) * size.height,
      z: 0,
   };
   const forward = normalize(subtract(lookAt, camera), { x: 0, y: 0, z: 1 });
   const right = normalize(cross({ x: 0, y: 1, z: 0 }, forward), { x: 1, y: 0, z: 0 });
   const down = cross(forward, right);

   const topLeft = { x: -halfW, y: -halfH, z: 0 };
   const topRight = { x: halfW, y: -halfH, z: 0 };
   const topLeftRelative = subtract(topLeft, camera);
   const topRightRelative = subtract(topRight, camera);
   const topLeftDepth = Math.max(CAMERA_EPSILON, dot(topLeftRelative, forward));
   const topRightDepth = Math.max(CAMERA_EPSILON, dot(topRightRelative, forward));
   const projectedTopEdge = {
      x: topRightRelative.x / topRightDepth - topLeftRelative.x / topLeftDepth,
      y: topRightRelative.y / topRightDepth - topLeftRelative.y / topLeftDepth,
      z: topRightRelative.z / topRightDepth - topLeftRelative.z / topLeftDepth,
   };
   const naturalRollRad = naturalRoll ? Math.atan2(-dot(projectedTopEdge, down), dot(projectedTopEdge, right)) : 0;
   const rollRad = naturalRollRad + (roll * Math.PI) / 180;
   const rollCos = Math.cos(rollRad);
   const rollSin = Math.sin(rollRad);
   const rolledRight: Vec3 = {
      x: right.x * rollCos - down.x * rollSin,
      y: right.y * rollCos - down.y * rollSin,
      z: right.z * rollCos - down.z * rollSin,
   };
   const rolledDown: Vec3 = {
      x: right.x * rollSin + down.x * rollCos,
      y: right.y * rollSin + down.y * rollCos,
      z: right.z * rollSin + down.z * rollCos,
   };

   const project = (point: Vec3): Vec2 => {
      const relative = subtract(point, camera);
      const z = Math.max(CAMERA_EPSILON, dot(relative, forward));

      return {
         x: halfW + (focalLength * dot(relative, rolledRight)) / z,
         y: halfH + (focalLength * dot(relative, rolledDown)) / z,
      };
   };

   const source = [
      { x: 0, y: 0 },
      { x: size.width, y: 0 },
      { x: size.width, y: size.height },
      { x: 0, y: size.height },
   ];
   const destination = [
      project(topLeft),
      project(topRight),
      project({ x: halfW, y: halfH, z: 0 }),
      project({ x: -halfW, y: halfH, z: 0 }),
   ];
   return homographyFromCorners(source, destination);
}

export function cameraPlaneMatrix(view: CameraPlaneView, size: CameraPlaneSize) {
   const homography = cameraPlaneHomography(view, size);

   return homography ? cssMatrix3dFromHomography(homography) : "none";
}

export function cameraPlaneStyles(view: CameraPlaneView = {}, size?: CameraPlaneSize) {
   return {
      container: {
         visibility: size ? undefined : "hidden",
      } satisfies CSSProperties,
      plane: {
         transform: size ? cameraPlaneMatrix(view, size) : "none",
         transformOrigin: "0 0",
         transformStyle: "preserve-3d",
         willChange: "transform",
      } satisfies CSSProperties,
   };
}

export function CameraPlane({
   view,
   className,
   planeClassName,
   planeRef,
   planeStyle,
   children,
   ...props
}: CameraPlaneProps) {
   const frameRef = useRef<HTMLDivElement>(null);
   const planeNodeRef = useRef<HTMLDivElement | null>(null);
   const lastStaticTransformRef = useRef<string | null>(null);
   const [size, setSize] = useState<CameraPlaneSize>();
   const styles = cameraPlaneStyles(view, size);
   const { transform: staticTransform, ...planeBaseStyle } = styles.plane;

   const setPlaneRef = useCallback(
      (node: HTMLDivElement | null) => {
         planeNodeRef.current = node;
         if (typeof planeRef === "function") {
            planeRef(node);
         } else if (planeRef) {
            (planeRef as { current: HTMLDivElement | null }).current = node;
         }
      },
      [planeRef],
   );

   useLayoutEffect(() => {
      const frame = frameRef.current;
      if (!frame) return;

      const updateSize = () => {
         const width = frame.clientWidth;
         const height = frame.clientHeight;
         if (width <= 0 || height <= 0) return;
         setSize((previous) =>
            previous?.width === width && previous.height === height ? previous : { width, height },
         );
      };

      updateSize();

      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(updateSize);
      observer.observe(frame);
      return () => observer.disconnect();
   }, []);

   // Treat `view` as a default transform: static planes keep it, while motion
   // tracks can take over `style.transform` without needing an API flag.
   useLayoutEffect(() => {
      const plane = planeNodeRef.current;
      if (!plane || !size || planeStyle?.transform !== undefined) return;

      const previousStaticTransform = lastStaticTransformRef.current;
      const currentTransform = plane.style.transform;
      const cameraPlaneStillOwnsTransform = currentTransform === "" || currentTransform === previousStaticTransform;

      if (!cameraPlaneStillOwnsTransform) return;
      plane.style.transform = String(staticTransform);
      lastStaticTransformRef.current = String(staticTransform);
   }, [planeStyle?.transform, size, staticTransform]);

   return (
      <div ref={frameRef} className={cn("absolute inset-0", className)} {...props}>
         <div className="absolute inset-0" style={styles.container}>
            <div
               ref={setPlaneRef}
               className={cn("absolute inset-0", planeClassName)}
               style={{ ...planeBaseStyle, ...planeStyle }}
            >
               {children}
            </div>
         </div>
      </div>
   );
}

