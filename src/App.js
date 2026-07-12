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
const LIGHT_PALETTE = {
  ambientNeutral: '#d8d6d0',
  ambientWarm: '#f2c6a2',
  ambientRose: '#e3b3c7',
  hemiSky: '#dbe6f2',
  hemiMint: '#9ed8cd',
  hemiLavender: '#b8afd9',
  groundBase: '#2c2b31',
  groundWine: '#44212b',
  groundTeal: '#1f3438',
  fillA: '#f1c5a8',
  fillB: '#9ccfd0',
  fillC: '#c5b3e6',
  rimA: '#ff8a5b',
  rimB: '#4fc7d8',
  rimC: '#d47cf3',
  paintingA: '#f0a873',
  paintingB: '#ffd6a8',
}
export default function App() {
  return (
    <>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [-6.1, 4.05, 10.9], fov: 34 }}>
        <color attach="background" args={['#171411']} />
        <fog attach="fog" args={['#171411', 11, 24]} />
        <Suspense fallback={null}>
          <MuseumLights />
          <group position-y={-0.25}>
            <MuseumRoom />
            <MuseumSculptures />
            <Ground />
          </group>
          <Intro />
          <OrbitControls enablePan={false} minDistance={7} maxDistance={17} maxPolarAngle={Math.PI / 2.05} target={[0.15, 1.95, -0.15]} />
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
  const sideA = useRef()
  const sideB = useRef()
  const frontFill = useRef()
  const backFill = useRef()
  const ceilingFill = useRef()
  const paintingLight = useRef()
  const roomFillA = useRef()
  const roomFillB = useRef()
  const ambient = useRef()
  const hemi = useRef()
  const rimLight = useRef()

  const isOff = (ch) => (solo ? solo !== ch : muted[ch])

  const baseAmbient = useMemo(() => new THREE.Color('#ffc300'), [])
  const warmAmber = useMemo(() => new THREE.Color('#d9925b'), [])
  const magenta = useMemo(() => new THREE.Color('red'), [])
  const cyan = useMemo(() => new THREE.Color('blue'), [])
  const violet = useMemo(() => new THREE.Color('#846cff'), [])
  const mint = useMemo(() => new THREE.Color('#57e0c2'), [])
  const coolBase = useMemo(() => new THREE.Color('orange'), [])
  const deepGround = useMemo(() => new THREE.Color('##fa4f5d'), [])
  const magentaGround = useMemo(() => new THREE.Color('#44bec7'), [])
  const tealGround = useMemo(() => new THREE.Color('#d696bb'), [])
  const paintWarm = useMemo(() => new THREE.Color('#cf875d'), [])
  const paintHot = useMemo(() => new THREE.Color('#ffe2ab'), [])

  const cAmbient = useMemo(() => baseAmbient.clone(), [])
  const cHemi = useMemo(() => coolBase.clone(), [])
  const cGround = useMemo(() => deepGround.clone(), [])
  const cFillA = useMemo(() => warmAmber.clone(), [])
  const cFillB = useMemo(() => cyan.clone(), [])
  const cRim = useMemo(() => magenta.clone(), [])
  const cPaint = useMemo(() => paintWarm.clone(), [])

  const drumRef = useRef(0)
  const bassRef = useRef(0)
  const vocalRef = useRef(0)
  const otherRef = useRef(0)
  const drumPulseRef = useRef(0)
  const prevDrumSignalRef = useRef(0)
  const phaseRef = useRef(0)

  useFrame((state, delta) => {
    const d = isOff('drums') ? 0 : drums.envelope * drums.gain
    const b = isOff('bass') ? 0 : bass.envelope * bass.gain
    const v = isOff('vocals') ? 0 : vocals.envelope * vocals.gain
    const o = isOff('other') ? 0 : other.envelope * other.gain

    const drumBeat = !isOff('drums') && drums.signal ? 1 : 0
    const justDrumBeat = drumBeat && !prevDrumSignalRef.current
    prevDrumSignalRef.current = drumBeat

    drumRef.current = THREE.MathUtils.damp(drumRef.current, d, 7.2, delta)
    bassRef.current = THREE.MathUtils.damp(bassRef.current, b, 6.2, delta)
    vocalRef.current = THREE.MathUtils.damp(vocalRef.current, v, 5.6, delta)
    otherRef.current = THREE.MathUtils.damp(otherRef.current, o, 4.0, delta)

    if (justDrumBeat) drumPulseRef.current = 1
    drumPulseRef.current = THREE.MathUtils.damp(drumPulseRef.current, 0, 2.3, delta)

    const drumEnergy = THREE.MathUtils.clamp(drumRef.current * 4.8, 0, 1)
    const bassEnergy = THREE.MathUtils.clamp(bassRef.current * 5.2, 0, 1)
    const vocalEnergy = THREE.MathUtils.clamp(vocalRef.current * 4.5, 0, 1)
    const otherEnergy = THREE.MathUtils.clamp(otherRef.current * 5.0, 0, 1)
    const drumPulse = drumPulseRef.current

    const colorDrive = THREE.MathUtils.clamp(drumEnergy * 0.65 + drumPulse * 0.9 + vocals.avg * vocals.gain * 0.006 + bassEnergy * 0.35, 0, 1)
    const pace = 0.55 + drumEnergy * 0.9 + drumPulse * 1.4 + otherEnergy * 0.35

    phaseRef.current += delta * pace
    const waveA = (Math.sin(phaseRef.current) + 1) * 0.5
    const waveB = (Math.sin(phaseRef.current + Math.PI * 0.5) + 1) * 0.5
    const waveC = (Math.sin(phaseRef.current + Math.PI) + 1) * 0.5

    const magentaMix = THREE.MathUtils.clamp(colorDrive * (0.25 + waveA * 0.85), 0, 1)
    const cyanMix = THREE.MathUtils.clamp(colorDrive * (0.25 + waveB * 0.95), 0, 1)
    const violetMix = THREE.MathUtils.clamp(colorDrive * (0.12 + waveC * 0.72), 0, 1)
    const mintMix = THREE.MathUtils.clamp(colorDrive * (0.1 + waveB * 0.48), 0, 1)

    cAmbient
      .copy(baseAmbient)
      .lerp(warmAmber, 0.08 + drumEnergy * 0.2 + vocalEnergy * 0.08)
      .lerp(magenta, magentaMix * 0.46)

    cHemi
      .copy(coolBase)
      .lerp(cyan, cyanMix * 0.72)
      .lerp(violet, violetMix * 0.34)
      .lerp(mint, mintMix * 0.2)

    cGround
      .copy(deepGround)
      .lerp(tealGround, cyanMix * 0.56)
      .lerp(magentaGround, magentaMix * 0.42)

    cFillA
      .copy(warmAmber)
      .lerp(magenta, magentaMix * 0.9)
      .lerp(paintHot, drumPulse * 0.12)

    cFillB
      .copy(cyan)
      .lerp(violet, violetMix * 0.62)
      .lerp(mint, mintMix * 0.35)

    cRim
      .copy(magenta)
      .lerp(cyan, cyanMix * 0.86)
      .lerp(violet, violetMix * 0.88)

    cPaint.copy(paintWarm).lerp(paintHot, 0.1 + colorDrive * 0.28 + vocalEnergy * 0.1)

    if (ambient.current) {
      ambient.current.color.copy(cAmbient)
      ambient.current.intensity = THREE.MathUtils.lerp(ambient.current.intensity, 0.2 + colorDrive * 0.2, 0.08)
    }

    if (hemi.current) {
      hemi.current.color.copy(cHemi)
      hemi.current.groundColor.copy(cGround)
      hemi.current.intensity = THREE.MathUtils.lerp(hemi.current.intensity, 0.38 + colorDrive * 0.38, 0.08)
    }

    if (top.current) {
      top.current.color.copy(cAmbient)
      top.current.intensity = THREE.MathUtils.lerp(top.current.intensity, 2.6 + colorDrive * 1.15 + vocalEnergy * 0.15, 0.08)
    }

    if (roomFillA.current) {
      roomFillA.current.color.copy(cFillA)
      roomFillA.current.intensity = THREE.MathUtils.lerp(roomFillA.current.intensity, 1.9 + colorDrive * 2.8 + drumPulse * 0.4, 0.08)
      roomFillA.current.distance = THREE.MathUtils.lerp(roomFillA.current.distance, 12.5 + colorDrive * 3.5, 0.08)
    }

    if (roomFillB.current) {
      roomFillB.current.color.copy(cFillB)
      roomFillB.current.intensity = THREE.MathUtils.lerp(roomFillB.current.intensity, 1.9 + colorDrive * 2.9 + bassEnergy * 0.18, 0.08)
      roomFillB.current.distance = THREE.MathUtils.lerp(roomFillB.current.distance, 12.5 + colorDrive * 3.5, 0.08)
    }

    if (sideA.current) {
      sideA.current.color.copy(cFillA)
      sideA.current.intensity = THREE.MathUtils.lerp(sideA.current.intensity, 0.9 + colorDrive * 1.0, 0.08)
    }

    if (sideB.current) {
      sideB.current.color.copy(cFillB)
      sideB.current.intensity = THREE.MathUtils.lerp(sideB.current.intensity, 0.9 + colorDrive * 1.05, 0.08)
    }

    if (frontFill.current) {
      frontFill.current.color.copy(cAmbient)
      frontFill.current.intensity = THREE.MathUtils.lerp(frontFill.current.intensity, 0.38 + colorDrive * 0.28, 0.08)
    }

    if (backFill.current) {
      backFill.current.color.copy(cHemi)
      backFill.current.intensity = THREE.MathUtils.lerp(backFill.current.intensity, 0.55 + colorDrive * 0.42, 0.08)
    }

    if (ceilingFill.current) {
      ceilingFill.current.color.copy(cPaint)
      ceilingFill.current.intensity = THREE.MathUtils.lerp(ceilingFill.current.intensity, 0.88 + colorDrive * 0.7, 0.08)
    }

    if (paintingLight.current) {
      paintingLight.current.color.copy(cPaint)
      paintingLight.current.intensity = THREE.MathUtils.lerp(paintingLight.current.intensity, 0.95 + colorDrive * 0.85, 0.08)
      paintingLight.current.distance = THREE.MathUtils.lerp(paintingLight.current.distance, 6.8 + colorDrive * 1.5, 0.08)
    }

    if (warm.current) {
      warm.current.color.copy(cAmbient).lerp(cPaint, 0.36)
      warm.current.intensity = THREE.MathUtils.lerp(warm.current.intensity, 1.05 + colorDrive * 1.05 + drumEnergy * 0.15, 0.08)
      warm.current.distance = THREE.MathUtils.lerp(warm.current.distance, 6.8 + colorDrive * 1.6, 0.08)
    }

    if (rimLight.current) {
      rimLight.current.color.copy(cRim)
      rimLight.current.intensity = THREE.MathUtils.lerp(rimLight.current.intensity, 0.65 + colorDrive * 2.8 + drumPulse * 0.5, 0.08)
      rimLight.current.distance = THREE.MathUtils.lerp(rimLight.current.distance, 5.3 + colorDrive * 2.0, 0.08)
    }
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={0.22} color="#9d958d" />
      <hemisphereLight ref={hemi} intensity={0.42} color="#6d8297" groundColor="#141218" />
      <spotLight ref={top} position={[0, 8.4, 0]} angle={0.95} penumbra={1} intensity={2.7} color="#9d958d" castShadow />
      <spotLight ref={sideA} position={[-8.6, 6.3, 7.2]} angle={0.7} penumbra={1} intensity={0.95} color="#d9925b" castShadow />
      <spotLight ref={sideB} position={[8.6, 6.3, 7.2]} angle={0.7} penumbra={1} intensity={0.95} color="#35d7ff" castShadow />
      <spotLight ref={frontFill} position={[0, 4.4, 10.4]} angle={0.68} penumbra={1} intensity={0.4} color="#b7aaa0" />
      <spotLight ref={backFill} position={[0, 4.9, -6.6]} angle={0.76} penumbra={1} intensity={0.58} color="#35d7ff" />
      <spotLight ref={roomFillA} position={[-12, 6.8, 0]} angle={0.92} penumbra={1} intensity={2.1} distance={13} color="#ec47c7" castShadow />
      <spotLight ref={roomFillB} position={[12, 6.8, 0]} angle={0.92} penumbra={1} intensity={2.1} distance={13} color="#35d7ff" castShadow />
      <spotLight ref={ceilingFill} position={[0, 9.0, -2.8]} angle={0.92} penumbra={1} intensity={0.95} distance={9.5} color="#cf875d" />
      <spotLight ref={paintingLight} position={[0, 4.2, -5.4]} angle={0.42} penumbra={1} intensity={1.0} distance={7.0} color="#cf875d" castShadow />
      <pointLight ref={warm} position={[0, 2.7, 0.45]} distance={7.0} intensity={1.1} decay={1.5} color="#d9925b" />
      <pointLight ref={rimLight} position={[0, 5.4, -6.2]} distance={5.6} intensity={0.7} decay={1.8} color="#ec47c7" />
    </>
  )
}

