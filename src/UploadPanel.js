import { useCallback, useRef, useState } from 'react'
import useStore from './store'

export default function UploadPanel() {
  const [mode, setMode] = useState('upload')
  const [dragActive, setDragActive] = useState(false)
  const [scUrl, setScUrl] = useState('')
  const inputRef = useRef(null)

  const separating = useStore((s) => s.separating)
  const separationStatus = useStore((s) => s.separationStatus)
  const separationProgress = useStore((s) => s.separationProgress)
  const error = useStore((s) => s.error)
  const uploadTrack = useStore((s) => s.api.uploadTrack)
  const uploadFromSoundCloud = useStore((s) => s.api.uploadFromSoundCloud)

  const handleFile = useCallback(
    async (file) => {
      if (!file) return
      try {
        await uploadTrack(file)
      } catch {}
    },
    [uploadTrack],
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files?.[0]
      handleFile(file)
    },
    [handleFile],
  )

  const onSoundCloudSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!scUrl.trim()) return
      try {
        await uploadFromSoundCloud(scUrl.trim())
      } catch {}
    },
    [scUrl, uploadFromSoundCloud],
  )

  return (
    <div className="upload-panel">
      <div className="upload-tabs">
        <button
          type="button"
          className={mode === 'upload' ? 'tab active' : 'tab'}
          onClick={() => setMode('upload')}
        >
          Upload file
        </button>
        <button
          type="button"
          className={mode === 'soundcloud' ? 'tab active' : 'tab'}
          onClick={() => setMode('soundcloud')}
        >
          SoundCloud link
        </button>
      </div>

      {mode === 'upload' && (
        <div
          className={dragActive ? 'dropzone active' : 'dropzone'}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.flac,.m4a,.ogg,.aac"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="dropzone-icon">♫</div>
          <p className="dropzone-title">Drop an audio file here</p>
          <p className="dropzone-sub">or click to browse — MP3, WAV, FLAC, M4A</p>
        </div>
      )}

      {mode === 'soundcloud' && (
        <form className="soundcloud-card" onSubmit={onSoundCloudSubmit}>
          <p className="soundcloud-title">Paste a SoundCloud link</p>
          <p className="soundcloud-sub">Public track URLs only — soundcloud.com/artist/track</p>
          <div className="soundcloud-form">
            <input
              type="text"
              inputMode="url"
              placeholder="https://soundcloud.com/artist/track"
              value={scUrl}
              onChange={(e) => setScUrl(e.target.value)}
              disabled={separating}
            />
            <button type="submit" disabled={separating || !scUrl.trim()}>
              Separate
            </button>
          </div>
        </form>
      )}

      {separating && (
        <div className="status-box">
          <div className="spinner" />
          <span>{separationProgress || 'Working…'}</span>
        </div>
      )}

      {separationStatus === 'error' && error && (
        <div className="status-box error">{error}</div>
      )}
    </div>
  )
}