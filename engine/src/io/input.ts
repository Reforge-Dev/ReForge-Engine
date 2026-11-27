import { EMPTY_INPUT, type InputFrame, type InputSource } from "../types";

const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

function sorted(set: Set<string>): string[] {
  return [...set].sort();
}

export function createInput(
  canvas: HTMLCanvasElement,
  screenToWorld: (px: number, py: number) => { x: number; y: number },
): InputSource {
  const doc = canvas.ownerDocument;
  const win = doc.defaultView;
  const down = new Set<string>();
  const pressed = new Set<string>();
  const released = new Set<string>();
  let clicks: InputFrame["clicks"] = [];
  let pointer: { px: number; py: number } | null = null;

  function local(e: MouseEvent): { px: number; py: number } {
    const rect = canvas.getBoundingClientRect();
    return { px: e.clientX - rect.left, py: e.clientY - rect.top };
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (GAME_KEYS.has(e.code) && (e.target === canvas || e.target === doc.body)) e.preventDefault();
    if (down.has(e.code)) return;
    down.add(e.code);
    pressed.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    if (!down.delete(e.code)) return;
    released.add(e.code);
  };
  const onBlur = (): void => {
    for (const code of down) released.add(code);
    down.clear();
  };
  const onMove = (e: MouseEvent): void => {
    pointer = local(e);
  };
  const onMouseDown = (e: MouseEvent): void => {
    const p = local(e);
    pointer = p;
    const w = screenToWorld(p.px, p.py);
    clicks.push({ x: w.x, y: w.y, button: e.button });
  };

  win?.addEventListener("keydown", onKeyDown);
  win?.addEventListener("keyup", onKeyUp);
  win?.addEventListener("blur", onBlur);
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mousedown", onMouseDown);

  return {
    frame(): InputFrame {
      const mouse = pointer ? screenToWorld(pointer.px, pointer.py) : EMPTY_INPUT.mouse;
      const frame: InputFrame = {
        down: sorted(down),
        pressed: sorted(pressed),
        released: sorted(released),
        mouse: { x: mouse.x, y: mouse.y },
        clicks,
      };
      pressed.clear();
      released.clear();
      clicks = [];
      return frame;
    },
    destroy(): void {
      win?.removeEventListener("keydown", onKeyDown);
      win?.removeEventListener("keyup", onKeyUp);
      win?.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      down.clear();
      pressed.clear();
      released.clear();
      clicks = [];
    },
  };
}
