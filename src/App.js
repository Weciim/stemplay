import * as THREE from 'three'
import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Reflector, useTexture, Text, OrbitControls } from '@react-three/drei'
import useStore from './store'
import Sidebar from './Sidebar'

const HPI = Math.PI / 2
const vec = new THREE.Vector3()
const obj = new THREE.Object3D()
const red = new THREE.Color('#900909')
const voiceColor = new THREE.Color('#b65c4f')

export default function App() {
  return (
    <>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [-7, 4.5, 12], fov: 36 }}>
        <color attach="background" args={['#d9d6d1']} />
        <fog attach="fog" args={['#d9d6d1', 12, 28]} />
        <Suspense fallback={null}>
          <MuseumLights />
          <group position-y={-0.25}>
            <MuseumRoom />
            <Graph position={[-2.8, 0.35, -1.8]} />
            <DancingDot />
            <Bust />
            <MuseumSculptures />
            <Explosion position={[0, 1.3, 0]} beat={0} />
            <Explosion position={[0.2, 0.65, 0]} beat={1} />
            <DrumParticles />
            <Ground />
          </group>
          <Intro />
          <OrbitControls enablePan={false} minDistance={7} maxDistance={18} maxPolarAngle={Math.PI / 2.05} target={[0, 2, 0]} />
        </Suspense>
      </Canvas>
      <Sidebar />
    </>
  )
}

function MuseumLights() {
  const { drums, bass, vocals, other } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)
  const warm = useRef()
  const top = useRef()
  const side = useRef()

  const isOff = (ch) => (solo ? solo !== ch : muted[ch])

  useFrame(() => {
    const d = isOff('drums') ? 0 : drums.envelope * drums.gain
    const b = isOff('bass') ? 0 : bass.envelope * bass.gain
    const v = isOff('vocals') ? 0 : vocals.envelope * vocals.gain
    const o = isOff('other') ? 0 : other.envelope * other.gain

    if (warm.current) warm.current.intensity = THREE.MathUtils.lerp(warm.current.intensity, 1.4 + d * 3.5 + v * 1.5, 0.08)
    if (top.current) top.current.intensity = THREE.MathUtils.lerp(top.current.intensity, 4 + v * 1.8 + o * 0.8, 0.08)
    if (side.current) side.current.intensity = THREE.MathUtils.lerp(side.current.intensity, 1.6 + b * 1.6 + o * 1.4, 0.08)
  })

  return (
    <>
      <ambientLight intensity={0.95} color="#ffffff" />
      <hemisphereLight intensity={0.8} color="#f8f8f4" groundColor="#9b9388" />
      <spotLight
        ref={top}
        position={[0, 10, 5]}
        angle={0.38}
        penumbra={1}
        intensity={4}
        color="#fff7ec"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight ref={side} position={[-8, 6, 8]} angle={0.55} penumbra={1} intensity={2} color="#f1f1f1" />
      <spotLight position={[8, 6, -4]} angle={0.55} penumbra={1} intensity={1.8} color="#f7dbd0" />
      <pointLight ref={warm} position={[0, 2.8, 0]} distance={10} intensity={1.5} color="#ff7b61" />
    </>
  )
}

function MuseumRoom() {
  return (
    <group>
      <mesh position={[0, 3.5, -8]} receiveShadow>
        <boxGeometry args={[18, 7, 0.4]} />
        <meshStandardMaterial color="#4b5c09" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[-9, 3.5, 0]} receiveShadow>
        <boxGeometry args={[0.4, 7, 16]} />
        <meshStandardMaterial color="#4b5c09" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[9, 3.5, 0]} receiveShadow>
        <boxGeometry args={[0.4, 7, 16]} />
        <meshStandardMaterial color="#4b5c09" roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh position={[0, 7, 0]} receiveShadow>
        <boxGeometry args={[18, 0.4, 16]} />
        <meshStandardMaterial color="#4b5c09" roughness={1} metalness={0} />
      </mesh>
      <Plinth position={[-5.5, 0, -3.5]} />
      <Plinth position={[5.5, 0, -3.5]} />
      <Plinth position={[-5.5, 0, 3.2]} />
      <Plinth position={[5.5, 0, 3.2]} />
      <Text position={[0, 5.7, -7.78]} fontSize={0.28} color="#7e746a" anchorX="center">
        AUDIO REACTIVE SCULPTURE STUDIES
      </Text>
    </group>
  )
}

