import { createGameWith } from "./core/game";
import type { Game, GameOptions } from "./core/game";
import { Simulation } from "./core/sim";
import type { SimOptions } from "./core/sim";
import { isObj } from "./core/json";
import { registry } from "./behaviors/index";
import { validateGame } from "./schema/index";

export const version = "0.1.0";

/** Create a game on a canvas. Never throws: invalid JSON yields a Game whose start() reports the errors. */
export function createGame(
  gameJson: unknown,
  canvas: HTMLCanvasElement,
  opts: GameOptions = {},
): Game {
  return createGameWith(gameJson, canvas, opts, registry);
}

/** The headless simulation, for tests and tools. Throws only if the game fails validateGame. */
export function createSimulation(
  gameJson: unknown,
  opts: Omit<SimOptions, "registry"> = {},
): Simulation {
  const result = validateGame(gameJson);
  if (!result.ok || !isObj(gameJson)) {
    throw new Error(
      `Invalid game: ${result.errors[0]?.path ?? "/"} ${result.errors[0]?.message ?? ""}`,
    );
  }
  return new Simulation(gameJson, { ...opts, registry });
}

export { validateGame, registry };
export { gameSchema } from "./schema/index";
export type { Game, GameOptions, GameEventName } from "./core/game";
export type { SimState } from "./core/sim";
export type { GameJson } from "./schema/index";
export type { InputFrame, Param, ParamType, EngineError } from "./types";
export { EMPTY_INPUT } from "./types";
