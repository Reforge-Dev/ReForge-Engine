import type { BehaviorMeta, Param } from "../types";

const POS_OPTIONS = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

const scene: Param = {
  name: "scene",
  label: "Only in scene",
  type: "scene",
  required: false,
  help: "Show this widget only while this scene is active. Leave empty to show it in every scene.",
};

const pos: Param = {
  name: "pos",
  label: "Position",
  type: "select",
  required: false,
  default: "top-left",
  options: POS_OPTIONS,
  help: "Where on the screen the widget sits. Widgets in the same position stack.",
};

const id = (required: boolean, help: string): Param => ({
  name: "id",
  label: "Id",
  type: "string",
  required,
  help,
});

const label = (text: string, required = false): Param => ({
  name: "label",
  label: text,
  type: "string",
  required,
});

const title: Param = { name: "title", label: "Title", type: "string", required: false };

const open: Param = {
  name: "open",
  label: "Always open",
  type: "boolean",
  required: false,
  default: false,
  help: "Show whenever its scene is active, without an open action.",
};

const bodyText: Param = {
  name: "text",
  label: "Text",
  type: "string",
  required: false,
  help: "Use {name} to insert a variable.",
};

/** Widget descriptors for the registry and manifest. */
export const widgetDefs: BehaviorMeta[] = [
  {
    name: "text",
    label: "Text",
    help: "Static text, or a variable shown as 'Label: value'.",
    params: [
      bodyText,
      { name: "var", label: "Variable", type: "variable", required: false },
      label("Label"),
      id(false, "Optional id."),
      scene,
      pos,
    ],
  },
  {
    name: "bar",
    label: "Progress bar",
    help: "Fills in proportion to a variable.",
    params: [
      { name: "var", label: "Variable", type: "variable", required: true },
      { name: "max", label: "Maximum", type: "number", required: true, default: 100, min: 1 },
      label("Label"),
      { name: "color", label: "Fill color", type: "color", required: false },
      id(false, "Optional id."),
      scene,
      pos,
    ],
  },
  {
    name: "button",
    label: "Button",
    help: "Raises a click event with its id when pressed.",
    params: [
      id(true, "Used by rules: when click target = this id."),
      { ...label("Label", true), default: "Button" },
      scene,
      pos,
    ],
  },
  {
    name: "panel",
    label: "Panel",
    help: "A box that is visible while it is open.",
    params: [id(true, "Used by openPanel and closePanel."), title, bodyText, open, scene, pos],
  },
  {
    name: "modal",
    label: "Modal",
    help: "A centered box over a dimmed screen, visible while it is open.",
    params: [id(true, "Used by openPanel and closePanel."), title, bodyText, open, scene],
  },
  {
    name: "list",
    label: "List",
    help: "Scrolling lines of text, newest at the bottom.",
    params: [id(true, "Used by the log action."), label("Title"), scene, pos],
  },
  {
    name: "log",
    label: "Log",
    help: "Scrolling lines of text, newest at the bottom.",
    params: [id(true, "Used by the log action."), label("Title"), scene, pos],
  },
  {
    name: "table",
    label: "Table",
    help: "A name and value row for each listed variable.",
    params: [
      {
        name: "vars",
        label: "Variables",
        type: "variable",
        required: true,
        help: "The variables to list. Stored as a list of names.",
      },
      title,
      id(false, "Optional id."),
      scene,
      pos,
    ],
  },
];
