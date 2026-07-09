import { createRoot } from 'react-dom/client'
import React, { useEffect, useState } from 'react'
import App from './App'
import UploadPanel from './UploadPanel'
import useStore from './store'
import { checkBackend } from './api'
import './styles.css'
import TestButton from './TestButton'

function Overlay() {
  const [backendReady, setBackendReady] = useState(null)
  const loaded = useStore((state) => state.loaded)
  const clicked = useStore((state) => state.clicked)
  const separating = useStore((state) => state.separating)
  const separationStatus = useStore((state) => state.separationStatus)
  const trackName = useStore((state) => state.trackName)
  const api = useStore((state) => state.api)

  useEffect(() => {
    let cancelled = false
    const probe = async () => {
      const ok = await checkBackend()
      if (!cancelled) setBackendReady(ok)
    }
    probe()
    const timer = setInterval(probe, 4000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (clicked) return null

  return (
    <div className={`fullscreen bg ${loaded ? 'loaded' : 'notready'}`}>
      <div className="overlay-shell">
        <header className="brand-header">
          <img src="/stemplay_logo.png" alt="" className="brand-logo" />
          <h1 className="brand-name">StemPlay</h1>
        </header>

        <div className="overlay-layout">
          <div className="overlay-card">
            <TestButton />

            {backendReady === false && (
              <div className="overlay-error">
                <p>
                  Stem separation server is not running. Stop the app and run <code>npm start</code> from the project root.
                </p>
              </div>
            )}

            {backendReady === null && !loaded && !separating && (
              <div className="overlay-status">
                <div className="overlay-spinner" />
                <span>Connecting to separation server…</span>
              </div>
            )}

            {loaded && (
              <button
                type="button"
                className="overlay-btn overlay-btn-enter"
                onClick={async () => {
                  await api.start()
                }}
              >
                <span className="overlay-enter-label">museum mode ready</span>
                <strong>Enter exhibition</strong>
                {trackName && <span className="overlay-track-name">{trackName}</span>}
              </button>
            )}

            {separationStatus === 'idle' && backendReady && !loaded && (
              <p className="overlay-hint">MP3, WAV, FLAC, M4A, OGG · max 80 MB · first 2 min used for speed</p>
            )}
          </div>

          {backendReady && <UploadPanel />}
        </div>
      </div>
    </div>
  )
}

createRoot(document.querySelector('#root')).render(
  <>
    <App />
    <Overlay />
  </>,
)
