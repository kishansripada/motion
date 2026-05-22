import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { runnerPlugin } from "./vite-plugin-runner";

export default defineConfig({
  plugins: [react(), tailwindcss(), runnerPlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@framework": resolve(__dirname, "src/framework"),
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: [__dirname],
    },
  },
});
