import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const css = resolve(here, "src/ui/reforge-engine.css");

/** Publishes the widget stylesheet as dist/reforge-engine.css (tolerates a missing source). */
function copyStylesheet(): Plugin {
  return {
    name: "reforge-copy-stylesheet",
    apply: "build",
    closeBundle() {
      const dist = resolve(here, "dist");
      mkdirSync(dist, { recursive: true });
      rmSync(resolve(dist, "style.css"), { force: true }); // Vite's own css output, if any
      if (existsSync(css)) copyFileSync(css, resolve(dist, "reforge-engine.css"));
    },
  };
}

export default defineConfig({
  build: {
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
    emptyOutDir: true,
    lib: {
      entry: resolve(here, "src/index.ts"),
      formats: ["es"],
      fileName: () => "reforge-engine.js",
    },
    rollupOptions: { external: [], output: { inlineDynamicImports: true } },
  },
  plugins: [copyStylesheet()],
});