function MuseumRoom() {
  const [wallMap, wallNormal, wallRoughness] = useTexture([
    '/textures/Concrete045_2K-JPG_Color.jpg',
    '/textures/Concrete045_2K-JPG_NormalGL.jpg',
    '/textures/Concrete045_2K-JPG_Roughness.jpg',
  ])
  const ceilMap = useTexture('/textures/painted_concrete_02_diff_4k.jpg')

  useMemo(() => {
    ;[wallMap, wallNormal, wallRoughness].forEach((tex) => {
      if (!tex) return
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.colorSpace = tex === wallMap ? THREE.SRGBColorSpace : THREE.NoColorSpace
    })

    wallMap.repeat.set(2.2, 1.4)
    wallNormal.repeat.set(2.2, 1.4)
    wallRoughness.repeat.set(2.2, 1.4)

    if (ceilMap) {
      ceilMap.wrapS = ceilMap.wrapT = THREE.RepeatWrapping
      ceilMap.repeat.set(2.2, 1.8)
      ceilMap.colorSpace = THREE.SRGBColorSpace
    }
  }, [wallMap, wallNormal, wallRoughness, ceilMap])

  return (
    <group>
      <mesh position={[0, 3.5, -8]} receiveShadow>
        <boxGeometry args={[18, 7, 0.4]} />
        <meshStandardMaterial
          color="#4a443e"
          map={wallMap}
          normalMap={wallNormal}
          roughnessMap={wallRoughness}
          normalScale={[0.16, 0.16]}
          roughness={0.98}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[-9, 3.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 7]} />
        <meshStandardMaterial
          color="#433d38"
          map={wallMap}
          normalMap={wallNormal}
          roughnessMap={wallRoughness}
          normalScale={[0.14, 0.14]}
          roughness={0.98}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[9, 3.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 7]} />
        <meshStandardMaterial
          color="#433d38"
          map={wallMap}
          normalMap={wallNormal}
          roughnessMap={wallRoughness}
          normalScale={[0.14, 0.14]}
          roughness={0.98}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, 7, 0]} receiveShadow>
        <boxGeometry args={[18, 0.4, 16]} />
        <meshStandardMaterial color="#4e443d" roughness={1} metalness={0.01} />
      </mesh>

      <mesh position={[0, 6.79, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 16]} />
        <meshStandardMaterial color="#5a4f47" map={ceilMap} roughness={1} metalness={0.01} />
      </mesh>

      <mesh position={[0.15, 0.03, -5.65]} receiveShadow>
        <boxGeometry args={[6.4, 0.08, 1.55]} />
        <meshStandardMaterial color="#675a50" roughness={0.95} metalness={0.02} />
      </mesh>
    </group>
  )
}

