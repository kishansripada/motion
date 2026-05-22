import {
   createContext,
   createElement,
   useContext,
   useLayoutEffect,
   useMemo,
   useRef,
   type ComponentType,
   type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import "./motion.css";
import type { AnimationDefinition, AnimationMountResult } from "./types";
import { bindMotionElement, type MotionElementBinding } from "./functionTimeMotion";
import {
   createPureScene,
   runPureAnimation,
   type PureAnimationHandle,
   type PureAnimationOptions,
   type PureScene,
} from "./pureMotion";

type PureRuntimeRegistry = {
   register(builder: (scene: PureScene) => void, sceneId: string, start: number): void;
   unregister(sceneId: string): void;
   ready(): void;
};

type PureRuntimeContextValue = {
   registry: PureRuntimeRegistry | null;
};

const PureRuntimeContext = createContext<PureRuntimeContextValue>({ registry: null });

type SceneContextValue = {
   id: string;
   start: number;
};

const SceneContext = createContext<SceneContextValue>({ id: "root", start: 0 });

/**
 * Read the absolute start time of the nearest enclosing `<Scene>`. Defaults to
 * 0 at the root. Use this when composing children:
 *
 *   const start = useStartTime();
 *   return <Scene start={start + chatBeats.reply + 1.0}>...</Scene>;
 */
export function useStartTime(): number {
   return useContext(SceneContext).start;
}

export type SceneProps = {
   id?: string;
   /**
    * Absolute time in seconds at which the scene begins. Must be `>=` the
    * parent scene's start. Use `useStartTime()` plus an offset to compose
    * relative to the parent.
    */
   start: number;
   children?: ReactNode;
};

let anonymousSceneCounter = 0;

/**
 * A nestable scene wrapper that provides `start` (absolute seconds) and `id`
 * to descendants via context. Throws if `start` is below the parent scene's
 * start, since a child cannot describe motion before its parent begins.
 */
export function Scene({ id, start, children }: SceneProps) {
   const parent = useContext(SceneContext);
   const stableIdRef = useRef<string>(null as unknown as string);
   if (stableIdRef.current === null) {
      stableIdRef.current = id ?? `scene_${++anonymousSceneCounter}`;
   }
   const resolvedId = id ?? stableIdRef.current;

   if (Number.isNaN(start)) {
      throw new Error(`[motion/scene "${resolvedId}"] start is NaN`);
   }
   if (start < parent.start) {
      throw new Error(
         `[motion/scene "${resolvedId}"] start ${start} is before parent scene start (${parent.start}). ` +
            `Did you mean useStartTime() + ${start - parent.start}?`,
      );
   }

   const value = useMemo<SceneContextValue>(() => ({ id: resolvedId, start }), [resolvedId, start]);
   return createElement(SceneContext.Provider, { value }, children);
}

/**
 * A persistent ref binding for an element. Stable across re-renders.
 */
export function useMotionBinding<T extends HTMLElement = HTMLElement>(): MotionElementBinding<T> {
   const ref = useRef<MotionElementBinding<T> | null>(null);
   if (!ref.current) ref.current = bindMotionElement<T>();
   return ref.current;
}

let useMotionCounter = 0;

/**
 * Declare local motion for a component. The builder is called once after mount,
 * once all refs are populated. Bindings, timing, and side effects are local to
 * the component.
 *
 * The builder receives a `PureScene` whose `start` is the absolute time of the
 * nearest enclosing `<Scene>` (default 0 at root). All keyframe / effect times
 * inside the builder must be `>= scene.start`; the runtime throws otherwise so
 * that authors are nudged toward `at(scene.start + offset, ...)`.
 *
 * The builder's debug id is auto-derived from the nearest `<Scene id>` plus a
 * stable per-instance counter — there is no manual id parameter.
 *
 * Registration runs in `useLayoutEffect` so the host can collect every
 * builder, run them, and call `render(0, "seek")` *before the first paint*.
 * That eliminates the one-RAF FOUC window where elements would otherwise
 * paint with their JSX-default styles before the runtime applied the first
 * keyframe state. Authors no longer need to mirror keyframe initial state
 * with `style={{ opacity: 0 }}` (etc.) on bound elements.
 */
export function useMotion(build: (scene: PureScene) => void) {
   const ctx = useContext(PureRuntimeContext);
   const sceneCtx = useContext(SceneContext);
   const idRef = useRef<string | null>(null);
   if (idRef.current === null) {
      idRef.current = `${sceneCtx.id}.${++useMotionCounter}`;
   }
   const buildRef = useRef(build);
   buildRef.current = build;

   useLayoutEffect(() => {
      if (!ctx.registry) return;
      const id = idRef.current as string;
      ctx.registry.register((scene) => buildRef.current(scene), id, sceneCtx.start);
      return () => {
         ctx.registry?.unregister(id);
      };
   }, [ctx.registry, sceneCtx.start]);
}

export type PureAnimationDefinitionProps = Omit<AnimationDefinition, "mount"> & {
   component: ComponentType;
   options: PureAnimationOptions;
   /** Optional one-shot setup hook called after refs mount. Useful for measurements. */
   setup?: () => void;
   /** Optional reset hook called whenever the loop restarts at t=0 or after a backward seek. */
   reset?: () => void;
};

/**
 * Factory for an animation. Mounts the supplied React component into the
 * iframe's `document.body`, lets nested `useMotion` calls register their
 * builders, then runs the pure animation loop.
 */
export function definePureAnimation(def: PureAnimationDefinitionProps): AnimationDefinition {
   return {
      name: def.name,
      frameWidth: def.frameWidth,
      frameHeight: def.frameHeight,
      async mount(doc): Promise<AnimationMountResult> {
         const body = doc.body;
         body.style.margin = "0";
         body.style.width = "100%";
         body.style.height = "100%";
         body.style.overflow = "hidden";
         doc.documentElement.style.height = "100%";

         const mount = doc.createElement("div");
         mount.id = "lf-react-root";
         mount.setAttribute("data-motion-root", "");
         mount.style.width = "100%";
         mount.style.height = "100%";
         body.replaceChildren(mount);

         const root = createRoot(mount);

         let handle: PureAnimationHandle | null = null;
         await new Promise<void>((resolve) => {
            root.render(
               createElement(PureAnimationHost, {
                  Component: def.component,
                  options: def.options,
                  setup: def.setup,
                  reset: def.reset,
                  onHandle: (h) => {
                     handle = h;
                  },
                  onReady: resolve,
               }),
            );
         });

         if (!handle) {
            throw new Error(`[motion] animation "${def.name}" failed to produce a runtime handle`);
         }

         const liveHandle = handle as PureAnimationHandle;
         return {
            timeline: liveHandle.fakeTimeline,
            duration: liveHandle.fakeTimeline.duration(),
            dispose() {
               liveHandle.dispose();
               root.unmount();
            },
         };
      },
   };
}

type HostProps = {
   Component: ComponentType;
   options: PureAnimationOptions;
   setup?: () => void;
   reset?: () => void;
   onHandle: (handle: PureAnimationHandle) => void;
   onReady: () => void;
};

function PureAnimationHost({ Component, options, setup, reset, onHandle, onReady }: HostProps) {
   const childBuildersRef = useRef<{ id: string; start: number; build: (scene: PureScene) => void }[]>([]);
   const handleRef = useRef<PureAnimationHandle | null>(null);
   const rootRef = useRef<Root | null>(null);
   void rootRef;

   const registry = useMemo<PureRuntimeRegistry>(
      () => ({
         register(build, id, start) {
            // Replace any prior registration with the same id (handles
            // strict-mode double-mount and HMR re-runs cleanly — without
            // this the registry would accumulate stale builders).
            const list = childBuildersRef.current;
            const existing = list.findIndex((entry) => entry.id === id);
            if (existing >= 0) list[existing] = { id, start, build };
            else list.push({ id, start, build });
         },
         unregister(id) {
            childBuildersRef.current = childBuildersRef.current.filter((entry) => entry.id !== id);
         },
         ready() {},
      }),
      [],
   );

   const ctxValue = useMemo<PureRuntimeContextValue>(() => ({ registry }), [registry]);

   // Layout effect → runs synchronously after DOM mutations (refs are
   // populated) but BEFORE the browser paints. Children's `useMotion`
   // layout effects run leaf-to-root, so by the time we get here every
   // child has registered its builder. We collect them, run the builders,
   // start the runtime (which calls `render(0, "seek")` synchronously),
   // and only then does React schedule the paint — so the first frame is
   // already posed to t=0 keyframe state. No FOUC.
   useLayoutEffect(() => {
      const scenes: PureScene[] = childBuildersRef.current.map(({ id: sceneId, start, build }) => {
         const scene = createPureScene(sceneId, start);
         build(scene);
         return scene;
      });

      const handle = runPureAnimation(scenes, {
         ...options,
         setup,
         onReset: reset,
      });
      handleRef.current = handle;
      onHandle(handle);
      onReady();

      return () => {
         handleRef.current?.dispose();
         handleRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   return (
      <PureRuntimeContext.Provider value={ctxValue}>
         <Component />
      </PureRuntimeContext.Provider>
   );
}

export type PureMotionRegisterPayload = ReactNode;
