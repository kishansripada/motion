/**
 * vite-plugin-runner
 *
 * Serves /run/<id>.html by:
 *   1. Finding animations/<id>/animation.tsx or animation.ts.
 *   2. Reading animations/<id>/snapshot.html when present (legacy / product
 *      UI demos), or generating a blank shell for React-first scenes.
 *   3. Stripping any Content-Security-Policy <meta> tag so inline ES modules
 *      can load (CSPs copied from production apps usually forbid this).
 *   4. Appending a tiny <script type="module"> that imports the framework boot
 *      module and starts playback with the resolved animation module path.
 *
 * This is what lets authors write animations as real ES modules with HMR,
 * rather than as string-concatenated IIFEs inside a Node script.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const RUN_RE = /^\/run\/([^/?]+)\.html(?:\?.*)?$/;

function blankShell(id: string) {
   return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${id}</title>
  </head>
  <body></body>
</html>`;
}

export function runnerPlugin(): Plugin {
   return {
      name: "motion-runner",
      configureServer(server) {
         server.middlewares.use((req, res, next) => {
            const match = RUN_RE.exec(req.url || "");
            if (!match) return next();
            const id = match[1];
            const animationDir = resolve(server.config.root, "animations", id);
            const tsxPath = resolve(animationDir, "animation.tsx");
            const tsPath = resolve(animationDir, "animation.ts");
            const modulePath = existsSync(tsxPath)
               ? `/animations/${id}/animation.tsx`
               : existsSync(tsPath)
                 ? `/animations/${id}/animation.ts`
                 : null;

            if (!modulePath) {
               res.statusCode = 404;
               res.setHeader("Content-Type", "text/plain; charset=utf-8");
               res.end(`No animation module for "${id}". Expected animation.tsx or animation.ts in ${animationDir}`);
               return;
            }

            const snapshotPath = resolve(animationDir, "snapshot.html");
            let html = existsSync(snapshotPath) ? readFileSync(snapshotPath, "utf8") : blankShell(id);

            // Production DOM dumps almost always include a CSP that blocks
            // inline <script> and external ES modules. We're running locally
            // against a trusted copy, so drop it. The attribute may be quoted,
            // unquoted, or single-quoted, any casing, and the tag can span
            // multiple lines -- match all variants.
            const cspSource =
               "<meta\\s[^>]*http-equiv\\s*=\\s*" +
               "[" +
               '"' +
               "'" +
               "]?" +
               "content-security-policy" +
               "[" +
               '"' +
               "'" +
               "]?" +
               "[^>]*>";
            html = html.replace(new RegExp(cspSource, "gi"), "");

            const boot = `
<script type="module">
  import RefreshRuntime from "/@react-refresh";
  RefreshRuntime.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
  window.__vite_plugin_react_preamble_installed__ = true;

  import { boot } from "/src/framework/boot.ts";
  boot(${JSON.stringify(id)}, ${JSON.stringify(modulePath)});
</script>
`;

            const bodyEnd = html.lastIndexOf("</body>");
            html = bodyEnd === -1 ? html + boot : html.slice(0, bodyEnd) + boot + html.slice(bodyEnd);

            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(html);
         });
      },
   };
}