function Ground() {
  const floorMap = useTexture('/textures/painted_concrete_02_diff_4k.jpg')

  useMemo(() => {
    if (!floorMap) return
    floorMap.wrapS = THREE.RepeatWrapping
    floorMap.wrapT = THREE.RepeatWrapping
    floorMap.repeat.set(2.4, 1.6)
    floorMap.colorSpace = THREE.SRGBColorSpace
  }, [floorMap])

  return (
    <Reflector position={[0, 0.001, 0]} resolution={2048} args={[18, 16]} mirror={0.38} mixBlur={6} mixStrength={0.42} rotation={[-HPI, 0, 0]} blur={[220, 60]}>
      {(Material, props) => <Material color="#5f534a" map={floorMap} normalScale={[0.06, 0.06]} roughness={0.78} metalness={0.08} {...props} />}
    </Reflector>
  )
}

function Bust() {
  const wrap = useRef()
  const ref = useRef()
  const time = useRef(0)
  const vocalLag = useRef(0)
  const { scene, animations, materials } = useGLTF('/bust.glb')
  const clone = useMemo(() => scene.clone(true), [scene])
  const { actions, mixer } = useAnimations(animations, ref)
  const { vocals } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  useEffect(() => {
    Object.keys(actions).forEach((key) => actions[key].play())
  }, [actions])

  useFrame((state, delta) => {
    const isOff = solo ? solo !== 'vocals' : muted.vocals
    const rawVocal = isOff ? 0 : vocals.envelope * vocals.gain
    vocalLag.current = THREE.MathUtils.damp(vocalLag.current, rawVocal, rawVocal > vocalLag.current ? 6.5 : 4.2, delta)

    const vocalEnergy = THREE.MathUtils.clamp(vocalLag.current * 1.22, 0, 1)
    const targetTime = vocalEnergy * 7.1
    mixer.setTime((time.current = THREE.MathUtils.lerp(time.current, targetTime, vocalEnergy > 0.1 ? 0.12 : 0.05)))

    if (materials.inner) {
      materials.inner.color
        .copy(red)
        .lerp(voiceColor, vocalEnergy * 0.58)
        .multiplyScalar(0.38 + vocalEnergy * 5.0)
    }

    if (wrap.current) {
      wrap.current.rotation.y += 0.0012 + vocalEnergy * 0.012
      wrap.current.position.y = THREE.MathUtils.lerp(wrap.current.position.y, 0.2 + vocalEnergy * 0.38, 0.09)
      const s = 1 + vocalEnergy * 0.075
      wrap.current.scale.lerp(vec.set(s, s, s), 0.09)
    }
  })

  return (
    <group ref={wrap} position={[0, 0.2, 0]}>
      <primitive scale={[0.23, 0.23, 0.23]} position={[0, 0.2, 0]} rotation={[0, -2.35, 0]} ref={ref} object={clone} />
      <pointLight position={[0, 2.4, 0.5]} intensity={3.6} distance={6.4} color="#ff8a6d" />
    </group>
  )
}

