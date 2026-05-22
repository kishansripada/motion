/**
 * boot.ts — runs inside the /run/<id>.html iframe.
 *
 * Responsibilities:
 *   1. Wait for DOMContentLoaded
 *   2. Import the animation module at the runner-provided path
 *   3. Call `mount(document)` to render + start the pure runtime
 *   4. Expose `window.lfTimeline` and friends so the parent React shell's
 *      scrubber + the capture harness can drive playback.
 *
 * Intentionally tiny: the animation owns the mount, the timeline, and the
 * lifecycle. All this file does is wire the result to the iframe's window.
 */
import type { AnimationDefinition, AnimationMountResult, PureTimeline } from "./types";

function domReady(): Promise<void> {
   if (document.readyState !== "loading") return Promise.resolve();
   return new Promise((res) => document.addEventListener("DOMContentLoaded", () => res(), { once: true }));
}

type LfHost = Window & {
   lfTimeline?: PureTimeline;
   lfAnimation?: { id: string; name: string };
   lfPause?: () => void;
   lfResume?: () => void;
   lfReplay?: () => void;
   lfProgress?: (v?: number) => number;
   lfDuration?: () => number;
   lfSeek?: (seconds: number) => number;
   __lfMount?: AnimationMountResult;
};

function syncMediaToTimeline(time: number, play: boolean) {
   const media = Array.from(document.querySelectorAll<HTMLMediaElement>("video,audio"));
   for (const el of media) {
      const duration = Number.isFinite(el.duration) ? el.duration : time;
      const target = Math.max(0, Math.min(duration, time));

      if (Math.abs(el.currentTime - target) > 0.045) {
         el.currentTime = target;
      }

      if (play) {
         void el.play().catch(() => {
            // Browser autoplay policies can still reject unmuted media. The
            // next seek/pause keeps the media clock aligned with the timeline.
         });
      } else {
         el.pause();
      }
   }
}

export async function boot(id: string, modulePath = `/animations/${id}/animation.tsx`) {
   await domReady();

   const mod = (await import(/* @vite-ignore */ modulePath)) as { default: AnimationDefinition };
   const anim = mod.default;
   if (!anim || typeof anim.mount !== "function") {
      console.error(`[motion] animation "${id}" has no valid default export`);
      return;
   }

   // Tear down any previous mount on hot-reload before remounting.
   const host = window as LfHost;
   host.__lfMount?.dispose();
   host.__lfMount = undefined;

   const result = await anim.mount(document);
   host.__lfMount = result;
   const tl = result.timeline;

   Object.defineProperty(host, "lfTimeline", {
      get: () => host.__lfMount?.timeline ?? null,
      configurable: true,
   });
   host.lfAnimation = { id, name: anim.name };

   host.lfPause = () => {
      tl.pause();
      syncMediaToTimeline(tl.time(), false);
   };
   host.lfResume = () => {
      tl.resume();
      syncMediaToTimeline(tl.time(), true);
   };
   host.lfReplay = () => {
      tl.restart();
      syncMediaToTimeline(0, true);
   };
   host.lfProgress = (v?: number) => {
      if (typeof v === "number") {
         const next = tl.progress(v);
         syncMediaToTimeline(tl.time(), !tl.paused());
         return next;
      }
      return tl.progress();
   };
   host.lfDuration = () => result.duration;
   host.lfSeek = (seconds: number) => {
      tl.seek(seconds);
      syncMediaToTimeline(tl.time(), !tl.paused());
      return tl.time();
   };

   // Signal the parent shell that we're ready. The shell + capture harness
   // both key off this to mount the scrubber / take a screenshot.
   window.parent?.postMessage({ type: "lf-ready", id }, "*");
}
