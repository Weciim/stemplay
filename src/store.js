import create from 'zustand'
import { addEffect } from '@react-three/fiber'
import { uploadAndSeparate, separateFromSoundCloud, stemUrl, waitForJob } from './api'

// Pre-separated local test tracks — stems already sit in public/audio/<folder>/
// Update the folder name / filenames below to match exactly what you have on disk.
export const TEST_TRACKS = [
  {
    id: 'drake-overdrive',
    label: 'Drake — Overdrive (test)',
    stems: {
      drums: '/audio/Drake-Overdrive/drums.wav',
      bass: '/audio/Drake-Overdrive/bass.wav',
      vocals: '/audio/Drake-Overdrive/vocals.wav',
      other: '/audio/Drake-Overdrive/other.wav',
    },
  },
]

async function createAudio(url, { threshold = 0, expire = 0 } = {}) {
  const context = new (window.AudioContext || window.webkitAudioContext)()
  const res = await fetch(url)
  console.log(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} while loading ${url}`)
  const arrayBuffer = await res.arrayBuffer()
  if (!arrayBuffer?.byteLength) throw new Error(`Empty audio buffer for ${url}`)

  let audioBuffer
  try {
    audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0))
  } catch (e) {
    throw new Error(`Unable to decode audio data for ${url}: ${e.message}`)
  }

  const analyser = context.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.78

  const data = new Uint8Array(analyser.frequencyBinCount)
  const source = context.createBufferSource()
  source.buffer = audioBuffer
  source.loop = true

  const gainNode = context.createGain()
  gainNode.gain.value = 1

  source.connect(analyser)
  analyser.connect(gainNode)
  gainNode.connect(context.destination)

  let time = Date.now()
  let envelope = 0

  const state = {
    context,
    source,
    analyser,
    data,
    gain: 1,
    signal: false,
    avg: 0,
    envelope: 0,
    update() {
      const now = Date.now()
      let value = 0
      analyser.getByteFrequencyData(data)
      for (let i = 0; i < data.length; i++) value += data[i]
      const avg = value / data.length
      state.avg = avg

      const normalized = avg / 255
      envelope = normalized > envelope ? envelope + (normalized - envelope) * 0.22 : envelope + (normalized - envelope) * 0.06

      state.envelope = envelope

      if (threshold && avg > threshold && now - time > expire) {
        time = Date.now()
        state.signal = true
      } else {
        state.signal = false
      }
    },
    setGain(level) {
      state.gain = level
      gainNode.gain.setValueAtTime(level, context.currentTime)
    },
    async resume() {
      if (context.state === 'suspended') await context.resume()
    },
    stop() {
      try {
        source.stop(0)
      } catch {}
      try {
        context.close()
      } catch {}
    },
  }

  return state
}

const mockData = () => ({
  signal: false,
  avg: 0,
  gain: 1,
  data: [],
  envelope: 0,
  setGain() {},
  update() {},
  resume: async () => {},
  stop() {},
})

const stopAudioBundle = (audio) => {
  Object.values(audio || {}).forEach((stem) => {
    try {
      stem?.stop?.()
    } catch {}
  })
}

const emptyAudio = () => ({
  drums: mockData(),
  bass: mockData(),
  vocals: mockData(),
  other: mockData(),
})

const useStore = create((set, get) => ({
  loaded: false,
  clicked: false,
  separating: false,
  separationStatus: 'idle',
  separationProgress: '',
  trackName: null,
  jobId: null,
  error: null,
  audio: emptyAudio(),
  track: { kicks: 0 },
  muted: { drums: false, bass: false, vocals: false, other: false },
  solo: null,

  api: {
    async _runJob(startFn) {
      stopAudioBundle(get().audio)

      set({
        separating: true,
        separationStatus: 'uploading',
        separationProgress: 'Preparing…',
        loaded: false,
        clicked: false,
        error: null,
        trackName: null,
        jobId: null,
        audio: emptyAudio(),
      })

      try {
        const { jobId } = await startFn()

        set({
          jobId,
          separationStatus: 'processing',
          separationProgress: 'Separating stems with Demucs…',
        })

        const job = await waitForJob(jobId, {
          onProgress: (j) => {
            set({
              separationProgress: j.progress || 'Separating stems with Demucs…',
              separationStatus: j.status === 'error' ? 'error' : j.status,
            })
          },
        })

        await get().api.loadStems(job.stems, job.trackName)

        set({
          separating: false,
          separationStatus: 'ready',
          separationProgress: '',
          trackName: job.trackName,
          error: null,
        })
      } catch (e) {
        console.error(e)
        set({
          separating: false,
          separationStatus: 'error',
          separationProgress: '',
          error: e.message,
        })
        throw e
      }
    },

    async uploadTrack(file) {
      if (!file) throw new Error('No audio file selected')
      return get().api._runJob(() => uploadAndSeparate(file))
    },

    async uploadFromSoundCloud(url) {
      if (!url) throw new Error('No SoundCloud URL provided')
      return get().api._runJob(() => separateFromSoundCloud(url))
    },

    async loadStems(stems, trackName) {
      const [drums, bass, vocals, other] = await Promise.all([
        createAudio(stemUrl(stems, 'drums'), { threshold: 10, expire: 500 }),
        createAudio(stemUrl(stems, 'bass'), { threshold: 26, expire: 450 }),
        createAudio(stemUrl(stems, 'vocals'), { threshold: 18, expire: 320 }),
        createAudio(stemUrl(stems, 'other')),
      ])

      set({
        loaded: true,
        clicked: false,
        trackName: trackName || null,
        audio: { drums, bass, vocals, other },
        track: { kicks: 0 },
        muted: { drums: false, bass: false, vocals: false, other: false },
        solo: null,
      })
    },

    // NEW: load a bundled/local pre-separated test track (no upload, no separation job)
    async loadTestTrack(trackIdOrObject) {
      const track = typeof trackIdOrObject === 'string' ? TEST_TRACKS.find((t) => t.id === trackIdOrObject) : trackIdOrObject

      if (!track) throw new Error('Unknown test track')

      stopAudioBundle(get().audio)

      set({
        separating: true,
        separationStatus: 'processing',
        separationProgress: `Loading ${track.label}…`,
        loaded: false,
        clicked: false,
        error: null,
        trackName: null,
        jobId: null,
        audio: emptyAudio(),
      })

      try {
        const [drums, bass, vocals, other] = await Promise.all([
          createAudio(track.stems.drums, { threshold: 10, expire: 500 }),
          createAudio(track.stems.bass, { threshold: 26, expire: 450 }),
          createAudio(track.stems.vocals, { threshold: 18, expire: 320 }),
          createAudio(track.stems.other),
        ])

        set({
          loaded: true,
          clicked: false,
          trackName: track.label,
          audio: { drums, bass, vocals, other },
          track: { kicks: 0 },
          muted: { drums: false, bass: false, vocals: false, other: false },
          solo: null,
          separating: false,
          separationStatus: 'ready',
          separationProgress: '',
          error: null,
        })
      } catch (e) {
        console.error(e)
        set({
          separating: false,
          separationStatus: 'error',
          separationProgress: '',
          error: e.message,
        })
        throw e
      }
    },

    async start() {
      const audio = get().audio
      const files = Object.values(audio)
      const track = get().track

      for (const file of files) await file.resume?.()
      files.forEach(({ source }) => source?.start(0))

      set({ clicked: true })

      addEffect(() => {
        const { muted, solo } = get()
        files.forEach(({ update }) => update?.())

        const channels = ['drums', 'bass', 'vocals', 'other']
        channels.forEach((ch) => {
          const stem = audio[ch]
          if (!stem?.setGain) return
          const isOff = solo ? solo !== ch : muted[ch]
          const target = isOff ? 0 : 1
          if (Math.abs(stem.gain - target) > 0.005) stem.setGain(target)
        })

        if (audio.drums.signal) track.kicks++
      })
    },

    toggleMute(channel) {
      const { muted } = get()
      set({ muted: { ...muted, [channel]: !muted[channel] }, solo: null })
    },

    setSolo(channel) {
      const { solo } = get()
      set({
        solo: solo === channel ? null : channel,
        muted: { drums: false, bass: false, vocals: false, other: false },
      })
    },

    unmuteAll() {
      set({ muted: { drums: false, bass: false, vocals: false, other: false }, solo: null })
    },

    reset() {
      stopAudioBundle(get().audio)
      set({
        loaded: false,
        clicked: false,
        separating: false,
        separationStatus: 'idle',
        separationProgress: '',
        trackName: null,
        jobId: null,
        error: null,
        audio: emptyAudio(),
      })
    },
  },
}))

export default useStore
