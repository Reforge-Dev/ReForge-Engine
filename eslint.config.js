import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "dungeon-crawler/**", "cyberops/**", "editor/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  prettier,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use the seeded RNG." },
        { object: "Date", property: "now", message: "No wall-clock time in simulation code." },
      ],
    },
  },
  {
    files: ["**/*.config.{js,ts}", "scripts/**"],
    languageOptions: { globals: { ...globals.node } },
  },
);
