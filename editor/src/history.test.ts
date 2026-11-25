import { expect, it } from 'vitest'
import sample from '../fixtures/game.json'
import { parseGame } from './document'
import { createHistory, editScene, editSelection, moveEntity, moveSelection, pointerShift, redo, undo } from './history'

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

it('edits a selection as one reversible command', () => {
  const original = createHistory(parseGame(JSON.stringify(sample)))
  const moved = moveSelection(original, 0, [5, 6], { x: 4, y: -2 })
  expect(moved.past).toHaveLength(1)
  expect(moved.game.scenes[0].entities.slice(5, 7).map(({ x, y }) => [x, y]))
    .toEqual([[115, 122], [183, 104]])
  const duplicate = editSelection(moved, 0, [5, 6], 'duplicate', 8)
  expect(duplicate.game.scenes[0].entities.slice(-2).map(({ type }) => type)).toEqual(['player', 'key'])
  const reordered = editSelection(duplicate, 0, [8, 9], 'back', 8)
  expect(reordered.game.scenes[0].entities.slice(0, 2)).toEqual(duplicate.game.scenes[0].entities.slice(-2))
  const deleted = editSelection(reordered, 0, [0, 1], 'delete', 8)
  expect(deleted.game).toEqual(moved.game)
  expect(undo(deleted).game).toEqual(reordered.game)
  expect(undo(moved).game).toEqual(original.game)
})

it('adds a scene and renames its references without changing other data', () => {
  const game = parseGame(JSON.stringify({ ...sample, rules: [
    { id: 'go', when: { event: 'start' }, if: [{ cond: 'inScene', scene: 'crypt' }],
      then: [{ do: 'changeScene', scene: 'crypt' }, { do: 'showText', text: 'crypt' }] },
  ] }))
  const start = createHistory(game)
  const added = editScene(start, null, 'side-room')
  expect(added.game.scenes[1]).toEqual({ id: 'side-room', size: [320, 240], entities: [] })
  const renamed = editScene(added, 0, 'main-room')
  expect(renamed.game.meta.startScene).toBe('main-room')
  expect(renamed.game.rules).toEqual([
    { id: 'go', when: { event: 'start' }, if: [{ cond: 'inScene', scene: 'main-room' }],
      then: [{ do: 'changeScene', scene: 'main-room' }, { do: 'showText', text: 'crypt' }] },
  ])
  expect(editScene(renamed, null, 'side-room')).toBe(renamed)
  expect(undo(renamed).game).toEqual(added.game)
})
