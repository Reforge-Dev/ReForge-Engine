// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createInput } from "./input";

const identity = (px: number, py: number): { x: number; y: number } => ({ x: px, y: py });
const key = (type: "keydown" | "keyup", code: string): KeyboardEvent =>
  new KeyboardEvent(type, { code, bubbles: true, cancelable: true });

let canvas: HTMLCanvasElement | null = null;
function setup(convert = identity): ReturnType<typeof createInput> {
  canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  return createInput(canvas, convert);
}
afterEach(() => {
  canvas?.remove();
});

describe("createInput", () => {
  it("reports held keys sorted and pressed once", () => {
    const input = setup();
    window.dispatchEvent(key("keydown", "KeyW"));
    window.dispatchEvent(key("keydown", "KeyA"));
    window.dispatchEvent(key("keydown", "KeyA"));
    const first = input.frame();
    expect(first.down).toEqual(["KeyA", "KeyW"]);
    expect(first.pressed).toEqual(["KeyA", "KeyW"]);
    const second = input.frame();
    expect(second.down).toEqual(["KeyA", "KeyW"]);
    expect(second.pressed).toEqual([]);
    input.destroy();
  });

  it("reports a key pressed and released between ticks in both sets", () => {
    const input = setup();
    window.dispatchEvent(key("keydown", "Space"));
    window.dispatchEvent(key("keyup", "Space"));
    const f = input.frame();
    expect(f.down).toEqual([]);
    expect(f.pressed).toEqual(["Space"]);
    expect(f.released).toEqual(["Space"]);
    input.destroy();
  });

  it("releases every held key on blur", () => {
    const input = setup();
    window.dispatchEvent(key("keydown", "KeyD"));
    input.frame();
    window.dispatchEvent(new Event("blur"));
    const f = input.frame();
    expect(f.down).toEqual([]);
    expect(f.released).toEqual(["KeyD"]);
    input.destroy();
  });

  it("queues clicks in world coordinates and drains them", () => {
    const input = setup((px, py) => ({ x: px * 2, y: py * 2 }));
    canvas?.dispatchEvent(new MouseEvent("mousedown", { clientX: 10, clientY: 20, button: 0 }));
    const f = input.frame();
    expect(f.clicks).toEqual([{ x: 20, y: 40, button: 0 }]);
    expect(f.mouse).toEqual({ x: 20, y: 40 });
    expect(input.frame().clicks).toEqual([]);
    input.destroy();
  });

  it("prevents default for arrow keys on the canvas but not on other targets", () => {
    const input = setup();
    const onCanvas = key("keydown", "ArrowUp");
    canvas?.dispatchEvent(onCanvas);
    expect(onCanvas.defaultPrevented).toBe(true);
    const field = document.createElement("input");
    document.body.appendChild(field);
    const onField = key("keydown", "ArrowLeft");
    field.dispatchEvent(onField);
    expect(onField.defaultPrevented).toBe(false);
    field.remove();
    input.destroy();
  });

  it("removes its listeners on destroy", () => {
    const input = setup();
    input.destroy();
    window.dispatchEvent(key("keydown", "KeyW"));
    canvas?.dispatchEvent(new MouseEvent("mousedown", { clientX: 1, clientY: 1 }));
    const f = input.frame();
    expect(f.down).toEqual([]);
    expect(f.clicks).toEqual([]);
  });
});