function Pedestal({ width = 1.6, depth = 1.6, height = 0.5, topColor = '#d8d0c7', sideColor = '#beb5ab' }) {
  return (
    <group>
      <mesh position={[0, height * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={sideColor} roughness={0.9} metalness={0.03} />
      </mesh>
      <mesh position={[0, height + 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.12, 0.08, depth + 0.12]} />
        <meshStandardMaterial color={topColor} roughness={0.82} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[width + 0.22, 0.1, depth + 0.22]} />
        <meshStandardMaterial color="#a89e94" roughness={0.96} metalness={0.01} />
      </mesh>
    </group>
  )
}

function MuseumSculptures() {
  return (
    <group>
      <PaintingWall position={[0, 2.45, -7.62]} rotation={[0.1, -1.4, 0]} label="" />
      <OtherChandelier position={[-1, 3, -1.6]} rotation={[0, 0, 0]} label="" />

      <group position={[-2, 0, 0.5]} rotation={[0, 0, 0]}>
        <Pedestal width={1.7} depth={1.7} height={0.95} topColor="#ded7cd" sideColor="#cbc2b8" />
        <Bust position={[0, 0.97, 0]} />
      </group>

      {/* <OtherHalo position={[4.6, 2.9, -2.2]} accent="#e8b98a" label="" /> */}

      <group position={[1.45, 0, -1.6]} rotation={[0, 0, 0]}>
        <Pedestal width={1.7} depth={1.7} height={0.52} topColor="#d4ccc2" sideColor="#beb4aa" />
        <BassChestStatue position={[0, 0.54, 0]} rotation={[0, 0.35, 0]} label="" />
      </group>

      <RoomColumns />
    </group>
  )
}

function RoomColumns() {
  const layout = useMemo(
    () => [
      { position: [-3.4, 0, -3.4], scale: 0.54, amp: 0.96, rot: [0, 0.015, 0] },
      { position: [3.4, 0, -3.4], scale: 0.54, amp: 1.04, rot: [0, -0.015, 0] },
      { position: [-5, 0, 2], scale: 0.54, amp: 1.0, rot: [0, 0.015, 0] },
      { position: [5, 0, 2], scale: 0.54, amp: 1.06, rot: [0, -0.015, 0] },
    ],
    [],
  )

  return (
    <group>
      {layout.map((item, i) => (
        <group key={i}>
          <DrumColumn position={item.position} rotation={item.rot} scale={item.scale} amplitude={item.amp} index={i} />
          <ColumnDustBursts position={item.position} radius={0.82} />
        </group>
      ))}
    </group>
  )
}

function DrumColumn({ position, rotation = [0, 0, 0], scale = 1, amplitude = 1, index = 0 }) {
  const group = useRef()
  const modelRef = useRef()
  const glow = useRef()
  const sceneSource = useGLTF('/lattice_column3.glb')
  const { scene: source } = sceneSource
  const scene = useMemo(() => source.clone(true), [source])

  const drums = useStore((state) => state.audio.drums)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  const envelopeRef = useRef(0)
  const pulseRef = useRef(0)
  const prevSignalRef = useRef(0)

  useEffect(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = false

      if (child.material) {
        child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone()
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((mat) => {
          if ('roughness' in mat) mat.roughness = Math.min(mat.roughness ?? 0.9, 0.82)
          if ('metalness' in mat) mat.metalness = Math.max(mat.metalness ?? 0.05, 0.08)
          if ('emissive' in mat) mat.emissive = new THREE.Color('#000000')
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0
        })
      }
    })
  }, [scene])

  useFrame((state, delta) => {
    const isOff = solo ? solo !== 'drums' : muted.drums
    const rawEnvelope = isOff ? 0 : drums.envelope * drums.gain
    const signalNow = !isOff && drums.signal ? 1 : 0
    const justHit = signalNow && !prevSignalRef.current
    prevSignalRef.current = signalNow

    envelopeRef.current = THREE.MathUtils.damp(envelopeRef.current, rawEnvelope, rawEnvelope > envelopeRef.current ? 10.0 : 4.5, delta)

    if (justHit) pulseRef.current = 1
    pulseRef.current = THREE.MathUtils.damp(pulseRef.current, 0, 7.5, delta)

    const env = THREE.MathUtils.clamp(envelopeRef.current * 2.8, 0, 1)
    const pulse = pulseRef.current
    const drive = env * amplitude + pulse * 0.42 * amplitude

    const stretchY = 1 + drive * 0.42
    const squashXZ = 1 - Math.min(drive * 0.07, 0.07)

    if (group.current) {
      group.current.position.x = position[0]
      group.current.position.z = position[2]
      group.current.rotation.x = rotation[0]
      group.current.rotation.y = rotation[1]
      group.current.rotation.z = rotation[2]

      const baseScaleX = scale
      const baseScaleY = scale
      const baseScaleZ = scale

      const targetScaleX = baseScaleX * squashXZ
      const targetScaleY = baseScaleY * stretchY
      const targetScaleZ = baseScaleZ * squashXZ

      group.current.scale.x = THREE.MathUtils.damp(group.current.scale.x, targetScaleX, 8.5, delta)
      group.current.scale.y = THREE.MathUtils.damp(group.current.scale.y, targetScaleY, 8.5, delta)
      group.current.scale.z = THREE.MathUtils.damp(group.current.scale.z, targetScaleZ, 8.5, delta)

      const plantedOffset = (targetScaleY - baseScaleY) * 2.35 * 0.5
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, position[1] + plantedOffset, 8.5, delta)
    }

    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((mat) => {
        if ('emissive' in mat) mat.emissive.set('#8d2016')
        if ('emissiveIntensity' in mat) {
          mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, 0.02 + env * 0.18 + pulse * 0.15, 5.5, delta)
        }
      })
    })

    if (glow.current) {
      glow.current.intensity = THREE.MathUtils.damp(glow.current.intensity, 0.55 + env * 2.0 + pulse * 1.0, 6.0, delta)
      glow.current.distance = THREE.MathUtils.damp(glow.current.distance, 2.4 + env * 1.2, 5.0, delta)
    }
  })

  return (
    <group ref={group} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      <primitive ref={modelRef} object={scene} />
      <pointLight ref={glow} position={[0, 3.4, 0.15]} color="#b52a1d" intensity={0.8} distance={3.2} decay={2} />
    </group>
  )
}

function ColumnDustBursts({ position, radius = 0.9 }) {
  const pointsRef = useRef()
  const materialRef = useRef()
  const particleCount = 56

  const drums = useStore((state) => state.audio.drums)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  const positions = useMemo(() => new Float32Array(particleCount * 3), [])
  const alphas = useMemo(() => new Float32Array(particleCount), [])
  const velocities = useRef([])
  const burstRef = useRef(0)
  const prevSignalRef = useRef(0)

  useMemo(() => {
    for (let i = 0; i < particleCount; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * radius * 0.35
      positions[i * 3 + 0] = Math.cos(a) * r
      positions[i * 3 + 1] = 0.02 + Math.random() * 0.04
      positions[i * 3 + 2] = Math.sin(a) * r
      alphas[i] = 0
      velocities.current.push({
        x: Math.cos(a) * (0.12 + Math.random() * 0.38),
        y: 0.18 + Math.random() * 0.45,
        z: Math.sin(a) * (0.12 + Math.random() * 0.38),
        drag: 0.92 + Math.random() * 0.04,
      })
    }
  }, [alphas, positions, radius])

  useFrame((state, delta) => {
    if (!pointsRef.current) return

    const isOff = solo ? solo !== 'drums' : muted.drums
    const env = isOff ? 0 : drums.envelope * drums.gain
    const signalNow = !isOff && drums.signal ? 1 : 0
    const justHit = signalNow && !prevSignalRef.current
    prevSignalRef.current = signalNow

    if (justHit) burstRef.current = Math.min(1, 0.45 + env * 1.2)
    burstRef.current = THREE.MathUtils.damp(burstRef.current, 0, 3.8, delta)

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3
      const v = velocities.current[i]
      positions[ix + 0] += v.x * burstRef.current * delta
      positions[ix + 1] += v.y * burstRef.current * delta
      positions[ix + 2] += v.z * burstRef.current * delta

      v.x *= 0.992
      v.y *= v.drag
      v.z *= 0.992

      positions[ix + 1] = Math.max(0.02, positions[ix + 1] - delta * (0.03 + i * 0.0004))

      const dist = Math.sqrt(positions[ix + 0] ** 2 + positions[ix + 2] ** 2)
      alphas[i] = Math.max(0, 0.22 + burstRef.current * 0.8 - dist * 0.35 - positions[ix + 1] * 0.22)

      if (burstRef.current < 0.03 && positions[ix + 1] < 0.05) {
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * radius * 0.28
        positions[ix + 0] = Math.cos(a) * r
        positions[ix + 1] = 0.02 + Math.random() * 0.035
        positions[ix + 2] = Math.sin(a) * r
        v.x = Math.cos(a) * (0.12 + Math.random() * 0.38)
        v.y = 0.18 + Math.random() * 0.45
        v.z = Math.sin(a) * (0.12 + Math.random() * 0.38)
        v.drag = 0.92 + Math.random() * 0.04
        alphas[i] = 0
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.alpha.needsUpdate = true

    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, 0.08 + burstRef.current * 0.42, 0.12)
      materialRef.current.size = THREE.MathUtils.lerp(materialRef.current.size, 0.045 + burstRef.current * 0.08, 0.12)
    }
  })

  return (
    <group position={[position[0], position[1], position[2]]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={particleCount} itemSize={3} />
          <bufferAttribute attach="attributes-alpha" array={alphas} count={particleCount} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors={false}
          uniforms={{ uColor: { value: new THREE.Color('#d7c7b8') }, uSize: { value: 22.0 } }}
          vertexShader={`
            attribute float alpha;
            varying float vAlpha;
            uniform float uSize;
            void main() {
              vAlpha = alpha;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = uSize * (1.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
              float d = distance(gl_PointCoord, vec2(0.5));
              float strength = smoothstep(0.5, 0.0, d);
              gl_FragColor = vec4(uColor, strength * vAlpha);
            }
          `}
        />
      </points>
    </group>
  )
}

