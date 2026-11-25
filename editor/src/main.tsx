import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import sample from '../fixtures/game.json'
import { parseGame } from './document'
import { entityColor, SceneView } from './SceneView'
import { createHistory, editScene, editSelection, moveSelection, placeEntity, redo, undo, type Point } from './history'
import { downloadGame } from './game-file'
import './style.css'

function App() {
  const [history, setHistory] = useState(() => createHistory(parseGame(JSON.stringify(sample))))
  const { game } = history
  const [filename, setFilename] = useState('game.json')
  const [error, setError] = useState('')
  const request = useRef(0)
  const [activeScene, setActiveScene] = useState<number | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [placement, setPlacement] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [snap, setSnap] = useState(false)
  const [pan, setPan] = useState(false)
  const [sceneForm, setSceneForm] = useState<'add' | 'rename' | null>(null)
  const [sceneName, setSceneName] = useState('')
  const [sceneError, setSceneError] = useState('')
  const startIndex = game.scenes.findIndex(({ id }) => id === game.meta.startScene)
  const sceneIndex = activeScene !== null && game.scenes[activeScene] ? activeScene : startIndex
  const scene = game.scenes[sceneIndex]
  const types = Object.keys(game.entityTypes)

  function changeScene(index: number | null) {
    setActiveScene(index)
    setSelected([])
    setPlacement(null)
    setSceneForm(null)
    setSceneError('')
  }

  function submitScene(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = sceneName.trim()
    const next = editScene(history, sceneForm === 'add' ? null : sceneIndex, name)
    if (next === history) {
      setSceneError('Use a unique scene ID with lowercase letters, numbers, or hyphens.')
      return
    }
    setHistory(next)
    changeScene(sceneForm === 'add' ? game.scenes.length : sceneIndex)
  }

  function applySelection(action: 'delete' | 'duplicate' | 'front' | 'back') {
    if (!selected.length) return
    setHistory((current) => editSelection(current, sceneIndex, selected, action, snap ? 16 : 8))
    if (action === 'duplicate') setSelected(selected.map((_, index) => scene.entities.length + index))
    else if (action === 'front') setSelected(selected.map((_, index) => scene.entities.length - selected.length + index))
    else if (action === 'back') setSelected(selected.map((_, index) => index))
    else setSelected([])
  }

  function rewind(action: typeof undo) {
    setHistory(action)
    setSelected([])
    setPlacement(null)
  }

  function move(indices: number[], shift: Point) {
    setHistory((current) => current.game === game ? moveSelection(current, sceneIndex, indices, shift) : current)
  }

  function place(type: string, point: Point) {
    setHistory((current) => placeEntity(current, sceneIndex, type, point))
    setSelected([scene.entities.length])
    setPlacement(null)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]'))) return
      const key = event.key.toLowerCase()
      if (event.ctrlKey || event.metaKey) {
        if (key === 'z' || key === 'y') {
          event.preventDefault()
          rewind(key === 'y' || event.shiftKey ? redo : undo)
        } else if (key === 'd' && selected.length) {
          event.preventDefault()
          applySelection('duplicate')
        }
        return
      }
      if (key === 'escape') {
        setSelected([])
        setPlacement(null)
        setPan(false)
        return
      }
      if (!selected.length) return
      if (key === 'delete' || key === 'backspace') {
        event.preventDefault()
        applySelection('delete')
        return
      }
      const step = snap ? 16 : 1
      const nudges: Record<string, Point> = {
        arrowleft: { x: -step, y: 0 }, arrowright: { x: step, y: 0 },
        arrowup: { x: 0, y: -step }, arrowdown: { x: 0, y: step },
      }
      if (Object.hasOwn(nudges, key)) {
        event.preventDefault()
        setHistory((current) => moveSelection(current, sceneIndex, selected, nudges[key]))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function openGame(file: File) {
    const current = ++request.current
    try {
      const nextGame = parseGame(await file.text())
      if (current !== request.current) return
      setHistory(createHistory(nextGame))
      changeScene(null)
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
          <button type="button" className="save" onClick={() => downloadGame(game, filename)}>Save game</button>
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
              <li key={name}><button type="button" aria-pressed={placement === name} onClick={() => {
                setPlacement(placement === name ? null : name)
                setPan(false)
              }}>
                <span style={{ background: entityColor(game.entityTypes, name) }} />{name}
              </button></li>
            ))}</ul>
          ) : <p className="muted">No entity types.</p>}
        </aside>
        <section className="panel scene" aria-label="Scene editor">
          <nav className="scene-tabs" aria-label="Scenes">
            {game.scenes.map(({ id }, index) => (
              <button type="button" key={index} aria-current={index === sceneIndex ? 'true' : undefined}
                onClick={() => changeScene(index)}>{id}</button>
            ))}
            <button type="button" onClick={() => { setSceneForm('add'); setSceneName(''); setSceneError('') }}>+ Scene</button>
            <button type="button" onClick={() => { setSceneForm('rename'); setSceneName(scene.id); setSceneError('') }}>Rename</button>
          </nav>
          {sceneForm && <form className="scene-form" onSubmit={submitScene}>
            <label>Scene ID <input value={sceneName} onChange={(event) => setSceneName(event.target.value)} autoFocus /></label>
            <button type="submit">{sceneForm === 'add' ? 'Add scene' : 'Rename scene'}</button>
            <button type="button" onClick={() => setSceneForm(null)}>Cancel</button>
            {sceneError && <span role="alert">{sceneError}</span>}
          </form>}
          <div className="scene-title"><h2>{scene.id}</h2><span className="muted">{scene.size.join(' × ')}</span></div>
          <div className="history" role="group" aria-label="Edit history">
            <button type="button" disabled={!history.past.length} onClick={() => rewind(undo)}>Undo</button>
            <button type="button" disabled={!history.future.length} onClick={() => rewind(redo)}>Redo</button>
            <button type="button" aria-pressed={snap} onClick={() => setSnap(!snap)}>Snap to grid</button>
            <button type="button" aria-pressed={pan} onClick={() => { setPan(!pan); setPlacement(null) }}>Pan</button>
            <label>Zoom <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
              <option value={0.5}>50%</option><option value={1}>100%</option>
              <option value={1.5}>150%</option><option value={2}>200%</option>
            </select></label>
          </div>
          {placement && <p className="placement-hint">Click the grid to place {placement}. Esc cancels.</p>}
          <SceneView key={sceneIndex + ':' + scene.id + ':' + filename} scene={scene} types={game.entityTypes}
            selected={selected} onSelect={setSelected} onMove={move} onPlace={place}
            placement={placement} snap={snap} zoom={zoom} pan={pan} />
        </section>
        <aside className="panel details" aria-label="Scene details">
          <h2>{game.meta.title}</h2>
          <p className="muted">{scene.entities.length} entities</p>
          <div className="selection-tools" role="group" aria-label="Selected entities">
            <button type="button" disabled={!selected.length} onClick={() => applySelection('duplicate')}>Duplicate</button>
            <button type="button" disabled={!selected.length} onClick={() => applySelection('delete')}>Delete</button>
            <button type="button" disabled={!selected.length} onClick={() => applySelection('back')}>Send back</button>
            <button type="button" disabled={!selected.length} onClick={() => applySelection('front')}>Bring front</button>
          </div>
          <ol className="instances">
            {scene.entities.map((entity, index) => (
              <li key={index}><button type="button" aria-pressed={selected.includes(index)} onClick={(event) => {
                setSelected(event.shiftKey
                  ? selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index]
                  : [index])
              }}><span>{entity.type}</span><span className="muted">{entity.x}, {entity.y}</span></button></li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
