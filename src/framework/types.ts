import type { PureTimeline } from "./pureMotion";

/**
 * A handle returned from an animation's `mount(doc)`. The boot pipeline wires
 * `timeline` and `duration` up to the React shell's scrubber + the capture
 * harness, and calls `dispose()` on hot-reload.
 */
export type AnimationMountResult = {
   timeline: PureTimeline;
   duration: number;
   dispose(): void;
};

/**
 * The default export of every animation module. The framework ships exactly
 * one factory — `definePureAnimation` — that produces this shape; authors
 * never construct it by hand.
 */
export type AnimationDefinition = {
   /** Human-readable name shown in the shell dropdown. */
   name: string;
   /** Optional canvas width override for this animation. */
   frameWidth?: number;
   /** Optional canvas height override for this animation. */
   frameHeight?: number;
   /**
    * Mount the animation into `doc.body` and return a handle the boot loader
    * can wire to the shell. Called once per iframe load.
    */
   mount(doc: Document): Promise<AnimationMountResult>;
};

export type { PureTimeline };
