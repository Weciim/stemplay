import create from 'zustand'
import { addEffect } from '@react-three/fiber'

async function createAudio(url, { threshold = 0, expire = 0 } = {}) {
  const context = new (window.AudioContext || window.webkitAudioContext)()
  const res = await fetch(url)
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
    context, source, analyser, data,
    gain: 1, signal: false, avg: 0, envelope: 0,
    update() {
      const now = Date.now()
      let value = 0
      analyser.getByteFrequencyData(data)
      for (let i = 0; i < data.length; i++) value += data[i]
      const avg = value / data.length
      state.avg = avg
      const normalized = avg / 255
      envelope = normalized > envelope
        ? envelope + (normalized - envelope) * 0.22
        : envelope + (normalized - envelope) * 0.06
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
  }
  return state
}

const mockData = () => ({
  signal: false, avg: 0, gain: 1, data: [], envelope: 0,
  setGain() {}, update() {}, resume: async () => {},
})

const useStore = create((set, get) => ({
  loaded: false,
  clicked: false,
  audio: {
    drums: mockData(),
    bass: mockData(),
    vocals: mockData(),
    other: mockData(),
  },
  track: { kicks: 0 },
  muted: { drums: false, bass: false, vocals: false, other: false },
  solo: null,
  api: {
    async loaded() {
      try {
        const [drums, bass, vocals, other] = await Promise.all([
          createAudio('/audio/Drake-Overdrive/drums.wav', { threshold: 10, expire: 500 }),
          createAudio('/audio/Drake-Overdrive/bass.wav', { threshold: 26, expire: 450 }),
          createAudio('/audio/Drake-Overdrive/vocals.wav', { threshold: 18, expire: 320 }),
          createAudio('/audio/Drake-Overdrive/other.wav'),
        ])
        set({ loaded: true, audio: { drums, bass, vocals, other } })
      } catch (e) {
        console.error(e)
        alert(e.message)
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
      // toggle off if already soloing that channel
      set({
        solo: solo === channel ? null : channel,
        muted: { drums: false, bass: false, vocals: false, other: false },
      })
    },
    unmuteAll() {
      set({ muted: { drums: false, bass: false, vocals: false, other: false }, solo: null })
    },
  },
}))

export default useStore