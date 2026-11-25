import type { GameDocument } from './document'

export function serializeGame(game: GameDocument): string {
  return JSON.stringify(game, null, 2) + '\n'
}

export function downloadGame(game: GameDocument, filename: string): void {
  const file = new Blob([serializeGame(game)], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
