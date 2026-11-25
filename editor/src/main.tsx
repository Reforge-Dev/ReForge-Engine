import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import sample from '../fixtures/game.json'
import { parseGame } from './document'
import { entityColor, SceneView } from './SceneView'
import { createHistory, moveEntity, redo, undo } from './history'
import './style.css'

function App() {
  const [history, setHistory] = useState(() => createHistory(parseGame(JSON.stringify(sample))))
  const { game } = history
  const [filename, setFilename] = useState('Sample game')
  const [error, setError] = useState('')
  const request = useRef(0)
  const sceneIndex = game.scenes.findIndex(({ id }) => id === game.meta.startScene)
  const scene = game.scenes[sceneIndex]
  const types = Object.keys(game.entityTypes)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((!event.ctrlKey && !event.metaKey) || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea, [contenteditable]')) return
      const key = event.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return
      event.preventDefault()
      setHistory(key === 'y' || event.shiftKey ? redo : undo)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function openGame(file: File) {
    const current = ++request.current
    try {
      const nextGame = parseGame(await file.text())
      if (current !== request.current) return
      setHistory(createHistory(nextGame))
      setFilename(file.name)
      setError('')
    } catch (failure) {
      if (current !== request.current) return
      setError(failure instanceof Error ? failure.message : 'Could not open the file.')
    }
  }

  return (
    <main>
      <header className="top">
        <div className="brand"><span className="mark" aria-hidden="true">R</span><h1>ReForge Editor</h1></div>
        <div className="file">
          <span className="filename">{filename}</span>
          <label className="open">
            Open game
            <input type="file" accept=".json,application/json" onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) void openGame(file)
            }} />
          </label>
        </div>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="workspace">
        <aside className="panel" aria-label="Entity types">
          <h2>Entity types</h2>
          {types.length ? (
            <ul className="types">{types.map((name) => (
              <li key={name}><span style={{ background: entityColor(game.entityTypes, name) }} />{name}</li>
            ))}</ul>
          ) : <p className="muted">No entity types.</p>}
        </aside>
        <section className="panel scene" aria-label="Starting scene">
          <div className="scene-title"><h2>{scene.id}</h2><span className="muted">{scene.size.join(' × ')}</span></div>
          <div className="history" role="group" aria-label="Edit history">
            <button type="button" disabled={!history.past.length} onClick={() => setHistory(undo)}>Undo</button>
            <button type="button" disabled={!history.future.length} onClick={() => setHistory(redo)}>Redo</button>
          </div>
          <SceneView scene={scene} types={game.entityTypes} onMove={(index, position) => {
            setHistory((current) => current.game === game ? moveEntity(current, sceneIndex, index, position) : current)
          }} />
        </section>
        <aside className="panel details" aria-label="Scene details">
          <h2>{game.meta.title}</h2>
          <p className="muted">{scene.entities.length} entities</p>
          <ol className="instances">
            {scene.entities.map((entity, index) => (
              <li key={index}><span>{entity.type}</span><span className="muted">{entity.x}, {entity.y}</span></li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