function Plinth({ position }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[1.5, 0.9, 1.5]} />
      <meshStandardMaterial color="#f3efe8" roughness={0.92} metalness={0.03} />
    </mesh>
  )
}

function Bust() {
  const wrap = useRef()
  const ref = useRef()
  const time = useRef(0)
  const { scene, animations, materials } = useGLTF('/bust.glb')
  const clone = useMemo(() => scene.clone(true), [scene])
  const { actions, mixer } = useAnimations(animations, ref)
  const { vocals } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  useEffect(() => {
    Object.keys(actions).forEach((key) => actions[key].play())
  }, [actions])

  useFrame(() => {
    const isOff = solo ? solo !== 'vocals' : muted.vocals
    const vocalEnergy = isOff ? 0 : vocals.envelope * vocals.gain
    const targetTime = vocalEnergy * 6.5
    mixer.setTime((time.current = THREE.MathUtils.lerp(time.current, targetTime, vocalEnergy > 0.1 ? 0.1 : 0.04)))
    if (materials.inner) {
      materials.inner.color
        .copy(red)
        .lerp(voiceColor, vocalEnergy * 0.5)
        .multiplyScalar(0.35 + vocalEnergy * 4.5)
    }
    if (wrap.current) {
      wrap.current.rotation.y += 0.0012 + vocalEnergy * 0.01
      wrap.current.position.y = THREE.MathUtils.lerp(wrap.current.position.y, 0.2 + vocalEnergy * 0.32, 0.08)
      const s = 1 + vocalEnergy * 0.06
      wrap.current.scale.lerp(vec.set(s, s, s), 0.08)
    }
  })

  return (
    <group ref={wrap} position={[0, 0.2, 0]}>
      <primitive scale={[0.23, 0.23, 0.23]} position={[0, 0.2, 0]} rotation={[0, -2.35, 0]} ref={ref} object={clone} />
      <pointLight position={[0, 2.4, 0.5]} intensity={3.2} distance={6} color="#ff8a6d" />
      <Text position={[0, -0.45, 2.2]} fontSize={0.16} color="#5f5750" anchorX="center">
        VOCAL FRACTURE STUDY
      </Text>
    </group>
  )
}

function MuseumSculptures() {
  return (
    <group>
      <BassChestStatue position={[-5.5, 0.92, -3.5]} rotation={[0, 0.45, 0]} label="BASS CHEST RESONANCE" />
      <PaintingWall position={[0, 1.2, -7]} rotation={[0, -Math.PI / 2, 0]} label="PAINTING FRAGMENT FIELD" />
      <DrumShard position={[-5.5, 1.2, 3.2]} accent="#9a1111" label="DRUM SHARD" />
      <OtherHalo position={[5.5, 1.4, 3.2]} accent="#7e0d0d" label="OTHER FIELD" />
    </group>
  )
}

