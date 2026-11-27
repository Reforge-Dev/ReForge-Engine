import type { Param, ParamType } from "../types";

/** Build a Param descriptor. Required defaults to false. */
export function param(
  name: string,
  label: string,
  type: ParamType,
  extra: Partial<Omit<Param, "name" | "label" | "type">> = {},
): Param {
  return { name, label, type, required: false, ...extra };
}

export const TARGET_OPTIONS = ["self", "other", "selected"];
