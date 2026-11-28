import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));

// Serves the repo's examples/ folder with the engine source aliased in, for hot reload.
export default defineConfig({
  root: resolve(here, "../examples"),
  resolve: {
    alias: [
      {
        find: "@reforge/engine/style.css",
        replacement: resolve(here, "src/ui/reforge-engine.css"),
      },
      { find: "@reforge/engine", replacement: resolve(here, "src/index.ts") },
    ],
  },
  server: { fs: { allow: [resolve(here, "..")] }, open: "/hello/" },
});