function OtherChandelier({ position, rotation, label }) {
  const root = useRef()
  const sharedRig = useRef()
  const glow = useRef()

  const energyRef = useRef(0)
  const beatRef = useRef(0)
  const pulseRef = useRef(0)
  const spinSpeedRef = useRef(0)
  const swingSpeedRef = useRef(0)
  const twistAccumRef = useRef(0)

  const { scene: source } = useGLTF('/chandelier_editedd.glb')
  const scene = useMemo(() => source.clone(true), [source])

  const { other } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  const nodesRef = useRef({})
  const baseRef = useRef({})
  const meshListRef = useRef([])

  const warm = useMemo(() => new THREE.Color('#d59d6a'), [])
  const hot = useMemo(() => new THREE.Color('#ffd8a8'), [])

  useEffect(() => {
    const find = (name) => scene.getObjectByName(name)

    const found = {
      ChainMash3: find('ChainMash3'),
      ChandelierHolder: find('ChandelierHolder'),
      GemMash2_ReproMesh: find('GemMash2_ReproMesh'),
      STRINGS: find('STRINGS'),
      Lomp: find('Lomp'),
      Pin1: find('Pin1'),
      Pin2: find('Pin2'),
      Pin3: find('Pin3'),
      Pin4: find('Pin4'),
      Sweep1: find('Sweep1'),
      Sweep2: find('Sweep2'),
      Sweep3: find('Sweep3'),
      Sweep4: find('Sweep4'),
      CSweep1: find('CSweep1'),
      CSweep2: find('CSweep2'),
      CSweep3: find('CSweep3'),
    }

    nodesRef.current = found

    const bases = {}
    Object.entries(found).forEach(([key, node]) => {
      if (!node) return
      bases[key] = { position: node.position.clone(), rotation: node.rotation.clone(), scale: node.scale.clone() }
    })
    baseRef.current = bases

    const meshes = []
    scene.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = false
      if (child.material) {
        child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone()
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((mat) => {
        if ('side' in mat) mat.side = THREE.DoubleSide
        if ('roughness' in mat) mat.roughness = Math.min(mat.roughness ?? 0.8, 0.7)
        if ('metalness' in mat) mat.metalness = Math.max(mat.metalness ?? 0.2, 0.35)
        if ('emissive' in mat) mat.emissive = new THREE.Color('#000000')
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0
      })
      meshes.push(child)
    })
    meshListRef.current = meshes
  }, [scene])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const isOff = solo ? solo !== 'other' : muted.other

    const rawEnergy = isOff ? 0 : other.envelope * other.gain
    const rawBeat = !isOff && other.signal ? 1 : 0

    energyRef.current = THREE.MathUtils.damp(energyRef.current, rawEnergy, 3.8, delta)
    beatRef.current = THREE.MathUtils.damp(beatRef.current, rawBeat, rawBeat ? 18 : 5, delta)

    if (rawBeat > 0.5) pulseRef.current = 1
    pulseRef.current = THREE.MathUtils.damp(pulseRef.current, 0, 5.5, delta)

    const e = THREE.MathUtils.clamp(energyRef.current * 8.5, 0, 1)
    const beat = beatRef.current
    const pulse = pulseRef.current
    const peak = Math.pow(e, 0.78)

    const targetSpinSpeed = 0.2 + e * 2.3 + beat * 0.7
    const targetSwingSpeed = 0.85 + e * 2.2 + pulse * 0.75

    spinSpeedRef.current = THREE.MathUtils.damp(spinSpeedRef.current, targetSpinSpeed, 2.8, delta)
    swingSpeedRef.current = THREE.MathUtils.damp(swingSpeedRef.current, targetSwingSpeed, 2.4, delta)

    twistAccumRef.current += spinSpeedRef.current * delta
    const twistY = twistAccumRef.current

    const hangPhase = t * swingSpeedRef.current
    const hangAmp = 0.018 + peak * 0.075 + pulse * 0.04

    const hangX = Math.sin(hangPhase * 0.95) * hangAmp
    const hangZ = Math.cos(hangPhase * 0.82) * hangAmp * 0.92
    const hangY = -peak * 0.045 - pulse * 0.028

    const swayX = Math.sin(hangPhase * 1.12) * (0.009 + peak * 0.018 + pulse * 0.008)
    const swayZ = Math.cos(hangPhase * 0.96) * (0.009 + peak * 0.018 + pulse * 0.008)

    if (sharedRig.current) {
      sharedRig.current.rotation.x = THREE.MathUtils.damp(sharedRig.current.rotation.x, hangX, 2.8, delta)
      sharedRig.current.rotation.z = THREE.MathUtils.damp(sharedRig.current.rotation.z, hangZ, 2.8, delta)
      sharedRig.current.position.y = THREE.MathUtils.damp(sharedRig.current.position.y, hangY, 3.2, delta)
    }

    const applyAttachedAssembly = (name) => {
      const node = nodesRef.current[name]
      const base = baseRef.current[name]
      if (!node || !base) return
      node.position.x = THREE.MathUtils.damp(node.position.x, base.position.x, 4.0, delta)
      node.position.z = THREE.MathUtils.damp(node.position.z, base.position.z, 4.0, delta)
      node.position.y = THREE.MathUtils.damp(node.position.y, base.position.y - peak * 0.022 - pulse * 0.015, 3.8, delta)
      node.rotation.x = THREE.MathUtils.damp(node.rotation.x, base.rotation.x + swayX, 3.2, delta)
      node.rotation.z = THREE.MathUtils.damp(node.rotation.z, base.rotation.z + swayZ, 3.2, delta)
      node.rotation.y = THREE.MathUtils.damp(node.rotation.y, base.rotation.y + twistY, 2.6, delta)
    }

    applyAttachedAssembly('ChainMash3')
    applyAttachedAssembly('GemMash2_ReproMesh')
    applyAttachedAssembly('STRINGS')

    const strings = nodesRef.current.STRINGS
    const stringsBase = baseRef.current.STRINGS
    if (strings && stringsBase) {
      strings.scale.x = THREE.MathUtils.damp(strings.scale.x, stringsBase.scale.x, 3.2, delta)
      strings.scale.z = THREE.MathUtils.damp(strings.scale.z, stringsBase.scale.z, 3.2, delta)
      strings.scale.y = THREE.MathUtils.damp(strings.scale.y, stringsBase.scale.y * (1 - peak * 0.09 - pulse * 0.045), 3.4, delta)
    }

    const lomp = nodesRef.current.Lomp
    const lompBase = baseRef.current.Lomp
    if (lomp && lompBase) {
      lomp.position.y = THREE.MathUtils.damp(lomp.position.y, lompBase.position.y - peak * 0.016 - pulse * 0.01, 3.2, delta)
      lomp.rotation.y = THREE.MathUtils.damp(lomp.rotation.y, lompBase.rotation.y + twistY * 0.18, 2.6, delta)
      const lompScale = 1 + peak * 0.02 + pulse * 0.01
      lomp.scale.x = THREE.MathUtils.damp(lomp.scale.x, lompBase.scale.x * lompScale, 3.0, delta)
      lomp.scale.y = THREE.MathUtils.damp(lomp.scale.y, lompBase.scale.y * lompScale, 3.0, delta)
      lomp.scale.z = THREE.MathUtils.damp(lomp.scale.z, lompBase.scale.z * lompScale, 3.0, delta)
    }

    const spinNode = (name, speedX, speedY, speedZ, amount = 1) => {
      const node = nodesRef.current[name]
      const base = baseRef.current[name]
      if (!node || !base) return
      const spinMul = 0.28 + e * 1.45 + pulse * 0.5
      node.rotation.x = THREE.MathUtils.damp(node.rotation.x, base.rotation.x + speedX * spinMul * amount, 3.4, delta)
      node.rotation.y = THREE.MathUtils.damp(node.rotation.y, base.rotation.y + speedY * spinMul * amount, 3.4, delta)
      node.rotation.z = THREE.MathUtils.damp(node.rotation.z, base.rotation.z + speedZ * spinMul * amount, 3.4, delta)
    }

    spinNode('ChandelierHolder', 0.03, 0.08, 0.03, 1.0)
    spinNode('Pin1', 0.04, 0.11, 0.04, 1.0)
    spinNode('Pin2', 0.03, 0.12, 0.05, 1.0)
    spinNode('Pin3', 0.04, 0.1, 0.04, 1.0)
    spinNode('Pin4', 0.03, 0.11, 0.05, 1.0)
    spinNode('Sweep1', 0.025, 0.14, 0.045, 1.05)
    spinNode('Sweep2', 0.03, 0.13, 0.04, 1.05)
    spinNode('Sweep3', 0.025, 0.145, 0.045, 1.05)
    spinNode('Sweep4', 0.03, 0.14, 0.04, 1.05)
    spinNode('CSweep1', 0.04, 0.17, 0.05, 1.12)
    spinNode('CSweep2', 0.035, 0.18, 0.05, 1.12)
    spinNode('CSweep3', 0.04, 0.17, 0.04, 1.12)

    meshListRef.current.forEach((child) => {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((mat) => {
        if ('emissive' in mat) mat.emissive.copy(warm).lerp(hot, peak * 0.32 + pulse * 0.18)
        if ('emissiveIntensity' in mat) {
          mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, 0.025 + peak * 0.26 + pulse * 0.14, 3.4, delta)
        }
      })
    })

    if (glow.current) {
      glow.current.color.copy(warm).lerp(hot, peak * 0.4 + pulse * 0.2)
      glow.current.intensity = THREE.MathUtils.damp(glow.current.intensity, 1.6 + peak * 3.8 + pulse * 1.6, 3.6, delta)
      glow.current.distance = THREE.MathUtils.damp(glow.current.distance, 4.8 + peak * 2.0 + pulse * 0.8, 3.4, delta)
    }
  })

  return (
    <group ref={root} position={position} rotation={rotation}>
      <group ref={sharedRig} position={[0, -0.15, 0]}>
        <primitive object={scene} />
        <pointLight ref={glow} position={[0, -0.25, 0]} color="#ffd7a8" intensity={2} distance={5} decay={2} castShadow />
      </group>
    </group>
  )
}

