import type { Json } from "../types";

/** Show integers as they are and fractions with one decimal. */
export function formatValue(v: Json | undefined): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "number")
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

/** Replace `{name}` with the variable's value; unknown names become empty. */
export function interpolate(template: string, vars: Readonly<Record<string, Json>>): string {
  return template.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_m, name: string) => formatValue(vars[name]));
}

/** `threatLevel`, `threat_level`, `threat-level` -> `Threat level`. */
export function humanize(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced === "" ? "" : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Fraction of a bar to fill, always within 0..1. */
export function barFraction(value: Json | undefined, max: Json | undefined): number {
  if (typeof value !== "number" || typeof max !== "number") return 0;
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}