function BassChestStatue({ position, rotation, label }) {
  const group = useRef()
  const chestLight = useRef()
  const chestCore = useRef()
  const morphMeshes = useRef([])
  const initialized = useRef(false)
  const { scene } = useGLTF('/chest_bump.glb')
  const { bass } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  useFrame(() => {
    if (!initialized.current && scene) {
      const found = []
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (!child.__materialCloned) {
            child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone()
            child.__materialCloned = true
          }
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((mat) => {
            mat.color.set('#575757')
            mat.roughness = 0.88
            mat.metalness = 0.0
            mat.emissive = new THREE.Color(0, 0, 0)
            mat.emissiveIntensity = 0
          })
          if (child.morphTargetInfluences && child.morphTargetInfluences.length > 0) found.push(child)
        }
      })
      morphMeshes.current = found
      initialized.current = true
    }

    const isOff = solo ? solo !== 'bass' : muted.bass
    const raw = isOff ? 0 : bass.envelope * bass.gain
    const e = THREE.MathUtils.clamp(raw * 22, 0, 1)
    const beat = !isOff && bass.signal ? 1 : 0
    const envelopeInflation = Math.pow(e, 0.6)

    morphMeshes.current.forEach((mesh) => {
      for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
        const current = mesh.morphTargetInfluences[i]
        if (beat) {
          mesh.morphTargetInfluences[i] = 1.0
        } else if (envelopeInflation > current) {
          mesh.morphTargetInfluences[i] = THREE.MathUtils.lerp(current, envelopeInflation, 0.3)
        } else {
          mesh.morphTargetInfluences[i] = THREE.MathUtils.lerp(current, 0.0, 0.1)
        }
      }
    })

    if (chestLight.current) {
      if (beat) {
        chestLight.current.intensity = 120
        chestLight.current.distance = 2.0
      } else {
        chestLight.current.intensity = THREE.MathUtils.lerp(chestLight.current.intensity, 1 + e * 8, 0.06)
        chestLight.current.distance = THREE.MathUtils.lerp(chestLight.current.distance, 0.8 + e * 0.5, 0.08)
      }
    }
    if (chestCore.current) {
      if (beat) {
        chestCore.current.material.opacity = 1.0
        const s = 0.22
        chestCore.current.scale.set(s, s, s)
      } else {
        const s = 0.08 + e * 0.08
        chestCore.current.scale.lerp(vec.set(s, s, s), 0.05)
        chestCore.current.material.opacity = THREE.MathUtils.lerp(chestCore.current.material.opacity, 0.2 + e * 0.5, 0.05)
      }
    }
    if (group.current) group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, position[1] + e * 0.1, 0.06)
  })

  return (
    <group ref={group} position={position} rotation={rotation}>
      <primitive object={scene} scale={[0.018, 0.018, 0.018]} />
      <group position={[-0.11, 2.8, 0.3]}>
        <mesh ref={chestCore}>
          <sphereGeometry args={[0.15, 24, 24]} />
          <meshBasicMaterial color="#ff1a12" transparent opacity={1} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <pointLight ref={chestLight} color="#ff1a12" intensity={10} distance={2.0} decay={1} />
      </group>
      <Text position={[0, -0.45, 1.55]} fontSize={0.11} color="#6a6158" anchorX="center" maxWidth={2}>
        {label}
      </Text>
    </group>
  )
}

