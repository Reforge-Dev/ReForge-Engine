// Generates dist/behaviors.manifest.json, dist/game.schema.json and docs/behaviors.md from the registry.
// Run with: pnpm -F engine gen   (uses vite-node)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../src/behaviors/index";
import { gameSchema } from "../src/schema/jsonschema";

interface Param {
  name: string;
  label: string;
  type: string;
  required: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  options?: string[];
  help?: string;
}
interface Entry {
  name: string;
  label: string;
  help?: string;
  params: Param[];
}
type Manifest = { engineVersion: string } & Record<"events" | "conditions" | "actions" | "components" | "widgets", Entry[]>;

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "../package.json"), "utf8")) as { version: string };
const manifest = registry.toManifest(pkg.version) as Manifest;

const distDir = resolve(here, "../dist");
mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, "behaviors.manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(resolve(distDir, "game.schema.json"), JSON.stringify(gameSchema, null, 2) + "\n");

const cell = (text: string): string => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

function paramLine(p: Param): string {
  const bits = [p.type];
  if (p.required) bits.push("required");
  if (p.default !== undefined) bits.push(`default \`${JSON.stringify(p.default)}\``);
  if (p.min !== undefined || p.max !== undefined) bits.push(`range ${p.min ?? "…"}–${p.max ?? "…"}`);
  if (p.options) bits.push(`one of ${p.options.map((o) => `\`${o}\``).join(", ")}`);
  const help = p.help ? `: ${p.help}` : "";
  return `\`${p.name}\` (${bits.join(", ")})${help}`;
}

const kinds: [keyof Omit<Manifest, "engineVersion">, string][] = [
  ["events", "Events (`when`)"],
  ["conditions", "Conditions (`if`)"],
  ["actions", "Actions (`then`)"],
  ["components", "Components"],
  ["widgets", "UI widgets"],
];

const lines = [
  "# Behavior catalog",
  "",
  `Generated from the engine registry (engine ${manifest.engineVersion}) by \`pnpm -F engine gen\`. Do not edit by hand.`,
  "",
];
for (const [key, title] of kinds) {
  lines.push(`## ${title}`, "");
  const entries = manifest[key];
  if (entries.length === 0) lines.push("_None registered yet._", "");
  else {
    lines.push("| Name | What it does | Parameters |", "| --- | --- | --- |");
    for (const e of entries) {
      const what = e.help ? `${e.label}. ${e.help}` : e.label;
      const params = e.params.length ? e.params.map((p) => cell(paramLine(p))).join("<br>") : "none";
      lines.push(`| \`${e.name}\` | ${cell(what)} | ${params} |`);
    }
    lines.push("");
  }
}
writeFileSync(resolve(here, "../../docs/behaviors.md"), lines.join("\n"));
process.stdout.write(`wrote manifest, schema and docs/behaviors.md (engine ${manifest.engineVersion})\n`);
process.exit(0);
