import { describe, expect, it } from 'vitest'
import fixture from '../fixtures/game.json'
import { parseGame } from './document'

describe('opening a game', () => {
  it('preserves a contract-shaped document', () => {
    expect(parseGame(JSON.stringify(fixture))).toEqual(fixture)
  })

  it('reports malformed JSON', () => {
    expect(() => parseGame('{"meta":')).toThrow('not valid JSON')
  })

  it('reports a missing start scene', () => {
    const game = { ...fixture, meta: { ...fixture.meta, startScene: 'missing' } }
    expect(() => parseGame(JSON.stringify(game))).toThrow('starting scene')
  })

  it('rejects entities that reference an undefined type', () => {
    const game = structuredClone(fixture)
    game.scenes[0].entities[0].type = 'unknown'
    expect(() => parseGame(JSON.stringify(game))).toThrow('known types')
  })
})
