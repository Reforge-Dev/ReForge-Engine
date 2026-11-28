// Validates game.json files and prints each problem with its path, in plain English.
// Run with: pnpm -F engine exec vite-node scripts/validate-game.ts -- <file...>
import { readFileSync } from "node:fs";
import process from "node:process";
import { validateGame } from "../src/schema/index";

const files = process.argv.slice(2).filter((a) => a !== "--" && a.endsWith(".json"));
let failed = false;

if (files.length === 0) {
  process.stdout.write("No game.json given.\n");
}

for (const file of files) {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    failed = true;
    process.stdout.write(`${file}: not valid JSON (${e instanceof Error ? e.message : "parse error"})\n`);
    continue;
  }
  const result = validateGame(json);
  if (result.ok) {
    process.stdout.write(`${file}: OK\n`);
    continue;
  }
  failed = true;
  process.stdout.write(`${file}: ${result.errors.length} problem(s)\n`);
  for (const err of result.errors) {
    process.stdout.write(`  ${err.path === "" ? "(whole file)" : err.path}: ${err.message}\n`);
  }
}
process.exit(failed ? 1 : 0);
