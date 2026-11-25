import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer'
import type { GameDocument, Scene } from './document'

enablePatches()

type Change = { forward: Patch[]; inverse: Patch[] }
export type History = { game: GameDocument; past: Change[]; future: Change[] }
export type Point = { x: number; y: number }

export function createHistory(game: GameDocument): History {
  return { game, past: [], future: [] }
}

export function moveEntity(history: History, sceneIndex: number, entityIndex: number, position: Point): History {
  // Traverse only the coordinates this command edits.
  const [edited, forward, inverse] = produceWithPatches<{ scenes: { entities: Point[] }[] }>(history.game, (draft) => {
    const entity = draft.scenes[sceneIndex]?.entities[entityIndex]
    if (!entity || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return
    entity.x = position.x
    entity.y = position.y
  })
  if (!forward.length) return history
  return { game: edited as GameDocument, past: [...history.past, { forward, inverse }], future: [] }
}

export function undo(history: History): History {
  const change = history.past.at(-1)
  if (!change) return history
  return {
    game: applyPatches(history.game, change.inverse),
    past: history.past.slice(0, -1),
    future: [...history.future, change],
  }
}

export function redo(history: History): History {
  const change = history.future.at(-1)
  if (!change) return history
  return {
    game: applyPatches(history.game, change.forward),
    past: [...history.past, change],
    future: history.future.slice(0, -1),
  }
}

export function pointerShift(sceneSize: Scene['size'], bounds: { width: number; height: number }, start: Point, current: Point): Point {
  return {
    x: Math.round((current.x - start.x) * sceneSize[0] / bounds.width),
    y: Math.round((current.y - start.y) * sceneSize[1] / bounds.height),
  }
}