function PaintingWall({ position, rotation, label }) {
  const root = useRef()
  const wallWrap = useRef()
  const frameLight = useRef()
  const { scene: source } = useGLTF('/frame_nourr.glb')
  const scene = useMemo(() => source.clone(true), [source])
  const animatedMeshes = useRef([])
  const staticMeshes = useRef([])
  const centerRef = useRef(new THREE.Vector3())
  const initialized = useRef(false)
  const { other } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)
  const tempA = useMemo(() => new THREE.Vector3(), [])
  const tempB = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (initialized.current) return
    const animated = []
    const statics = []
    const worldCenter = new THREE.Vector3()
    let count = 0
    scene.updateMatrixWorld(true)
    scene.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      if (child.material) {
        child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone()
      }
      child.getWorldPosition(tempA)
      worldCenter.add(tempA)
      count++
      animated.push({
        mesh: child,
        basePosition: child.position.clone(),
        baseRotation: child.rotation.clone(),
        baseScale: child.scale.clone(),
        worldBase: tempA.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.7 + Math.random() * 0.6,
        currentOut: 0,
        currentLift: 0,
        currentTwist: 0,
        dir: new THREE.Vector3(),
        edgeBias: 1,
      })
    })
    if (count > 0) worldCenter.divideScalar(count)
    centerRef.current.copy(worldCenter)
    animated.forEach((item) => {
      item.dir.copy(item.worldBase).sub(worldCenter)
      item.dir.z = 0
      if (item.dir.lengthSq() < 0.00001) item.dir.set(Math.random() - 0.5, Math.random() - 0.5, 0)
      item.edgeBias = THREE.MathUtils.clamp(item.dir.length() * 3.0, 0.85, 1.8)
      item.dir.normalize()
    })
    animatedMeshes.current = animated
    staticMeshes.current = statics
    initialized.current = true
  }, [scene, tempA])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const isOff = solo ? solo !== 'other' : muted.other
    const raw = isOff ? 0 : other.envelope * other.gain
    const e = THREE.MathUtils.clamp(raw * 5, 0, 1)
    const peak = Math.pow(e, 0.82)
    const beat = !isOff && other.signal ? 1 : 0
    const chaosAmount = THREE.MathUtils.clamp(peak * 0.9 + beat * 0.35, 0, 1)

    animatedMeshes.current.forEach((item, i) => {
      const { mesh, basePosition, baseRotation, baseScale, dir, phase, speed, edgeBias } = item
      const tangent = tempB.set(-dir.y, dir.x, 0).normalize()
      const ripple = Math.sin(t * speed + phase)
      const ripple2 = Math.cos(t * (speed * 0.78) + phase + i * 0.07)
      const swirl = Math.sin(t * (1.4 + speed) + phase * 1.7)
      const orbit = Math.cos(t * (0.9 + speed * 0.35) + phase * 0.6)
      const chaosOut = (0.03 + peak * 0.14 + beat * 0.04) * edgeBias
      const chaosSlide = (0.04 + peak * 0.22 + beat * 0.06) * (0.85 + edgeBias * 0.25)
      const chaosLift = 0.004 + peak * 0.025 + beat * 0.01
      const chaosTwist = 0.02 + peak * 0.18 + beat * 0.045
      const targetX = basePosition.x + dir.x * chaosOut * (0.65 + 0.35 * orbit) * chaosAmount + tangent.x * chaosSlide * swirl * chaosAmount
      const targetY = basePosition.y + dir.y * chaosOut * (0.65 + 0.35 * orbit) * chaosAmount + tangent.y * chaosSlide * ripple * chaosAmount
      const targetZ = basePosition.z + chaosLift * (0.4 + 0.6 * ripple2) * chaosAmount
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, 0.12 + chaosAmount * 0.05)
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.12 + chaosAmount * 0.05)
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, targetZ, 0.1 + chaosAmount * 0.04)
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, baseRotation.x + ripple * chaosTwist * 0.6 * chaosAmount, 0.12)
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, baseRotation.y + orbit * chaosTwist * 0.95 * chaosAmount, 0.12)
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, baseRotation.z + swirl * chaosTwist * 1.2 * chaosAmount, 0.12)
      const s = 1 + peak * 0.03 * chaosAmount + beat * 0.01
      mesh.scale.lerp(vec.set(baseScale.x * s, baseScale.y * s, baseScale.z * s), 0.1)
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if ('emissive' in mat) mat.emissive.set('#c77458')
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.02 + peak * 0.22 + beat * 0.12, 0.08)
      })
    })

    if (wallWrap.current) wallWrap.current.position.z = THREE.MathUtils.lerp(wallWrap.current.position.z, peak * 0.01 + beat * 0.004, 0.06)
    if (frameLight.current) {
      frameLight.current.intensity = THREE.MathUtils.lerp(frameLight.current.intensity, 0.55 + peak * 1.8 + beat * 0.8, 0.08)
      frameLight.current.distance = THREE.MathUtils.lerp(frameLight.current.distance, 2.6 + peak * 1.0, 0.08)
    }
  })

  return (
    <group ref={root} position={position} rotation={rotation}>
      <group ref={wallWrap} scale={[1.32, 1.32, 1.32]}>
        <primitive object={scene} />
      </group>
      <pointLight ref={frameLight} position={[0, 0.05, 0.45]} color="#c77458" intensity={0.75} distance={3.0} decay={2} />
      <Text position={[0, -1.55, 0.15]} fontSize={0.12} color="#7a7068" anchorX="center" maxWidth={2.8}>
        {label}
      </Text>
    </group>
  )
}