function BassChestStatue({ position, rotation, label }) {
  const group = useRef()
  const chestLight = useRef()
  const chestGlow = useRef()
  const chestCore = useRef()

  const morphMeshes = useRef([])
  const initialized = useRef(false)

  const bassLag = useRef(0)
  const pulseRef = useRef(0)
  const prevSignalRef = useRef(0)
  const inflationRef = useRef(0)

  const { scene: source } = useGLTF('/chest_bump.glb')
  const scene = useMemo(() => source.clone(true), [source])

  const { bass } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  useFrame((state, delta) => {
    if (!initialized.current && scene) {
      const found = []

      scene.traverse((child) => {
        if (!child.isMesh) return

        child.castShadow = true
        child.receiveShadow = true
        child.frustumCulled = false

        if (!child.__materialCloned) {
          child.material = Array.isArray(child.material) ? child.material.map((material) => material.clone()) : child.material.clone()

          child.__materialCloned = true
        }

        const mats = Array.isArray(child.material) ? child.material : [child.material]

        mats.forEach((mat) => {
          if ('color' in mat) mat.color.set('#4c4c4c')
          if ('roughness' in mat) mat.roughness = 0.8
          if ('metalness' in mat) mat.metalness = 0.03
          if ('emissive' in mat) mat.emissive = new THREE.Color('#120000')
          if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0
        })

        if (child.morphTargetInfluences && child.morphTargetInfluences.length > 0) {
          found.push(child)
        }
      })

      morphMeshes.current = found
      initialized.current = true
    }

    const isOff = solo ? solo !== 'bass' : muted.bass
    const rawBass = isOff ? 0 : bass.envelope * bass.gain

    const beat = !isOff && bass.signal ? 1 : 0
    const justBeat = beat && !prevSignalRef.current
    prevSignalRef.current = beat

    // Bass energy follows the input quickly, then releases smoothly.
    bassLag.current = THREE.MathUtils.damp(bassLag.current, rawBass, rawBass > bassLag.current ? 14.0 : 9.0, delta)

    // Short transient for a visible bump on every bass hit.
    if (justBeat) pulseRef.current = 1

    pulseRef.current = THREE.MathUtils.damp(pulseRef.current, 0, 8.5, delta)

    const bassEnergy = THREE.MathUtils.clamp(bassLag.current * 15.0, 0, 1)

    const pulse = pulseRef.current

    // Continuous bass provides only a small "breathing" hold.
    // Hits provide the large visible chest expansion.
    const sustainedInflation = Math.pow(bassEnergy, 0.82) * 0.28
    const hitInflation = pulse * 0.88

    const targetInflation = THREE.MathUtils.clamp(sustainedInflation + hitInflation, 0, 1)

    // Quick inhale, smooth but clearly visible exhale.
    inflationRef.current = THREE.MathUtils.damp(inflationRef.current, targetInflation, targetInflation > inflationRef.current ? 15.0 : 7.0, delta)

    const inflation = inflationRef.current

    const MAX_MORPH_INFLATION = 2.5
    const morphAmount = inflation * MAX_MORPH_INFLATION

    morphMeshes.current.forEach((mesh) => {
      for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
        const current = mesh.morphTargetInfluences[i]

        mesh.morphTargetInfluences[i] = THREE.MathUtils.damp(current, morphAmount, morphAmount > current ? 18.0 : 9.0, delta)
      }

      mesh.updateWorldMatrix(true, false)

      const chestCenterLocal = new THREE.Vector3(-0.11, 2.8, 0.3)
      const chestCenterWorld = chestCenterLocal.clone()
      group.current.localToWorld(chestCenterWorld)

      const meshWorldPos = new THREE.Vector3()
      mesh.getWorldPosition(meshWorldPos)

      const distanceFromChest = meshWorldPos.distanceTo(chestCenterWorld)
      const chestMask = THREE.MathUtils.clamp(1 - distanceFromChest / 0.9, 0, 1)

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

      mats.forEach((mat) => {
        const localRed = chestMask * inflation

        if ('emissive' in mat) {
          mat.emissive.set('#170000').lerp(new THREE.Color('#ff0000'), localRed)
        }

        if ('emissiveIntensity' in mat) {
          mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, chestMask * (0.08 + inflation * 4.6), 10.0, delta)
        }

        if ('color' in mat) {
          const stoneColor = new THREE.Color('#4c4c4c')
          const deepRed = new THREE.Color('#8b0505')
          const hotRed = new THREE.Color('#ef160d')

          mat.color
            .copy(stoneColor)
            .lerp(deepRed, chestMask * (0.08 + inflation * 0.48))
            .lerp(hotRed, chestMask * Math.pow(inflation, 1.75) * 0.3)
        }
      })
    })

    if (chestLight.current) {
      chestLight.current.color.set('#ff0800')

      chestLight.current.intensity = THREE.MathUtils.damp(chestLight.current.intensity, 2.0 + inflation * 300.0, 12.0, delta)
      chestLight.current.distance = THREE.MathUtils.damp(chestLight.current.distance, 0.75 + inflation * 1.05, 11.0, delta)

      chestLight.current.decay = 2.15
    }

    if (chestGlow.current) {
      chestGlow.current.color.set('#ff1a08')

      chestGlow.current.intensity = THREE.MathUtils.damp(chestGlow.current.intensity, 0.12 + inflation * 2.1, 10.0, delta)

      chestGlow.current.distance = THREE.MathUtils.damp(chestGlow.current.distance, 0.32 + inflation * 0.28, 10.0, delta)

      chestGlow.current.decay = 2.4
    }

    if (chestCore.current) {
      const coreScale = 0.075 + inflation * 0.19

      chestCore.current.scale.lerp(vec.set(coreScale, coreScale, coreScale), 0.18)

      chestCore.current.material.color.set('#6d0000').lerp(new THREE.Color('#ff0a00'), inflation)

      chestCore.current.material.opacity = THREE.MathUtils.damp(chestCore.current.material.opacity, 0.13 + inflation * 0.56, 10.0, delta)
    }

    if (group.current) {
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, position[1] + inflation * 0.14, 8.0, delta)
    }
  })

  return (
    <group ref={group} position={position} rotation={rotation}>
      <primitive object={scene} scale={[0.018, 0.018, 0.018]} />

      <group position={[-0.11, 2.8, 0.3]}>
        <mesh ref={chestCore}>
          <sphereGeometry args={[0.13, 24, 24]} />
          <meshBasicMaterial color="#8b0000" transparent opacity={0.2} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        <pointLight ref={chestLight} color="#ff0800" intensity={1.5} distance={0.65} decay={2.15} castShadow={false} />

        <pointLight ref={chestGlow} color="#ff1a08" intensity={0.12} distance={0.32} decay={2.4} castShadow={false} />
      </group>
    </group>
  )
}

