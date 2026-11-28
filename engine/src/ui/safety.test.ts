import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [full] : [];
  });
}

describe("io and ui sources", () => {
  const files = [...sources(join(__dirname, "../io")), ...sources(__dirname)];

  it("never write game strings with innerHTML", () => {
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /innerHTML|outerHTML|insertAdjacentHTML/,
      );
    }
  });

  it("use no console calls or any", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/console\./);
      expect(text, file).not.toMatch(/:\s*any\b|\bas any\b/);
    }
  });
});
