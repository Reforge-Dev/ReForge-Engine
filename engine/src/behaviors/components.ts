import type { ComponentDef } from "../rules/types";
import { param } from "./util";

export const components: ComponentDef[] = [
  {
    name: "sprite",
    label: "Sprite (image)",
    params: [
      param("image", "Image", "asset", { required: true }),
      param("w", "Width", "number", { required: true, default: 16, min: 1 }),
      param("h", "Height", "number", { required: true, default: 16, min: 1 }),
      param("cols", "Frame columns", "number", { default: 1, min: 1 }),
      param("rows", "Frame rows", "number", { default: 1, min: 1 }),
      param("frame", "Frame", "number", { default: 0, min: 0 }),
      param("layer", "Layer", "number", { default: 0 }),
    ],
  },
  {
    name: "shape",
    label: "Shape (colored box or circle)",
    params: [
      param("kind", "Kind", "select", { default: "rect", options: ["rect", "circle"] }),
      param("color", "Color", "color", { default: "#8aa384" }),
      param("w", "Width", "number", { required: true, default: 16, min: 1 }),
      param("h", "Height", "number", { required: true, default: 16, min: 1 }),
      param("layer", "Layer", "number", { default: 0 }),
    ],
  },
  {
    name: "collider",
    label: "Collider (touch box)",
    params: [
      param("w", "Width", "number", { required: true, default: 16, min: 0 }),
      param("h", "Height", "number", { required: true, default: 16, min: 0 }),
      param("solid", "Blocks movement", "boolean", { default: false }),
    ],
  },
  {
    name: "health",
    label: "Health",
    params: [
      param("max", "Maximum", "number", { required: true, default: 10, min: 1 }),
      param("hp", "Current", "number", { help: "Defaults to the maximum." }),
    ],
  },
  {
    name: "mover",
    label: "Mover (keyboard)",
    params: [
      param("mode", "Mode", "select", { default: "topdown", options: ["topdown"] }),
      param("speed", "Speed (px/s)", "number", { required: true, default: 90, min: 0 }),
    ],
  },
  {
    name: "ai",
    label: "AI movement",
    params: [
      param("mode", "Mode", "select", { default: "chase", options: ["chase", "patrol", "flee"] }),
      param("speed", "Speed (px/s)", "number", { required: true, default: 40, min: 0 }),
      param("target", "Target tag", "tag", {
        default: "player",
        help: "Chase or flee from entities with this tag.",
      }),
      param("range", "Sight range (px)", "number", { min: 0, help: "Empty = unlimited." }),
    ],
  },
  {
    name: "inventory",
    label: "Inventory",
    params: [],
    help: "Holds item counts; created automatically by giveItem.",
  },
  {
    name: "node",
    label: "Graph node",
    help: "Draws links to other entities listed in the instance's `links` and colors itself by `status`.",
    params: [
      param("status", "Status", "string", {
        default: "healthy",
        help: "healthy, haunted, working, lost, or your own.",
      }),
    ],
  },
  {
    name: "label",
    label: "Text label",
    params: [param("text", "Text", "string", { help: "Defaults to the instance's `name`." })],
  },
  {
    name: "tags",
    label: "Tags",
    params: [],
    help: "Tags live on the entity (type `tags` plus instance `tags`).",
  },
];