function OtherHalo({ position, accent, label }) {
  const group = useRef()
  const veilRefs = useRef([])
  const shardRefs = useRef([])
  const core = useRef()
  const glow = useRef()
  const { other } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)
  const baseColor = useMemo(() => new THREE.Color('#e7dfd4'), [])
  const warmColor = useMemo(() => new THREE.Color(accent), [accent])
  const brightColor = useMemo(() => new THREE.Color('#ffd6b8'), [])
  const stripCount = 9
  const strips = useMemo(
    () =>
      Array.from({ length: stripCount }, (_, i) => ({
        x: (i - (stripCount - 1) / 2) * 0.12,
        y: 0.95,
        z: (i - (stripCount - 1) / 2) * 0.035,
        phase: i * 0.48,
        speed: 0.75 + i * 0.08,
        tilt: (i - (stripCount - 1) / 2) * 0.05,
        scale: 1 - Math.abs(i - (stripCount - 1) / 2) * 0.035,
      })),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const isOff = solo ? solo !== 'other' : muted.other
    const raw = isOff ? 0 : other.envelope * other.gain
    const e = THREE.MathUtils.clamp(raw * 12, 0, 1)
    const peak = THREE.MathUtils.clamp(Math.pow(e, 0.72), 0, 1)

    if (group.current) {
      group.current.rotation.y += 0.0012 + e * 0.006
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, position[1] + e * 0.14, 0.06)
    }
    veilRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const cfg = strips[i]
      const spread = 1 + e * 1.8 + peak * 0.7
      const wave = Math.sin(t * cfg.speed + cfg.phase)
      const twist = Math.cos(t * (0.9 + i * 0.04) + cfg.phase)
      mesh.position.x = cfg.x * spread
      mesh.position.y = cfg.y + wave * (0.035 + e * 0.08)
      mesh.position.z = cfg.z + twist * (0.03 + e * 0.08)
      mesh.rotation.y = cfg.tilt + twist * (0.12 + e * 0.35)
      mesh.rotation.x = wave * (0.04 + e * 0.16)
      mesh.rotation.z = Math.sin(t * 0.6 + cfg.phase) * (0.05 + e * 0.18)
      const sx = cfg.scale * (1 + e * 0.22),
        sy = cfg.scale * (1 + e * 0.55 + peak * 0.18),
        sz = 1 + e * 0.08
      mesh.scale.lerp(vec.set(sx, sy, sz), 0.09)
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        mat.color
          .copy(baseColor)
          .lerp(warmColor, e * 0.65)
          .lerp(brightColor, peak * 0.35)
        mat.emissive.copy(warmColor).lerp(brightColor, peak * 0.35)
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.05 + e * 0.45 + peak * 0.22, 0.08)
      })
    })
    shardRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const angle = t * (0.35 + i * 0.05) + i * 1.15
      const radius = 0.32 + i * 0.04 + e * 0.35
      mesh.position.x = Math.cos(angle) * radius
      mesh.position.z = Math.sin(angle) * (0.18 + e * 0.12)
      mesh.position.y = 1.0 + Math.sin(t * (1 + i * 0.15) + i) * 0.08 + e * 0.18
      mesh.rotation.x += 0.005 + e * 0.02
      mesh.rotation.y += 0.004 + e * 0.016
      mesh.rotation.z += 0.003 + e * 0.014
      mesh.material.color
        .copy(baseColor)
        .lerp(warmColor, e * 0.5)
        .lerp(brightColor, peak * 0.4)
      mesh.material.emissive.copy(warmColor).lerp(brightColor, peak * 0.45)
      mesh.material.emissiveIntensity = THREE.MathUtils.lerp(mesh.material.emissiveIntensity, 0.08 + e * 0.6 + peak * 0.3, 0.08)
    })
    if (core.current) {
      const s = 0.18 + e * 0.22 + peak * 0.08
      core.current.scale.lerp(vec.set(s, s, s), 0.08)
      core.current.material.color.copy(warmColor).lerp(brightColor, peak * 0.45)
      core.current.material.opacity = THREE.MathUtils.lerp(core.current.material.opacity, 0.12 + e * 0.22 + peak * 0.12, 0.08)
    }
    if (glow.current) {
      glow.current.color.copy(warmColor).lerp(brightColor, peak * 0.4)
      glow.current.intensity = THREE.MathUtils.lerp(glow.current.intensity, 0.8 + e * 3.2 + peak * 1.4, 0.08)
      glow.current.distance = THREE.MathUtils.lerp(glow.current.distance, 2.2 + e * 1.3, 0.08)
    }
  })

  return (
    <group ref={group} position={position}>
      {strips.map((cfg, i) => (
        <mesh key={i} ref={(el) => (veilRefs.current[i] = el)} position={[cfg.x, cfg.y, cfg.z]} rotation={[0, cfg.tilt, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.07, 1.25, 0.018]} />
          <meshStandardMaterial color="#e7dfd4" roughness={0.72} metalness={0.08} emissive={accent} emissiveIntensity={0.05} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`shard-${i}`} ref={(el) => (shardRefs.current[i] = el)} castShadow receiveShadow>
          <octahedronGeometry args={[0.04 + i * 0.008, 0]} />
          <meshStandardMaterial color="#ece4d8" roughness={0.35} metalness={0.22} emissive={accent} emissiveIntensity={0.08} />
        </mesh>
      ))}
      <mesh ref={core} position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.14} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={glow} position={[0, 1.0, 0.25]} color={accent} intensity={1.2} distance={2.4} decay={2} />
      <Text position={[0, -0.95, 1.5]} fontSize={0.11} color="#6a6158" anchorX="center" maxWidth={2}>
        {label}
      </Text>
    </group>
  )
}

