import React from 'react'
import useStore, { TEST_TRACKS } from './store'

export default function QuickTestTrackButton() {
  const loadTestTrack = useStore((s) => s.api.loadTestTrack)
  const separating = useStore((s) => s.separating)
  const loaded = useStore((s) => s.loaded)
  const trackName = useStore((s) => s.trackName)

  if (!TEST_TRACKS.length) return null

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
      {TEST_TRACKS.map((track) => {
        const active = loaded && trackName === track.label

        return (
          <button
            key={track.id}
            type="button"
            disabled={separating}
            onClick={() => loadTestTrack(track.id)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: active ? '1px solid rgba(255,145,79,0.55)' : '1px solid rgba(255,255,255,0.12)',
              background: active ? 'rgba(255,145,79,0.14)' : 'rgba(255,255,255,0.05)',
              color: '#f3eee9',
              fontSize: 12,
              lineHeight: 1.35,
              textAlign: 'left',
              cursor: separating ? 'not-allowed' : 'pointer',
              opacity: separating ? 0.6 : 1,
              transition: 'background 160ms ease, border-color 160ms ease, opacity 160ms ease',
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 4,
              }}
            >
              Quick test
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span>{track.label}</span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: active ? '#ffb27d' : 'rgba(255,255,255,0.35)',
                }}
              >
                {active ? 'Loaded' : 'Load'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
