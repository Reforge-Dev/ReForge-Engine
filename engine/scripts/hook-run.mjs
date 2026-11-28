// Entry point for the Kiro save hooks in .kiro/hooks/. Usage: node engine/scripts/hook-run.mjs <gen|ts|game>
// Reads the hook's JSON context from stdin to find the saved file, runs one check, prints a plain
// result, appends a line to engine/dist/hooks.log, and exits 1 when the check fails.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const engineDir = resolve(here, "..");
const root = resolve(engineDir, "..");
const logFile = join(engineDir, "dist", "hooks.log");
const mode = process.argv[2];

function log(line) {
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, `${new Date().toISOString()} ${mode} ${line}\n`);
}

/** The saved file path from the hook's stdin JSON: the first string value that looks like a path. */
function savedFile(wanted) {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return undefined;
  }
  const found = [];
  const walk = (v) => {
    if (typeof v === "string") {
      if (wanted.test(v)) found.push(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  try {
    walk(JSON.parse(raw));
  } catch {
    if (wanted.test(raw.trim())) found.push(raw.trim());
  }
  return found[0];
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: opts.shell === true });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

const node = process.execPath;
const bin = (pkg, file) => join(root, "node_modules", pkg, file);

function finish(ok, message) {
  log(`${ok ? "PASS" : "FAIL"} ${message.split("\n")[0]}`);
  process.stdout.write(`${message}\n`);
  process.exit(ok ? 0 : 1);
}

if (mode === "gen") {
  const manifestFile = join(engineDir, "dist", "behaviors.manifest.json");
  const before = existsSync(manifestFile) ? readFileSync(manifestFile, "utf8") : "";
  const gen = run("pnpm", ["--filter", "engine", "gen"], { shell: true });
  if (gen.code !== 0) finish(false, `gen failed:\n${gen.out}`);
  const after = existsSync(manifestFile) ? readFileSync(manifestFile, "utf8") : "";
  // Working tree differs from the index (unstaged edit), or the file is untracked.
  run("git", ["update-index", "-q", "--refresh"]);
  const changed = run("git", ["diff", "--quiet", "--", "docs/behaviors.md"]).code === 0 ? "" : "docs/behaviors.md";
  const untracked = run("git", ["ls-files", "--others", "--exclude-standard", "--", "docs/behaviors.md"]).out;
  const unstaged = [changed, untracked].filter((s) => s !== "");
  const notes = [];
  if (before !== after) notes.push("dist/behaviors.manifest.json changed (it is a build output and is not tracked).");
  if (unstaged.length > 0) {
    finish(
      false,
      `docs/behaviors.md changed after regenerating and is not staged. Run: git add docs/behaviors.md\n${notes.join("\n")}`,
    );
  }
  finish(true, `Behavior docs and manifest are up to date and staged.\n${notes.join("\n")}`.trim());
} else if (mode === "ts") {
  const file = savedFile(/engine[\\/]src[\\/].*\.ts$/);
  const rel = file ? relative(root, resolve(root, file)) : undefined;
  const results = [];
  const tsc = run("pnpm", ["--filter", "engine", "typecheck"], { shell: true });
  results.push(tsc.code === 0 ? "typecheck: ok" : `typecheck: FAILED\n${tsc.out}`);
  if (rel) {
    const lint = run(node, [bin("eslint", "bin/eslint.js"), rel]);
    results.push(lint.code === 0 ? `lint ${rel}: ok` : `lint ${rel}: FAILED\n${lint.out}`);
    const fmt = run(node, [bin("prettier", "bin/prettier.cjs"), "--check", rel]);
    results.push(fmt.code === 0 ? `format ${rel}: ok` : `format ${rel}: FAILED\n${fmt.out}`);
    finish(tsc.code === 0 && lint.code === 0 && fmt.code === 0, results.join("\n"));
  }
  finish(tsc.code === 0, `${results.join("\n")}\n(no saved .ts path found in the hook input; linted nothing)`);
} else if (mode === "game") {
  const file = savedFile(/game\.json$/);
  const targets = file ? [resolve(root, file)] : findGames(root);
  const r = run(
    "pnpm",
    ["--filter", "engine", "exec", "vite-node", "scripts/validate-game.ts", "--", ...targets],
    { shell: true },
  );
  finish(r.code === 0, r.out || "validated");
} else {
  process.stderr.write("usage: hook-run.mjs <gen|ts|game>\n");
  process.exit(2);
}

function findGames(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", ".git", ".kiro"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) findGames(p, out);
    else if (name === "game.json") out.push(p);
  }
  return out;
}
