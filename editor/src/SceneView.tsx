import { useRef, useState, type PointerEvent } from 'react'
import { pointerShift, type Point } from './history'
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

type Drag = {
  scene: Scene
  pointer: number
  index: number
  start: Point
  original: Point
}

export function SceneView({ scene, types, onMove }: {
  scene: Scene
  types: GameDocument['entityTypes']
  onMove: (index: number, position: Point) => void
}) {
  const [width, height] = scene.size
  const drag = useRef<Drag | null>(null)
  const [preview, setPreview] = useState<{ drag: Drag; position: Point } | null>(null)

  function begin(event: PointerEvent<HTMLDivElement>, index: number, entity: Entity) {
    if (event.button !== 0 || drag.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      scene, index, pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      original: { x: entity.x, y: entity.y },
    }
    setPreview({ drag: drag.current, position: drag.current.original })
  }

  function positionFor(event: PointerEvent<HTMLDivElement>, active: Drag) {
    const bounds = event.currentTarget.parentElement!.getBoundingClientRect()
    const shift = pointerShift(scene.size, bounds, active.start, { x: event.clientX, y: event.clientY })
    return { x: active.original.x + shift.x, y: active.original.y + shift.y }
  }

  function update(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    if (active?.pointer === event.pointerId && active.scene === scene) {
      setPreview({ drag: active, position: positionFor(event, active) })
    }
  }

  function finish(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    const active = drag.current
    if (active?.pointer !== event.pointerId) return
    drag.current = null
    setPreview(null)
    if (commit && active.scene === scene) onMove(active.index, positionFor(event, active))
  }

  return (
    <div className="viewport">
      <div className="scene-grid" role="group" aria-label={`${scene.id} scene with ${scene.entities.length} entities`}
        style={{ aspectRatio: width / height, backgroundSize: `${1600 / width}% ${1600 / height}%` }}>
        {scene.entities.map((entity, index) => {
          const [w, h] = sizeOf(entity, types[entity.type])
          const active = preview?.drag.scene === scene && preview.drag.index === index
          const position = active ? preview.position : entity
          return (
            <div key={index} className={active ? 'entity dragging' : 'entity'}
              title={`${entity.type} · ${position.x}, ${position.y}`}
              onPointerDown={(event) => begin(event, index, entity)}
              onPointerMove={update}
              onPointerUp={(event) => finish(event, true)}
              onPointerCancel={(event) => finish(event, false)}
              onLostPointerCapture={(event) => finish(event, false)}
              style={{
                left: `${100 * position.x / width}%`, top: `${100 * position.y / height}%`,
                width: `${100 * w / width}%`, height: `${100 * h / height}%`,
                backgroundColor: entityColor(types, entity.type),
              }} />
          )
        })}
      </div>
    </div>
  )
}
