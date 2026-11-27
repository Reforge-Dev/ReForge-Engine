// Fails the build if the core bundle is over 60 KB gzip (R12.2).
import process from "node:process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const LIMIT = 60 * 1024;
const file = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/reforge-engine.js");
const gz = gzipSync(readFileSync(file)).length;
process.stdout.write(`reforge-engine.js: ${(gz / 1024).toFixed(1)} KB gzip (limit ${LIMIT / 1024} KB)\n`);
if (gz > LIMIT) {
  process.stderr.write("Bundle is over the size budget.\n");
  process.exit(1);
}
