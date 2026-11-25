import { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import sample from '../fixtures/game.json'
import { parseGame } from './document'
import { entityColor, SceneView } from './SceneView'
import './style.css'

function App() {
  const [game, setGame] = useState(() => parseGame(JSON.stringify(sample)))
  const [filename, setFilename] = useState('Sample game')
  const [error, setError] = useState('')
  const request = useRef(0)
  const scene = game.scenes.find(({ id }) => id === game.meta.startScene)!
  const types = Object.keys(game.entityTypes)

  async function openGame(file: File) {
    const current = ++request.current
    try {
      const nextGame = parseGame(await file.text())
      if (current !== request.current) return
      setGame(nextGame)
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
          <SceneView scene={scene} types={game.entityTypes} />
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
