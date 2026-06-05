import React from 'react'
import useStore from './store'

const CHANNELS = [
  { key: 'drums', label: 'DRUMS', icon: '🥁', desc: 'DrumShard + Particles + Explosions', accent: '#c0392b' },
  { key: 'bass',  label: 'BASS',  icon: '🎸', desc: 'Bass Chest Resonance',             accent: '#e67e22' },
  { key: 'vocals',label: 'VOCALS',icon: '🎤', desc: 'Vocal Fracture Bust',              accent: '#8e44ad' },
  { key: 'other', label: 'OTHER', icon: '🎨', desc: 'Painting Field + Other Halo',      accent: '#2980b9' },
]

export default function Sidebar() {
  const muted  = useStore((s) => s.muted)
  const solo   = useStore((s) => s.solo)
  const api    = useStore((s) => s.api)
  const clicked = useStore((s) => s.clicked)

  if (!clicked) return null

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>STEMS</span>
        <button style={styles.resetBtn} onClick={() => api.unmuteAll()} title="Unmute all">
          ↺
        </button>
      </div>

      {CHANNELS.map(({ key, label, icon, desc, accent }) => {
        const isMuted = solo ? solo !== key : muted[key]
        const isSolo  = solo === key
        return (
          <div key={key} style={{ ...styles.row, opacity: isMuted ? 0.38 : 1 }}>
            <div style={styles.rowTop}>
              <span style={styles.icon}>{icon}</span>
              <span style={{ ...styles.channelName, color: isMuted ? '#888' : accent }}>{label}</span>

              <button
                style={{ ...styles.btn, background: isMuted ? '#2a2a2a' : accent + '22', border: `1px solid ${isMuted ? '#444' : accent}`, color: isMuted ? '#666' : accent }}
                onClick={() => api.toggleMute(key)}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? 'M' : 'M'}
              </button>

              <button
                style={{ ...styles.btn, background: isSolo ? accent : '#2a2a2a', border: `1px solid ${isSolo ? accent : '#444'}`, color: isSolo ? '#fff' : '#888' }}
                onClick={() => api.setSolo(key)}
                title={isSolo ? 'Cancel solo' : 'Solo this stem'}
              >
                S
              </button>
            </div>
            <div style={styles.desc}>{desc}</div>
            <div style={{ ...styles.indicator, background: isSolo ? accent : isMuted ? '#2a2a2a' : accent + '55', boxShadow: isSolo ? `0 0 8px ${accent}` : 'none' }} />
          </div>
        )
      })}

      <div style={styles.hint}>M = mute · S = solo</div>
    </div>
  )
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: '50%',
    right: 16,
    transform: 'translateY(-50%)',
    width: 168,
    background: 'rgba(18,16,14,0.82)',
    backdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 0 10px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: 600,
  },
  resetBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 16,
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  row: {
    padding: '8px 14px 6px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'opacity 0.25s',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  icon: { fontSize: 13 },
  channelName: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 700,
    flex: 1,
    transition: 'color 0.2s',
  },
  btn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    cursor: 'pointer',
    transition: 'all 0.18s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  desc: {
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.5,
    lineHeight: 1.4,
    marginBottom: 5,
  },
  indicator: {
    height: 2,
    borderRadius: 2,
    transition: 'background 0.25s, box-shadow 0.25s',
  },
  hint: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.18)',
    letterSpacing: 1,
    textAlign: 'center',
    padding: '8px 14px 0',
  },
}