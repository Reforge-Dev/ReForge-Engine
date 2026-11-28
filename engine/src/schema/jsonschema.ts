import {
  GAME_REQUIRED,
  INSTANCE_REQUIRED,
  META_REQUIRED,
  RULE_REQUIRED,
  SCENE_REQUIRED,
} from "./shared";

type Schema = Record<string, unknown>;

const stringList: Schema = { type: "array", items: { type: "string" } };
const size: Schema = {
  type: "array",
  prefixItems: [
    { type: "number", exclusiveMinimum: 0 },
    { type: "number", exclusiveMinimum: 0 },
  ],
  minItems: 2,
  maxItems: 2,
};
const components: Schema = {
  type: "object",
  additionalProperties: { oneOf: [{ type: "object" }, stringList] },
};

/** JSON Schema (draft 2020-12) for game.json. Mirrors validateGame; structure only. */
export const gameSchema: Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/Reforge-Dev/ReForge-Engine/game.schema.json",
  title: "ReForge game.json",
  type: "object",
  required: [...GAME_REQUIRED],
  properties: {
    meta: {
      type: "object",
      required: [...META_REQUIRED],
      properties: {
        title: { type: "string" },
        version: { type: "number" },
        startScene: { type: "string" },
        theme: { type: "string" },
        background: { type: "string" },
        camera: {
          type: "object",
          properties: { follow: { type: "string" }, view: size },
        },
      },
    },
    variables: { type: "object" },
    tables: { type: "object", additionalProperties: { type: "array", items: { type: "object" } } },
    entityTypes: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: { tags: stringList, components },
      },
    },
    scenes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: [...SCENE_REQUIRED],
        properties: {
          id: { type: "string", minLength: 1 },
          size,
          background: { type: "string" },
          entities: {
            type: "array",
            items: {
              type: "object",
              required: [...INSTANCE_REQUIRED],
              properties: {
                type: { type: "string" },
                x: { type: "number" },
                y: { type: "number" },
                id: { type: "string", minLength: 1 },
                tags: stringList,
                components,
              },
            },
          },
        },
      },
    },
    rules: {
      type: "array",
      items: {
        type: "object",
        required: [...RULE_REQUIRED],
        properties: {
          id: { type: "string" },
          enabled: { type: "boolean" },
          when: { type: "object", required: ["event"], properties: { event: { type: "string" } } },
          if: {
            type: "array",
            items: { type: "object", required: ["cond"], properties: { cond: { type: "string" } } },
          },
          then: {
            type: "array",
            items: { type: "object", required: ["do"], properties: { do: { type: "string" } } },
          },
        },
      },
    },
    ui: {
      type: "array",
      items: { type: "object", required: ["widget"], properties: { widget: { type: "string" } } },
    },
  },
};
