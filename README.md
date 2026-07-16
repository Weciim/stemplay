# STEMPlay - Interactive Audio-Reactive 3D Museum

An interactive web application that combines real-time audio stem analysis with reactive 3D visualizations in a virtual museum environment. Built with React Three Fiber and the Web Audio API.

## Overview

STEMPlay deconstructs a music track into four individual stems (drums, bass, vocals, other) and maps each stem's audio characteristics to distinct 3D sculptural elements within a museum scene. Users can mute/solo individual stems and observe how each channel drives its corresponding visual element in real time.

## Audio-Visual Mapping

| Stem   | 3D Element            | Reactive Behavior                                                    |
| ------ | --------------------- | -------------------------------------------------------------------- |
| Drums  | Lattice Columns (x4)  | Vertical stretch/squash on beat, emissive glow, dust particle bursts |
| Bass   | Chest Statue          | Morph-target inflation, glowing core sphere, positional lift         |
| Vocals | Fracture Bust         | Animation-driven fracture driven by vocal envelope                   |
| Other  | Chandelier + Painting | Chandelier swing/spin, painting fragment drift and sway              |

## Features

- Real-time FFT audio analysis with envelope followers and beat detection
- PBR museum environment with concrete textures, ambient/spot/point lighting
- Reflective floor using planar reflections (drei `Reflector`)
- Audio-reactive dynamic lighting (intensity, color, distance respond to stems)
- Camera shake and drift driven by combined audio energy
- Per-stem mute/solo controls via sidebar UI
- Custom GLSL shaders for particle effects

## Tech Stack

- **React** 18 + **React Three Fiber** (R3F) for declarative 3D
- **Three.js** 0.139 for WebGL rendering
- **@react-three/drei** for utilities (GLTF loader, Reflector, OrbitControls, textures)
- **Zustand** for global state management (audio data, mute/solo state)
- **Web Audio API** for decoding, playback, and real-time frequency analysis
- **FastAPI** + **Demucs** backend for audio stem separation
- **Blender** for 3D model creation (GLB/GLTF assets)

## Project Structure

```
src/
    App.js             - Main scene: museum room, lights, sculptures, camera logic
    store.js           - Zustand store: audio loading, playback, stem analysis, mute/solo API
    Sidebar.jsx        - Stem control UI (mute/solo per channel)
    index.js           - Entry point with loading overlay
    styles.css         - Global styles
backend/
    main.py            - FastAPI server: upload, YouTube download, stem separation endpoints
    separate.py        - Demucs stem separation logic
    audio_convert.py   - Audio format conversion utilities
    soundcloud.py      - SoundCloud URL handling
public/
    audio/             - Pre-separated audio stems (drums, bass, vocals, other)
    textures/          - PBR texture maps (concrete, painted surfaces)
    *.glb              - 3D models (columns, chandelier, bust, chest statue, painting frame, explosion)
docker/
    docker-compose.yml - Multi-service orchestration (frontend + backend)
    frontend.Dockerfile
    backend.Dockerfile
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **FFmpeg** (required by Demucs for audio processing)

### Running without Docker

1. **Install frontend dependencies:**

   ```bash
   npm install
   ```

2. **Install backend dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Start both frontend and backend:**

   ```bash
   npm start
   ```

   This runs the React dev server and the FastAPI backend concurrently.

   Alternatively, start them separately:

   ```bash
   # Terminal 1 - Backend
   python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8001

   # Terminal 2 - Frontend
   npm run start:web
   ```

4. Open [http://localhost:3000](http://localhost:3000), wait for assets to load, then click "enter exhibition" to start audio playback and visualization.

### Running with Docker

1. **Build and start the containers:**

   ```bash
   docker compose -f docker/docker-compose.yml up --build
   ```

2. Open [http://localhost:3000](http://localhost:3000) once both services are up.

3. **Stop the containers:**
   ```bash
   docker compose -f docker/docker-compose.yml down
   ```

> **Note:** The Docker setup mounts `src/` and `public/` as volumes for the frontend, and `backend/` for the backend, so code changes are reflected without rebuilding.

## Audio Stems

The application loads pre-separated stems from `public/audio/Drake-Overdrive/`:

- `drums.wav` - Percussion track with beat detection (threshold-based signal)
- `bass.wav` - Bass frequencies with envelope follower
- `vocals.wav` - Vocal track with envelope follower
- `other.wav` - Remaining instrumentation (synths, pads, effects)

## Controls

- **Mouse** - Camera look direction (subtle parallax)
- **Scroll/Pinch** - Zoom in/out (7-17 distance range)
- **Sidebar M** - Mute/unmute individual stems
- **Sidebar S** - Solo a stem (mutes all others)

https://on.soundcloud.com/SPmT4ajAI1i1F20CqQ