function PaintingWall({ position, rotation, label }) {
  const root = useRef()
  const wallWrap = useRef()
  const frameLight = useRef()
  const auraLight = useRef()
  const { scene: source } = useGLTF('/frame_nourr.glb')
  const scene = useMemo(() => source.clone(true), [source])
  const animatedMeshes = useRef([])
  const initialized = useRef(false)
  const { other } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  useEffect(() => {
    if (initialized.current) return
    const animated = []

    scene.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = false
      if (child.material) {
        child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone()
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((mat) => {
        if ('roughness' in mat) mat.roughness = 0.76
        if ('metalness' in mat) mat.metalness = 0.08
        if ('emissive' in mat) mat.emissive = new THREE.Color('#000000')
        if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0
      })
      animated.push({
        mesh: child,
        basePosition: child.position.clone(),
        baseRotation: child.rotation.clone(),
        baseScale: child.scale.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.72 + Math.random() * 0.52,
      })
    })

    animatedMeshes.current = animated
    initialized.current = true
  }, [scene])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const isOff = solo ? solo !== 'other' : muted.other
    const raw = isOff ? 0 : other.envelope * other.gain
    const e = THREE.MathUtils.clamp(raw * 4.2, 0, 1)
    const beat = !isOff && other.signal ? 1 : 0
    const peak = Math.pow(e, 0.76)

    animatedMeshes.current.forEach((item, i) => {
      const { mesh, basePosition, baseRotation, baseScale, phase, speed } = item
      const sway = Math.sin(t * speed + phase)
      const drift = Math.cos(t * (speed * 0.88) + phase + i * 0.08)
      const orbit = Math.sin(t * (speed * 1.18) + phase * 1.3)

      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, basePosition.x + sway * 0.032 * (0.7 + e), 0.14)
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, basePosition.y + drift * 0.036 * (0.75 + e), 0.14)
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, basePosition.z + peak * 0.05 + beat * 0.028, 0.14)

      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, baseRotation.x + sway * 0.055 * (0.45 + e), 0.14)
      mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, baseRotation.y + orbit * 0.07 * (0.55 + e), 0.14)
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, baseRotation.z + drift * 0.06 * (0.55 + e), 0.14)

      const s = 1 + peak * 0.06 + beat * 0.03
      mesh.scale.lerp(vec.set(baseScale.x * s, baseScale.y * s, baseScale.z * s), 0.14)

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if ('emissive' in mat) mat.emissive.set('#d08a63')
        if ('emissiveIntensity' in mat) {
          mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, 0.08 + peak * 0.45 + beat * 0.22, 0.12)
        }
      })
    })

    if (wallWrap.current) {
      wallWrap.current.position.z = THREE.MathUtils.lerp(wallWrap.current.position.z, peak * 0.025 + beat * 0.012, 0.1)
      wallWrap.current.rotation.z = THREE.MathUtils.lerp(wallWrap.current.rotation.z, Math.sin(t * 1.1) * 0.02 * (0.4 + e), 0.08)
    }

    if (frameLight.current) {
      frameLight.current.intensity = THREE.MathUtils.lerp(frameLight.current.intensity, 1.2 + peak * 2.8 + beat * 1.2, 0.1)
      frameLight.current.distance = THREE.MathUtils.lerp(frameLight.current.distance, 3.4 + peak * 1.9, 0.1)
    }

    if (auraLight.current) {
      auraLight.current.intensity = THREE.MathUtils.lerp(auraLight.current.intensity, 0.5 + peak * 1.8 + beat * 0.7, 0.1)
      auraLight.current.distance = THREE.MathUtils.lerp(auraLight.current.distance, 4.5 + peak * 2.0, 0.1)
    }
  })

  return (
    <group ref={root} position={position} rotation={rotation}>
      <group ref={wallWrap} scale={[0.98, 0.98, 0.98]}>
        <primitive object={scene} />
      </group>
      <pointLight ref={frameLight} position={[0, 0.12, 0.58]} color="#c07a59" intensity={1.0} distance={3.4} decay={2} />
      <pointLight ref={auraLight} position={[0, 0.3, -0.2]} color="#e3b08c" intensity={0.6} distance={4.6} decay={2} />
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
      const sx = cfg.scale * (1 + e * 0.22)
      const sy = cfg.scale * (1 + e * 0.55 + peak * 0.18)
      const sz = 1 + e * 0.08
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
      glow.current.intensity = THREE.MathUtils.lerp(glow.current.intensity, 0.6 + e * 2.2 + peak * 0.9, 0.04)
      glow.current.distance = THREE.MathUtils.lerp(glow.current.distance, 2.4 + e * 1.0, 0.04)
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
      <meshBasicMaterial toneMapped={false} transparent opacity={0.82} color="#e5ddd5" />
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
      <mesh position={[-6.45, 1.05, -5.2]}>
        <sphereGeometry args={[0.05, 24, 24]} />
        <meshBasicMaterial toneMapped={false} color="#1b1714" />
      </mesh>
    </group>
  )
}

