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
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return history
  return edit(history, (draft) => {
    const entity = draft.scenes[sceneIndex]?.entities[entityIndex]
    if (!entity) return
    entity.x = position.x
    entity.y = position.y
  })
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

// Keep Immer's draft type shallow while preserving unedited JSON fields.
type EditableGame = {
  meta: { startScene: string }
  scenes: { id: string; size: [number, number]; entities: (Point & { type: string })[] }[]
  rules?: { if?: { cond?: string; scene?: string }[]; then?: { do?: string; scene?: string }[] }[]
}

function edit(history: History, command: (draft: EditableGame) => void): History {
  const [game, forward, inverse] = produceWithPatches<EditableGame>(history.game as EditableGame, command)
  if (!forward.length) return history
  return { game: game as GameDocument, past: [...history.past, { forward, inverse }], future: [] }
}

export function placeEntity(history: History, scene: number, type: string, point: Point): History {
  if (!Object.hasOwn(history.game.entityTypes, type) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return history
  return edit(history, (draft) => {
    draft.scenes[scene].entities.push({ type, ...point })
  })
}

export function moveSelection(history: History, scene: number, indices: number[], shift: Point): History {
  if (!Number.isFinite(shift.x) || !Number.isFinite(shift.y)) return history
  return edit(history, (draft) => {
    for (const index of indices) {
      const entity = draft.scenes[scene]?.entities[index]
      if (entity && Number.isFinite(entity.x + shift.x) && Number.isFinite(entity.y + shift.y)) {
        entity.x += shift.x
        entity.y += shift.y
      }
    }
  })
}

export function editSelection(history: History, scene: number, indices: number[], action: 'delete' | 'duplicate' | 'front' | 'back', step: number): History {
  const selected = new Set(indices)
  const entities = history.game.scenes[scene].entities
  const group = entities.filter((_, index) => selected.has(index))
  if (!group.length) return history
  const rest = entities.filter((_, index) => !selected.has(index))
  const result = action === 'delete' ? rest
    : action === 'duplicate' ? [...entities, ...group.map((entity) => ({ ...structuredClone(entity), x: entity.x + step, y: entity.y + step }))]
    : action === 'front' ? [...rest, ...group] : [...group, ...rest]
  if (result.length === entities.length && result.every((entity, index) => entity === entities[index])) return history
  return edit(history, (draft) => { draft.scenes[scene].entities = result })
}

export function editScene(history: History, index: number | null, name: string): History {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || history.game.scenes.some((scene) => scene.id === name)) return history
  return edit(history, (draft) => {
    if (index === null) {
      draft.scenes.push({ id: name, size: [320, 240], entities: [] })
      return
    }
    const scene = draft.scenes[index]
    const old = scene.id
    scene.id = name
    if (draft.meta.startScene === old) draft.meta.startScene = name
    if (!Array.isArray(draft.rules)) return
    for (const rule of draft.rules) {
      if (!rule) continue
      for (const action of Array.isArray(rule.then) ? rule.then : []) {
        if (action?.do === 'changeScene' && action.scene === old) action.scene = name
      }
      if (Array.isArray(rule.if)) {
        for (const condition of rule.if) {
          if (condition?.cond === 'inScene' && condition.scene === old) condition.scene = name
        }
      }
    }
  })
}
