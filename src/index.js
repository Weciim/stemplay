import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App'
import useStore from './store'
import './styles.css'

function Overlay() {
  const loaded = useStore((state) => state.loaded)
  const clicked = useStore((state) => state.clicked)
  const api = useStore((state) => state.api)

  return (
    <div className={`fullscreen bg ${loaded ? 'loaded' : 'notready'} ${clicked ? 'clicked' : ''}`}>
      <div
        onClick={async () => {
          if (loaded) await api.start()
        }}
      >
        {!loaded ? (
          'loading'
        ) : (
          <>
            <span style={{ color: '#8c857d' }}>museum mode ready</span>
            <br />
            <span style={{ color: '#8c857d' }}>click to activate sound</span>
            <br />
            <b>
              <span style={{ color: '#1f1c19' }}>enter exhibition</span>
            </b>
          </>
        )}
      </div>
    </div>
  )
}

createRoot(document.querySelector('#root')).render(
  <>
    <App />
    <Overlay />
  </>
)