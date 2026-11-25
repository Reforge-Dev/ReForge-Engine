import { isObject, type Entity, type GameDocument, type Scene } from './document'

const colors = ['#6ccdb6', '#9b86cf', '#e1ae69', '#d480a5']

export function entityColor(types: GameDocument['entityTypes'], name: string) {
  const definition = types[name]
  const components = definition.components
  const shape = isObject(components) ? components.shape : undefined
  const color = isObject(shape) ? shape.color : undefined
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : colors[Object.keys(types).indexOf(name) % colors.length]
}

function sizeOf(entity: Entity, definition: GameDocument['entityTypes'][string]) {
  const defaults = isObject(definition.components) ? definition.components : {}
  const overrides = isObject(entity.components) ? entity.components : {}
  const component = isObject(overrides.sprite) || isObject(defaults.sprite) ? 'sprite' : 'collider'
  const base = isObject(defaults[component]) ? defaults[component] : {}
  const instance = isObject(overrides[component]) ? overrides[component] : {}
  const dimensions = { ...base, ...instance }
  return [dimensions.w, dimensions.h].map((size) =>
    typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : 16,
  )
}

export function SceneView({ scene, types }: { scene: Scene; types: GameDocument['entityTypes'] }) {
  const [width, height] = scene.size
  return (
    <div className="viewport">
      <div className="scene-grid" role="img" aria-label={`${scene.id} scene with ${scene.entities.length} entities`}
        style={{ aspectRatio: width / height, backgroundSize: `${1600 / width}% ${1600 / height}%` }}>
        {scene.entities.map((entity, index) => {
          const [w, h] = sizeOf(entity, types[entity.type])
          return (
            <div key={index} className="entity" title={`${entity.type} · ${entity.x}, ${entity.y}`}
              style={{
                left: `${100 * entity.x / width}%`, top: `${100 * entity.y / height}%`,
                width: `${100 * w / width}%`, height: `${100 * h / height}%`,
                backgroundColor: entityColor(types, entity.type),
              }} />
          )
        })}
      </div>
    </div>
  )
}
