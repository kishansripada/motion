/**
 * Animation registry.
 *
 * Every entry corresponds to a folder under /animations/<id>/ that contains
 * an `animation.tsx` whose default export is built with `definePureAnimation`.
 *
 * The React shell reads this list to populate its dropdown. The Vite runner
 * plugin serves each entry at /run/<id>.html when the iframe loads it.
 *
 * To add an animation:
 *   1. mkdir animations/<id>
 *   2. touch animations/<id>/animation.tsx (definePureAnimation default export)
 *   3. add { id, name, frameWidth?, frameHeight? } below
 */
export type AnimationEntry = {
   id: string;
   name: string;
   frameWidth?: number;
   frameHeight?: number;
};

export const animations: AnimationEntry[] = [
   {
      id: "10-autosana-intro",
      name: "10 · autosana intro",
      frameWidth: 1440,
      frameHeight: 900,
   },
   {
      id: "12-panoptive-launch",
      name: "12 · panoptive launch",
      frameWidth: 1440,
      frameHeight: 900,
   },
   {
      id: "13-untitled-19",
      name: "13 · untitled project 19",
      frameWidth: 1920,
      frameHeight: 1080,
   },
   {
      id: "14-dex-demo",
      name: "14 · dex demo",
      frameWidth: 1920,
      frameHeight: 1080,
   },
   {
      id: "15-cheetah-primer",
      name: "15 · cheetah primer",
      frameWidth: 1920,
      frameHeight: 1080,
   },
];