function DrumShard({ position, accent, label }) {
  const group = useRef()
  const pieces = useRef([])
  const { drums } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  useFrame((state) => {
    const isOff = solo ? solo !== 'drums' : muted.drums
    const e = isOff ? 0 : drums.envelope * drums.gain
    const beat = !isOff && drums.signal ? 1 : 0
    if (!group.current) return
    group.current.rotation.y += 0.004 + e * 0.05
    pieces.current.forEach((mesh, i) => {
      if (!mesh) return
      const a = state.clock.elapsedTime * (0.8 + i * 0.2)
      mesh.position.y = Math.sin(a) * 0.08 + e * (0.22 + i * 0.05) + beat * 0.12
      mesh.rotation.x += 0.01 + e * 0.06
      mesh.rotation.z += 0.008 + e * 0.04
      mesh.material.emissiveIntensity = THREE.MathUtils.lerp(mesh.material.emissiveIntensity, 0.2 + e * 2.8 + beat * 1.2, 0.12)
    })
  })

  return (
    <group ref={group} position={position}>
      {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
        <mesh key={i} ref={(el) => (pieces.current[i] = el)} position={[x, 0.25 + i * 0.12, 0]} castShadow>
          <icosahedronGeometry args={[0.18 + i * 0.03, 0]} />
          <meshStandardMaterial color="#f1e8e0" emissive={accent} emissiveIntensity={0.25} roughness={0.4} metalness={0.28} />
        </mesh>
      ))}
      <Text position={[0, -0.8, 1.5]} fontSize={0.11} color="#6a6158" anchorX="center" maxWidth={2}>
        {label}
      </Text>
    </group>
  )
}

function Explosion({ beat, ...props }) {
  const [state] = useState({ size: 0 })
  const sceneRef = useRef()
  const instance = useRef()
  const sphere = useRef()
  const { scene: originalScene, animations } = useGLTF('/explosion.glb')
  const scene = useMemo(() => originalScene.clone(true), [originalScene])
  const { actions } = useAnimations(animations, sceneRef)
  const { drums, bass } = useStore((state) => state.audio)
  const track = useStore((state) => state.track)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  useEffect(() => {
    Object.keys(actions).forEach((key) => actions[key].play())
  }, [actions])

  const play = () =>
    Object.keys(actions).forEach((key) => {
      actions[key].setLoop(THREE.LoopOnce, 1)
      actions[key].stop()
      actions[key].reset()
      actions[key].play()
    })

  useFrame(() => {
    if (!sceneRef.current || !instance.current || !sphere.current) return
    const drumsOff = solo ? solo !== 'drums' : muted.drums
    const bassOff = solo ? solo !== 'bass' : muted.bass
    const drumStrength = drumsOff ? 0 : drums.envelope * drums.gain
    const bassStrength = bassOff ? 0 : bass.envelope * bass.gain
    if (!drumsOff && drums.signal && track.kicks - 1 === beat && drums.gain) {
      play()
      state.size = 0.8 + drumStrength * 0.9
    }
    state.size = THREE.MathUtils.lerp(state.size, drumStrength * 0.65, 0.12)
    sphere.current.scale.lerp(vec.set(state.size, state.size, state.size), 0.2)
    sphere.current.children[0].intensity = 4 + drumStrength * 18 + bassStrength * 4
    sceneRef.current.children.forEach((node, i) => {
      node.updateMatrixWorld()
      instance.current.setMatrixAt(i, node.matrixWorld)
    })
    instance.current.visible = !drumsOff && !!drums.gain
    instance.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group {...props}>
      <mesh ref={sphere}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.95} color="#ff7862" />
        <pointLight color="red" distance={0.8} intensity={10} />
      </mesh>
      <group scale={[0.05, 0.05, 0.05]}>
        <primitive ref={sceneRef} object={scene} visible={false} />
        <instancedMesh ref={instance} args={[null, null, originalScene.children.length]}>
          <circleGeometry args={[0.15, 8]} />
          <meshBasicMaterial toneMapped={false} color="#ff6a5a" />
        </instancedMesh>
      </group>
    </group>
  )
}

