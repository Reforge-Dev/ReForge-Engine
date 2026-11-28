// Generates dist/behaviors.manifest.json, dist/game.schema.json and docs/behaviors.md from the registry.
// Run with: pnpm -F engine gen   (uses vite-node)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../src/behaviors/index";
import { gameSchema } from "../src/schema/jsonschema";
import { renderDocs, type Manifest } from "./docs";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "../package.json"), "utf8")) as { version: string };
const manifest = registry.toManifest(pkg.version) as Manifest;

const distDir = resolve(here, "../dist");
mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, "behaviors.manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(resolve(distDir, "game.schema.json"), JSON.stringify(gameSchema, null, 2) + "\n");

writeFileSync(resolve(here, "../../docs/behaviors.md"), renderDocs(manifest));
process.stdout.write(`wrote manifest, schema and docs/behaviors.md (engine ${manifest.engineVersion})\n`);
process.exit(0);
