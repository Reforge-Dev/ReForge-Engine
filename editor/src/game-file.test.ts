import fc from 'fast-check'
import { expect, it } from 'vitest'
import sample from '../fixtures/game.json'
import { parseGame } from './document'
import { serializeGame } from './game-file'
import { createHistory, moveEntity } from './history'

it('saves edited coordinates and preserves other game fields on reopening', () => {
  fc.assert(fc.property(fc.jsonValue(), fc.integer(), fc.integer(), (custom, x, y) => {
    const game = parseGame(JSON.stringify({ ...sample, custom }))
    const original = structuredClone(game)
    const edited = moveEntity(createHistory(game), 0, 5, { x, y })
    Object.assign(original.scenes[0].entities[5], { x, y })
    expect(parseGame(serializeGame(edited.game))).toEqual(original)
  }))
})
