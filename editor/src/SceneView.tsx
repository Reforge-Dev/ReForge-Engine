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

const GRID = 16

type Gesture =
  | { kind: 'pan'; pointer: number; start: Point; scroll: Point }
  | { kind: 'box'; pointer: number; start: Point; end: Point; additive: boolean }
  | { kind: 'move'; pointer: number; start: Point; shift: Point; index: number; indices: number[] }

type Props = {
  scene: Scene
  types: GameDocument['entityTypes']
  selected: number[]
  onSelect: (indices: number[]) => void
  onMove: (indices: number[], shift: Point) => void
  onPlace: (type: string, point: Point) => void
  placement: string | null
  snap: boolean
  zoom: number
  pan: boolean
}

export function SceneView({ scene, types, selected, onSelect, onMove, onPlace, placement, snap, zoom, pan }: Props) {
  const [width, height] = scene.size
  const viewport = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [preview, setPreview] = useState<Gesture | null>(null)
  const selectedSet = new Set(selected)

  function world(event: PointerEvent<HTMLDivElement>) {
    const bounds = grid.current!.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) * width / bounds.width, y: (event.clientY - bounds.top) * height / bounds.height }
  }

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current || (event.button !== 0 && event.button !== 1)) return
    const screen = { x: event.clientX, y: event.clientY }
    const point = world(event)
    if (pan || event.button === 1) {
      const view = viewport.current!
      gesture.current = { kind: 'pan', pointer: event.pointerId, start: screen, scroll: { x: view.scrollLeft, y: view.scrollTop } }
    } else {
      if (!grid.current?.contains(event.target as Node)) {
        if (!event.shiftKey) onSelect([])
        return
      }
      if (placement) {
        const step = snap ? GRID : 1
        onPlace(placement, {
          x: Math.min(width - 1, Math.max(0, Math.round(point.x / step) * step)),
          y: Math.min(height - 1, Math.max(0, Math.round(point.y / step) * step)),
        })
        return
      }
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-entity]')
      if (target) {
        const index = Number(target.dataset.entity)
        if (event.shiftKey) {
          onSelect(selectedSet.has(index) ? selected.filter((item) => item !== index) : [...selected, index])
          return
        }
        const indices = selectedSet.has(index) ? selected : [index]
        onSelect(indices)
        gesture.current = { kind: 'move', pointer: event.pointerId, start: screen, shift: { x: 0, y: 0 }, index, indices }
      } else {
        gesture.current = { kind: 'box', pointer: event.pointerId, start: point, end: point, additive: event.shiftKey }
      }
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function shiftFor(event: PointerEvent<HTMLDivElement>, active: Extract<Gesture, { kind: 'move' }>) {
    const shift = pointerShift(scene.size, grid.current!.getBoundingClientRect(), active.start, { x: event.clientX, y: event.clientY })
    if (!snap || (!shift.x && !shift.y)) return shift
    const anchor = scene.entities[active.index]
    return {
      x: Math.round((anchor.x + shift.x) / GRID) * GRID - anchor.x,
      y: Math.round((anchor.y + shift.y) / GRID) * GRID - anchor.y,
    }
  }

  function update(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current
    if (active?.pointer !== event.pointerId) return
    if (active.kind === 'pan') {
      viewport.current!.scrollTo(active.scroll.x + active.start.x - event.clientX, active.scroll.y + active.start.y - event.clientY)
    } else if (active.kind === 'move') {
      setPreview({ ...active, shift: shiftFor(event, active) })
    } else {
      setPreview({ ...active, end: world(event) })
    }
  }

  function finish(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    const active = gesture.current
    if (active?.pointer !== event.pointerId) return
    gesture.current = null
    setPreview(null)
    if (!commit) return
    if (active.kind === 'move') onMove(active.indices, shiftFor(event, active))
    if (active.kind === 'box') {
      const end = world(event)
      const left = Math.min(active.start.x, end.x)
      const right = Math.max(active.start.x, end.x)
      const top = Math.min(active.start.y, end.y)
      const bottom = Math.max(active.start.y, end.y)
      const hits = left === right && top === bottom ? [] : scene.entities.flatMap((entity, index) => {
        const [w, h] = sizeOf(entity, types[entity.type])
        return entity.x < right && entity.x + w > left && entity.y < bottom && entity.y + h > top ? [index] : []
      })
      onSelect(active.additive ? [...new Set([...selected, ...hits])] : hits)
    }
  }

  const moving = preview?.kind === 'move' ? new Set(preview.indices) : null
  const box = preview?.kind === 'box' ? preview : null
  return (
    <div className={`viewport ${pan ? 'panning' : placement ? 'placing' : ''}`} ref={viewport}
      onPointerDown={begin} onPointerMove={update} onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)} onLostPointerCapture={(event) => finish(event, false)}>
      <div className="scene-grid" ref={grid} role="group" aria-label={`${scene.id} scene with ${scene.entities.length} entities`}
        style={{ width: `${zoom * 100}%`, maxWidth: `${zoom * 720}px`, aspectRatio: width / height,
          backgroundSize: `${1600 / width}% ${1600 / height}%` }}>
        {scene.entities.map((entity, index) => {
          const [w, h] = sizeOf(entity, types[entity.type])
          const active = preview?.kind === 'move' && moving?.has(index)
          const x = entity.x + (active ? preview.shift.x : 0)
          const y = entity.y + (active ? preview.shift.y : 0)
          return (
            <div key={index} data-entity={index}
              className={`entity${selectedSet.has(index) ? ' selected' : ''}${active ? ' dragging' : ''}`}
              title={`${entity.type} · ${x}, ${y}`}
              style={{ left: `${100 * x / width}%`, top: `${100 * y / height}%`,
                width: `${100 * w / width}%`, height: `${100 * h / height}%`,
                backgroundColor: entityColor(types, entity.type) }} />
          )
        })}
        {box && <div className="marquee" style={{
          left: `${100 * Math.min(box.start.x, box.end.x) / width}%`,
          top: `${100 * Math.min(box.start.y, box.end.y) / height}%`,
          width: `${100 * Math.abs(box.end.x - box.start.x) / width}%`,
          height: `${100 * Math.abs(box.end.y - box.start.y) / height}%`,
        }} />}
      </div>
    </div>
  )
}
