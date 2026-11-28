// Renders docs/behaviors.md from a manifest. Pure, so tests can compare it with the committed file.
export interface Param {
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
export interface Entry {
  name: string;
  label: string;
  help?: string;
  params: Param[];
}
export type Manifest = { engineVersion: string } & Record<"events" | "conditions" | "actions" | "components" | "widgets", Entry[]>;


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


/** The full text of docs/behaviors.md. */
export function renderDocs(manifest: Manifest): string {
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
  return lines.join("\n");
}
