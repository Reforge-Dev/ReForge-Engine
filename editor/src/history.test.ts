import { expect, it } from 'vitest'
import sample from '../fixtures/game.json'
import { parseGame } from './document'
import { createHistory, moveEntity, pointerShift, redo, undo } from './history'

it('creates one reversible step and changes only the selected position', () => {
  const original = parseGame(JSON.stringify(sample))
  const initial = createHistory(original)
  const edited = moveEntity(initial, 0, 5, { x: 118, y: 139 })
  const expected = structuredClone(original)
  Object.assign(expected.scenes[0].entities[5], { x: 118, y: 139 })
  expect(edited.game).toEqual(expected)
  expect(edited.past).toHaveLength(1)
  expect(undo(edited).game).toEqual(original)
  expect(redo(undo(edited)).game).toEqual(expected)
})

it('ignores no-op moves and clears redo after a different edit', () => {
  const original = parseGame(JSON.stringify(sample))
  const initial = createHistory(original)
  expect(moveEntity(initial, 0, 0, original.scenes[0].entities[0])).toBe(initial)
  const reverted = undo(moveEntity(initial, 0, 0, { x: 10, y: 20 }))
  const changed = moveEntity(reverted, 0, 0, { x: 30, y: 40 })
  expect(changed.future).toHaveLength(0)
})

it('converts screen movement to scene coordinates at the displayed scale', () => {
  expect(pointerShift([320, 240], { width: 640, height: 480 }, { x: 100, y: 100 }, { x: 123, y: 90 }))
    .toEqual({ x: 12, y: -5 })
})
