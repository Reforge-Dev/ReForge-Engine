// Constants shared by validate.ts and jsonschema.ts so the two cannot drift.

export const GAME_REQUIRED = ["meta", "entityTypes", "scenes"] as const;
export const META_REQUIRED = ["title", "startScene"] as const;
export const SCENE_REQUIRED = ["id", "size", "entities"] as const;
export const INSTANCE_REQUIRED = ["type", "x", "y"] as const;
export const RULE_REQUIRED = ["when", "then"] as const;

/** Maximum number of errors reported (keeps output small for hostile input). */
export const MAX_ERRORS = 100;