function Intro() {
  const clicked = useStore((state) => state.clicked)
  const { drums, bass, vocals, other } = useStore((state) => state.audio)
  const muted = useStore((s) => s.muted)
  const solo = useStore((s) => s.solo)

  const drumPulse = useRef(0)
  const bassLag = useRef(0)
  const vocalLag = useRef(0)
  const otherLag = useRef(0)
  const prevDrumSignal = useRef(0)

  const camPos = useRef(new THREE.Vector3(-4.6, 3.2, 10.35))
  const camLook = useRef(new THREE.Vector3(0.15, 1.95, -0.15))
  const shake = useRef(new THREE.Vector3())

  return useFrame((state, delta) => {
    if (!clicked) return

    const isOff = (ch) => (solo ? solo !== ch : muted[ch])

    const d = isOff('drums') ? 0 : drums.envelope * drums.gain
    const b = isOff('bass') ? 0 : bass.envelope * bass.gain
    const v = isOff('vocals') ? 0 : vocals.envelope * vocals.gain
    const o = isOff('other') ? 0 : other.envelope * other.gain

    const drumSignal = !isOff('drums') && drums.signal ? 1 : 0
    const justHit = drumSignal && !prevDrumSignal.current
    prevDrumSignal.current = drumSignal

    if (justHit) drumPulse.current = 1

    drumPulse.current = THREE.MathUtils.damp(drumPulse.current, 0, 7.5, delta)
    bassLag.current = THREE.MathUtils.damp(bassLag.current, b, 2.3, delta)
    vocalLag.current = THREE.MathUtils.damp(vocalLag.current, v, 3.2, delta)
    otherLag.current = THREE.MathUtils.damp(otherLag.current, o, 2.7, delta)

    const drumEnergy = THREE.MathUtils.clamp(d * 3.2, 0, 1)
    const bassEnergy = THREE.MathUtils.clamp(bassLag.current * 3.0, 0, 1)
    const vocalEnergy = THREE.MathUtils.clamp(vocalLag.current * 3.2, 0, 1)
    const otherEnergy = THREE.MathUtils.clamp(otherLag.current * 3.0, 0, 1)
    const pulse = drumPulse.current

    const t = state.clock.elapsedTime
    const mx = state.mouse.x
    const my = state.mouse.y

    const idleX = Math.sin(t * 0.28) * 0.42
    const idleY = Math.sin(t * 0.22) * 0.12
    const idleZ = Math.cos(t * 0.24) * 0.22

    const drumShakeX = (Math.sin(t * 24) * 0.11 + Math.cos(t * 17) * 0.06) * pulse
    const drumShakeY = Math.abs(Math.sin(t * 25)) * 0.12 * pulse
    const drumShakeZ = Math.sin(t * 21) * 0.15 * pulse

    shake.current.lerp(vec.set(drumShakeX, drumShakeY, drumShakeZ), 0.22)

    const targetX = -4.6 + mx * 1.65 + idleX + vocalEnergy * 1.2 + otherEnergy * Math.sin(t * 0.9) * 0.95 + shake.current.x
    const targetY = 3.2 + my * 0.75 + idleY + vocalEnergy * 0.55 + pulse * 0.08 - bassEnergy * 0.16 + shake.current.y
    const targetZ = 10.35 + idleZ - bassEnergy * 2.25 - vocalEnergy * 0.35 + otherEnergy * Math.cos(t * 0.55) * 0.4 + shake.current.z

    camPos.current.lerp(vec.set(targetX, targetY, targetZ), 0.08)

    const lookX = 0.15 + mx * 0.45 + vocalEnergy * 0.8 + otherEnergy * Math.sin(t * 0.7) * 0.45
    const lookY = 1.95 + my * 0.22 + vocalEnergy * 0.28 + pulse * 0.06
    const lookZ = -0.15 - otherEnergy * 0.9 + bassEnergy * 0.3 + Math.sin(t * 0.45) * 0.08

    camLook.current.lerp(vec.set(lookX, lookY, lookZ), 0.1)

    state.camera.position.copy(camPos.current)
    state.camera.lookAt(camLook.current)
  })
}

useGLTF.preload('/bust.glb')
useGLTF.preload('/explosion.glb')
useGLTF.preload('/chest_bump.glb')
useGLTF.preload('/chandelier_editedd.glb')
useGLTF.preload('/lattice_column3.glb')
useGLTF.preload('/frame_nourr.glb')