function DrumParticles() {
  const pointsRef = useRef()
  const { drums } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)
  const particleCount = 280
  const positions = useMemo(() => new Float32Array(particleCount * 3), [])
  const base = useMemo(() => {
    const arr = []
    for (let i = 0; i < particleCount; i++)
      arr.push({ x: (Math.random() - 0.5) * 14, y: Math.random() * 4.8 + 0.6, z: (Math.random() - 0.5) * 12, seed: Math.random() * 1000 })
    return arr
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    const isOff = solo ? solo !== 'drums' : muted.drums
    const energy = isOff ? 0 : drums.envelope * drums.gain
    const beatBoost = !isOff && drums.signal ? 1 : 0
    const t = state.clock.elapsedTime
    for (let i = 0; i < particleCount; i++) {
      const p = base[i],
        ix = i * 3
      positions[ix + 0] = p.x + Math.sin(t * 1.8 + p.seed) * 0.08 * (1 + energy * 2)
      positions[ix + 1] = p.y + Math.sin(t * 4 + p.seed) * 0.06 + energy * 0.9 + beatBoost * (Math.sin(i * 10.17 + t * 18) * 0.18 + 0.18)
      positions[ix + 2] = p.z + Math.cos(t * 1.2 + p.seed) * 0.08 * (1 + energy * 2)
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.material.size = THREE.MathUtils.lerp(pointsRef.current.material.size, 0.04 + energy * 0.12, 0.15)
    pointsRef.current.material.opacity = THREE.MathUtils.lerp(pointsRef.current.material.opacity, 0.2 + energy * 0.45, 0.1)
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={particleCount} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.06} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Graph(props) {
  const { other } = useStore((state) => state.audio)
  const ref = useRef()
  useFrame(() => {
    if (!ref.current) return
    for (let i = 0; i < 64; i++) {
      obj.position.set(i * 0.05, (other.data[i] || 0) / 950, 0)
      obj.updateMatrix()
      ref.current.setMatrixAt(i, obj.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, 64]} {...props}>
      <planeGeometry args={[0.025, 0.06]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} color="#ffffff" />
    </instancedMesh>
  )
}

function DancingDot() {
  const { drums, vocals } = useStore((state) => state.audio)
  const dot = useRef()
  useFrame((state) => {
    if (!dot.current) return
    dot.current.rotation.set(
      Math.sin(state.clock.elapsedTime * 2) / 10 + (drums.avg * drums.gain) / 100,
      state.clock.elapsedTime + (vocals.avg * vocals.gain) / 120,
      0,
    )
  })
  return (
    <group ref={dot}>
      <mesh position={[-3.3, 0.9, -0.6]}>
        <sphereGeometry args={[0.06, 32, 32]} />
        <meshBasicMaterial toneMapped={false} color="black" />
      </mesh>
    </group>
  )
}

function Ground() {
  const [floor, normal] = useTexture(['/SurfaceImperfections003_1K_var1.jpg', '/SurfaceImperfections003_1K_Normal.jpg'])
  return (
    <Reflector position={[0, 0.001, 0]} resolution={1024} args={[18, 16]} mirror={0.65} mixBlur={8} mixStrength={0.9} rotation={[-HPI, 0, 0]} blur={[500, 90]}>
      {(Material, props) => <Material color="#bfb8b0" metalness={0.42} roughnessMap={floor} normalMap={normal} normalScale={[0.08, 0.08]} {...props} />}
    </Reflector>
  )
}

function Intro() {
  const clicked = useStore((state) => state.clicked)
  const api = useStore((state) => state.api)
  useEffect(() => {
    api.loaded()
  }, [api])
  return useFrame((state) => {
    if (clicked) {
      state.camera.position.lerp(vec.set(-4 + state.mouse.x * 0.8, 3.2 + state.mouse.y * 0.25, 10.5), 0.035)
      state.camera.lookAt(0, 2, 0)
    }
  })
}

useGLTF.preload('/bust.glb')
useGLTF.preload('/explosion.glb')
useGLTF.preload('/chest_bump.glb')
useGLTF.preload('/frame_nourr.glb')
