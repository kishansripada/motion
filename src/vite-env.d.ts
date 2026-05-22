/// <reference types="vite/client" />

// Local declaration to keep TS happy when vite/client types aren't resolvable
// in the IDE's worker. Vite's `?raw` suffix imports file contents as string.
declare module "*?raw" {
   const src: string;
   export default src;
}
declare module "*.html?raw" {
   const src: string;
   export default src;
}
