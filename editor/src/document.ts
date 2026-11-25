type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type JsonObject = { [key: string]: Json }

export type Entity = JsonObject & { type: string; x: number; y: number }
export type Scene = JsonObject & { id: string; size: [number, number]; entities: Entity[] }
export type GameDocument = JsonObject & {
  meta: JsonObject & { title: string; startScene: string }
  entityTypes: Record<string, JsonObject>
  scenes: Scene[]
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isScene(value: unknown, types: JsonObject): value is Scene {
  return isObject(value) && typeof value.id === 'string'
    && Array.isArray(value.size) && value.size.length === 2
    && value.size.every((length) => typeof length === 'number' && Number.isFinite(length) && length > 0)
    && Array.isArray(value.entities)
    && value.entities.every((entity) => isObject(entity) && typeof entity.type === 'string'
      && Object.hasOwn(types, entity.type)
      && typeof entity.x === 'number' && Number.isFinite(entity.x)
      && typeof entity.y === 'number' && Number.isFinite(entity.y))
}

// Check the fields this editor can display. The engine validator will check gameplay.
export function parseGame(source: string): GameDocument {
  let data: unknown
  try {
    data = JSON.parse(source)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!isObject(data) || !isObject(data.meta) || typeof data.meta.title !== 'string'
    || typeof data.meta.startScene !== 'string' || !isObject(data.entityTypes)
    || !Object.values(data.entityTypes).every(isObject)) {
    throw new Error('Expected game metadata and an entityTypes object.')
  }
  const types = data.entityTypes
  const startScene = data.meta.startScene
  if (!Array.isArray(data.scenes) || !data.scenes.every((scene) => isScene(scene, types))) {
    throw new Error('Each scene needs a size and entities with known types and numeric positions.')
  }
  if (!data.scenes.some((scene) => scene.id === startScene)) {
    throw new Error('The starting scene listed in meta.startScene is missing.')
  }
  return data as GameDocument
}
