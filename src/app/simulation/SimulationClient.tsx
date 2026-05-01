"use client";

import React, {
  useState, useRef, useEffect, useCallback, useMemo, Suspense
} from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import {
  OrbitControls, Environment, Html, useGLTF,
  MeshReflectorMaterial, ContactShadows
} from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three-stdlib';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type Phase = 'idle' | 'starting' | 'running' | 'jumpstart' | 'finished';

interface TelemetryState {
  velocityMs: number;
  rpm: number;
  gear: number;
  drs: boolean;
}

// ─────────────────────────────────────────────────────────────
// PHYSICS — БЫСТРЫЙ БОЛИД, трек 60м → ~1-2 сек
// ─────────────────────────────────────────────────────────────
const PHYSICS = {
  MASS: 4.0,
  DRAG_COEFF: 0.28,
  FRONTAL_AREA: 0.018,
  AIR_DENSITY: 1.225,
  THRUST_MAX: 420,       // УВЕЛИЧЕН для мгновенного разгона
  THRUST_RAMP: 1.0,
  V_MAX: 60,             // м/с — максимальная скорость (был 33)
  GEAR_THRESHOLDS: [0, 8, 18, 28, 38, 50, 60],
  TRACK_LENGTH: 60,      // метров — УМЕНЬШЕН (был 150) → ~1-2 сек при V~40м/с
};

function computeAcceleration(vMs: number, throttle: number, dt: number) {
  const thrust = PHYSICS.THRUST_MAX * throttle * PHYSICS.THRUST_RAMP;
  const drag = 0.5 * PHYSICS.AIR_DENSITY * PHYSICS.DRAG_COEFF * PHYSICS.FRONTAL_AREA * vMs * vMs;
  const netForce = thrust - drag;
  const accel = netForce / PHYSICS.MASS;
  return Math.min(vMs + accel * dt, PHYSICS.V_MAX);
}

function getGear(vMs: number) {
  const g = PHYSICS.GEAR_THRESHOLDS;
  for (let i = g.length - 1; i >= 1; i--) {
    if (vMs >= g[i - 1]) return i;
  }
  return 1;
}

function getThrottle(elapsed: number, vMs: number) {
  const ramp = Math.min(elapsed / 0.1, 1); // очень быстрый рамп
  return ramp * (1 - (vMs / PHYSICS.V_MAX) * 0.03);
}

// ─────────────────────────────────────────────────────────────
// TRACK
// ─────────────────────────────────────────────────────────────
function Track({ scrollSpeed }: { scrollSpeed: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const b = Math.random() * 30 + 20;
      ctx.fillStyle = `rgb(${b},${b},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.setLineDash([100, 100]);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#f5d020';
    ctx.beginPath(); ctx.moveTo(512, 0); ctx.lineTo(512, 1024); ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(984, 0); ctx.lineTo(984, 1024); ctx.stroke();

    for (let seg = 0; seg < 20; seg++) {
      const y0 = seg * 51.2;
      const col = seg % 2 === 0 ? '#cc1010' : '#f0f0f0';
      ctx.fillStyle = col;
      ctx.fillRect(0, y0, 36, 51.2);
      ctx.fillRect(988, y0, 36, 51.2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 200);
    tex.anisotropy = 16;
    return tex;
  }, []);

  useFrame((_, delta) => {
    texture.offset.y -= scrollSpeed * delta;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[14, 4000, 1, 1]} />
      <MeshReflectorMaterial
        map={texture}
        blur={[512, 128]}
        resolution={2048}
        mixBlur={0.6}
        mixStrength={6}
        roughness={0.9}
        depthScale={1.2}
        metalness={0.4}
        color="#2a2a2f"
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// FINISH LINE
// ─────────────────────────────────────────────────────────────
function FinishLine({ distanceTraveled }: { distanceTraveled: number }) {
  const finishZ = -(PHYSICS.TRACK_LENGTH - distanceTraveled);

  if (finishZ > 20 || finishZ < -300) return null;

  return (
    <group position={[0, 0.02, finishZ]}>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-6.5 + i + 0.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 2]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#ffffff' : '#000000'}
            roughness={0.8}
          />
        </mesh>
      ))}
      <mesh position={[-7.5, 3, 0]}>
        <boxGeometry args={[0.3, 6, 0.3]} />
        <meshStandardMaterial color="#E10600" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[7.5, 3, 0]}>
        <boxGeometry args={[0.3, 6, 0.3]} />
        <meshStandardMaterial color="#E10600" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[15.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#E10600" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 5.5, 0.05]}>
        <boxGeometry args={[13, 0.8, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <pointLight position={[0, 5, 2]} color="#ffffff" intensity={200} distance={20} decay={2} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// GANTRY
// ─────────────────────────────────────────────────────────────
function GantryLight({ position, on, green }: {
  position: [number, number, number]; on: boolean; green: boolean;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    if (green) {
      const pulse = 0.7 + 0.3 * Math.sin(clock.getElapsedTime() * 14);
      mat.current.emissiveIntensity = pulse * 35;
      mat.current.emissive.setHex(0x00ff55);
    } else if (on) {
      mat.current.emissiveIntensity = 28;
      mat.current.emissive.setHex(0xff1100);
    } else {
      mat.current.emissiveIntensity = 0.2;
      mat.current.emissive.setHex(0x220000);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.38, 0.38, 0.22]} />
        <meshStandardMaterial color="#111" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <circleGeometry args={[0.14, 32]} />
        <meshStandardMaterial
          ref={mat}
          color={green ? '#003320' : '#330000'}
          emissive={green ? '#00ff55' : '#ff1100'}
          emissiveIntensity={0}
          roughness={0.05}
          metalness={0.1}
        />
      </mesh>
      {on && !green && (
        <pointLight color="#ff2200" intensity={120} distance={18} decay={2} />
      )}
      {green && (
        <pointLight color="#00ff55" intensity={180} distance={30} decay={2} />
      )}
    </group>
  );
}

function Gantry({ sequenceState }: { sequenceState: number }) {
  const LIGHT_POSITIONS: [number, number, number][] = [
    [-4.0, 0, 0], [-2.0, 0, 0], [0, 0, 0], [2.0, 0, 0], [4.0, 0, 0],
  ];

  return (
    <group position={[0, 5.5, -18]}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[11, 0.4, 0.4]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[-5.3, -2.8, 0]} castShadow>
        <boxGeometry args={[0.4, 6, 0.4]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[5.3, -2.8, 0]} castShadow>
        <boxGeometry args={[0.4, 6, 0.4]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.3} metalness={0.9} />
      </mesh>
      {LIGHT_POSITIONS.map((pos, i) => (
        <GantryLight
          key={i}
          position={[pos[0], -0.5, 0.25]}
          on={sequenceState > i}
          green={sequenceState === 6}
        />
      ))}
      <mesh position={[0, 0.55, 0.05]}>
        <boxGeometry args={[9.5, 0.7, 0.05]} />
        <meshStandardMaterial color="#E10600" roughness={0.6} />
      </mesh>
      {sequenceState === 6 && (
        <pointLight position={[0, -5, 0]} color="#00ff44" intensity={300} distance={20} decay={2} />
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// EXHAUST PARTICLES
// ─────────────────────────────────────────────────────────────
function ExhaustParticles({ velocity }: { velocity: number }) {
  const count = 200;
  const posArr = useRef(new Float32Array(count * 3));
  const velArr = useRef(new Float32Array(count * 3));
  const ages = useRef(new Float32Array(count));
  const attrRef = useRef<THREE.BufferAttribute | null>(null);

  useEffect(() => {
    for (let i = 0; i < count; i++) ages.current[i] = Math.random();
  }, []);

  useFrame((_, delta) => {
    if (velocity < 0.5) return;
    const pos = posArr.current;
    const vel = velArr.current;
    const age = ages.current;
    for (let i = 0; i < count; i++) {
      age[i] += delta * 3.5;
      if (age[i] > 1) {
        age[i] = 0;
        pos[i * 3 + 0] = (Math.random() - 0.5) * 0.25;
        pos[i * 3 + 1] = 0.15;
        pos[i * 3 + 2] = -1.6;
        vel[i * 3 + 0] = (Math.random() - 0.5) * 0.8;
        vel[i * 3 + 1] = Math.random() * 0.4 + 0.1;
        vel[i * 3 + 2] = Math.random() * 0.8 + 1.5;
      }
      pos[i * 3 + 0] += vel[i * 3 + 0] * delta;
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta * (1 + velocity * 0.08);
    }
    if (attrRef.current) attrRef.current.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          ref={attrRef}
          attach="attributes-position"
          args={[posArr.current, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ff6600"
        size={0.09}
        transparent
        opacity={0.65}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────
// CAMERA
// ─────────────────────────────────────────────────────────────
function ChaseCam({ carRef, phase, velocity }: {
  carRef: React.RefObject<THREE.Group | null>;
  phase: Phase;
  velocity: number;
}) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3(0, 3.5, 12));
  const camTarget = useRef(new THREE.Vector3(0, 0.6, 0));

  useEffect(() => {
    camera.position.set(0, 3.5, 12);
    camera.lookAt(0, 0.6, 0);
  }, []);

  useFrame((_, delta) => {
    if (!carRef.current) return;
    const car = carRef.current;
    const spd = velocity;

    if (phase === 'running' || phase === 'finished') {
      const lagFactor = 4.5 + spd * 0.025;
      const heightOffset = 2.5 + spd * 0.012;
      const followDist = 9 + spd * 0.04;

      const desired = new THREE.Vector3(
        car.position.x,
        car.position.y + heightOffset,
        car.position.z + followDist
      );
      camPos.current.lerp(desired, delta * lagFactor);

      const targetPt = new THREE.Vector3(
        car.position.x,
        car.position.y + 0.5,
        car.position.z - 4
      );
      camTarget.current.lerp(targetPt, delta * lagFactor * 1.1);

      const shakeAmt = Math.min(spd / 12, 1) * 0.012;
      const sx = (Math.random() - 0.5) * 2 * shakeAmt;
      const sy = (Math.random() - 0.5) * 2 * shakeAmt;

      camera.position.copy(camPos.current).add(new THREE.Vector3(sx, sy, 0));
      camera.lookAt(camTarget.current);
    } else {
      const desired = new THREE.Vector3(car.position.x, car.position.y + 3.5, car.position.z + 12);
      camPos.current.lerp(desired, delta * 3);
      const targetPt = new THREE.Vector3(car.position.x, car.position.y + 0.5, car.position.z);
      camTarget.current.lerp(targetPt, delta * 3);
      camera.position.copy(camPos.current);
      camera.lookAt(camTarget.current);
    }
  });

  return null;
}

// ─────────────────────────────────────────────────────────────
// F1 CAR
// ─────────────────────────────────────────────────────────────
function GlbModelLoader({ url, onLoaded }: { url: string; onLoaded: (scene: THREE.Group) => void }) {
  const { scene } = useGLTF(url);
  useEffect(() => { onLoaded(scene); }, [scene, onLoaded]);
  return null;
}

function ObjModelLoader({ url, onLoaded }: { url: string; onLoaded: (scene: THREE.Group) => void }) {
  const obj = useLoader(OBJLoader, url);
  useEffect(() => { onLoaded(obj as unknown as THREE.Group); }, [obj, onLoaded]);
  return null;
}

function F1Car({ modelUrl, isObj, phase, carRef, velocity, inspectMode }: {
  modelUrl: string;
  isObj: boolean;
  phase: Phase;
  carRef: React.RefObject<THREE.Group | null>;
  velocity: number;
  inspectMode: boolean;
}) {
  const [loadedScene, setLoadedScene] = useState<THREE.Group | null>(null);

  const riggedModel = useMemo(() => {
    if (!loadedScene) return null;
    const clone = loadedScene.clone(true);

    const box0 = new THREE.Box3().setFromObject(clone);
    const size0 = new THREE.Vector3();
    box0.getSize(size0);
    const maxDim = Math.max(size0.x, size0.y, size0.z);
    const targetSize = 4.5;
    const scaleFactor = targetSize / maxDim;
    clone.scale.setScalar(scaleFactor);

    clone.rotation.set(Math.PI, Math.PI / 2, 0);
    clone.updateMatrixWorld(true);

    const box1 = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box1.getCenter(center);

    clone.position.x = -center.x;
    clone.position.z = -center.z;
    clone.position.y = -box1.min.y;

    clone.updateMatrixWorld(true);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          if (!mat || !mat.isMeshStandardMaterial) return;
          mat.envMapIntensity = 4.5;
          if (mat.color) {
            const hex = mat.color.getHex();
            const r = (hex >> 16 & 255) / 255;
            const g = (hex >> 8 & 255) / 255;
            const b = (hex & 255) / 255;
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            mat.metalness = lum < 0.2 ? 0.95 : 0.85;
            mat.roughness = lum < 0.2 ? 0.15 : 0.20;
          }
          mat.needsUpdate = true;
        });
      }
    });

    return clone;
  }, [loadedScene]);

  const wheelsRef = useRef<THREE.Object3D[]>([]);
  useEffect(() => {
    if (!riggedModel) return;
    wheelsRef.current = [];
    riggedModel.traverse((child) => {
      const name = child.name.toLowerCase();
      if (name.includes('wheel') || name.includes('tyre') || name.includes('tire') || name.includes('rim')) {
        wheelsRef.current.push(child);
      }
    });
  }, [riggedModel]);

  useFrame((state, delta) => {
    if (!carRef.current) return;

    wheelsRef.current.forEach((w) => {
      w.rotation.x -= velocity * delta * 3.5;
    });

    if (phase === 'running') {
      const t = state.clock.elapsedTime;
      carRef.current.position.y = Math.sin(t * 20) * 0.006;
      carRef.current.rotation.x = -Math.min(velocity / 60, 1) * 0.018;
    } else {
      carRef.current.position.y = 0;
      carRef.current.rotation.x = 0;
    }
  });

  return (
    <>
      {isObj ? (
        <ObjModelLoader url={modelUrl} onLoaded={setLoadedScene} />
      ) : (
        <GlbModelLoader url={modelUrl} onLoaded={setLoadedScene} />
      )}
      {riggedModel && (
        <group ref={carRef} position={[0, 0, 0]}>
          <primitive object={riggedModel} />
          <pointLight position={[0, 3, 0]} intensity={25} color="#ffffff" distance={15} castShadow />
          {phase === 'running' && <ExhaustParticles velocity={velocity} />}
          {inspectMode && (
            <>
              <Html position={[0, 0.8, 1.5]} center distanceFactor={8}>
                <div style={hotspotStyle}>⬡ FRONT WING — Nazarbayev Nurtas</div>
              </Html>
              <Html position={[1.2, 0.9, 0]} center distanceFactor={8}>
                <div style={hotspotStyle}>⬡ SIDEPOD — Omarkul Yerkebulan</div>
              </Html>
              <Html position={[0, 1.4, -0.5]} center distanceFactor={8}>
                <div style={hotspotStyle}>⬡ AIRBOX — Tabylgan Eren</div>
              </Html>
              <Html position={[0, 0.4, -1.6]} center distanceFactor={8}>
                <div style={hotspotStyle}>⬡ REAR WING — Digital Dept.</div>
              </Html>
            </>
          )}
        </group>
      )}
    </>
  );
}

const hotspotStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.85)',
  border: '1px solid #E10600',
  borderRadius: '4px',
  padding: '8px 14px',
  color: '#fff',
  fontFamily: '"Courier New", monospace',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '1.5px',
  whiteSpace: 'nowrap',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  pointerEvents: 'none',
};

// ─────────────────────────────────────────────────────────────
// PHYSICS TICK
// ИСПРАВЛЕНИЯ:
// 1. Финиш срабатывает строго по distRef.current (ref, не state) — мгновенно
// 2. Таймер запускается при зелёном свете (greenLightTime) — не зависит от Launch
// 3. Болид втрое быстрее
// ─────────────────────────────────────────────────────────────
function PhysicsTick({ velRef, distRef, raceStartRef, phase, setTel, setPhase, setDistanceTraveled, carRef, onFinish }: {
  velRef: React.MutableRefObject<number>;
  distRef: React.MutableRefObject<number>;
  raceStartRef: React.MutableRefObject<number>;
  phase: Phase;
  setTel: (t: TelemetryState) => void;
  setPhase: (p: Phase) => void;
  setDistanceTraveled: (d: number) => void;
  carRef: React.RefObject<THREE.Group | null>;
  onFinish: (timeMs: number) => void;
}) {
  const phaseRef = useRef(phase);
  const finishedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === 'running') finishedRef.current = false;
  }, [phase]);

  useFrame((_, delta) => {
    if (phaseRef.current !== 'running') return;
    if (!carRef.current) return;
    if (finishedRef.current) return;

    const elapsed = (Date.now() - raceStartRef.current) / 1000;
    const throttle = getThrottle(elapsed, velRef.current);
    velRef.current = computeAcceleration(velRef.current, throttle, Math.min(delta, 0.033));

    const vMs = velRef.current;
    const g = getGear(vMs);
    const rpm = 1500 + (vMs / PHYSICS.V_MAX) * 14500 + Math.sin(Date.now() / 60) * 300;

    setTel({ velocityMs: vMs, rpm, gear: g, drs: vMs > 35 });

    const moveDelta = vMs * Math.min(delta, 0.033);
    carRef.current.position.z -= moveDelta;
    distRef.current += moveDelta;

    setDistanceTraveled(distRef.current);

    // ИСПРАВЛЕНИЕ: финиш мгновенно по ref (не ждём setState)
    if (distRef.current >= PHYSICS.TRACK_LENGTH && !finishedRef.current) {
      finishedRef.current = true;
      carRef.current.position.z = -PHYSICS.TRACK_LENGTH;
      velRef.current = 0;
      setTel({ velocityMs: 0, rpm: 0, gear: 1, drs: false });
      // Передаём реальное время финиша
      const finishTimeMs = Date.now() - raceStartRef.current;
      onFinish(finishTimeMs);
      setPhase('finished');
    }
  });

  return null;
}

// ─────────────────────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────────────────────
function TrackSurrounds() {
  const barrierMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#cc1a1a', roughness: 0.6, metalness: 0.2,
  }), []);
  const concreteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#888', roughness: 0.9, metalness: 0.05,
  }), []);

  return (
    <group>
      {Array.from({ length: 80 }, (_, i) => (
        <group key={i} position={[0, 0, -i * 25 + 20]}>
          <mesh position={[-8, 0.35, 0]} material={barrierMat} castShadow>
            <boxGeometry args={[0.15, 0.7, 24]} />
          </mesh>
          <mesh position={[-8, 0.08, 0]} material={concreteMat}>
            <boxGeometry args={[0.4, 0.15, 24]} />
          </mesh>
          <mesh position={[8, 0.35, 0]} material={barrierMat} castShadow>
            <boxGeometry args={[0.15, 0.7, 24]} />
          </mesh>
          <mesh position={[8, 0.08, 0]} material={concreteMat}>
            <boxGeometry args={[0.4, 0.15, 24]} />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -500]}>
        <planeGeometry args={[200, 2000]} />
        <meshStandardMaterial color="#0f1a0f" roughness={1} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────
function TrackProgress({ distanceTraveled, phase }: { distanceTraveled: number; phase: Phase }) {
  if (phase !== 'running' && phase !== 'finished') return null;
  const progress = Math.min(distanceTraveled / PHYSICS.TRACK_LENGTH, 1);
  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressLabel}>TRACK</div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
        <div style={{ ...styles.progressCar, left: `${progress * 100}%` }}>▲</div>
      </div>
      <div style={styles.progressDist}>{Math.round(distanceTraveled)}m / {PHYSICS.TRACK_LENGTH}m</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELEMETRY HUD
// ─────────────────────────────────────────────────────────────
function TelemetryHUD({ tel, phase, reactionMs }: {
  tel: TelemetryState;
  phase: Phase;
  reactionMs: number | null;
}) {
  const vKph = Math.round(tel.velocityMs * 3.6);
  const rpm = Math.round(tel.rpm);

  const reactionColor = reactionMs !== null
    ? reactionMs < 200 ? '#00ff6e'
      : reactionMs < 350 ? '#fff'
        : reactionMs < 500 ? '#f5c518'
          : '#E10600'
    : '#fff';

  const reactionLabel = reactionMs !== null
    ? reactionMs < 200 ? 'ELITE REACTION'
      : reactionMs < 350 ? 'GOOD REACTION'
        : reactionMs < 500 ? 'AVERAGE'
          : 'TOO SLOW'
    : '';

  return (
    <>
      <div style={styles.speedWrap}>
        <div style={styles.speedNum}>{vKph}</div>
        <div style={styles.speedUnit}>KM/H</div>
      </div>
      <div style={styles.gearBox}>
        <div style={styles.gearNum}>{tel.gear === 0 ? 'N' : tel.gear}</div>
        <div style={styles.gearLabel}>GEAR</div>
      </div>
      <div style={styles.rpmWrap}>
        <div style={styles.rpmLabel}>RPM</div>
        <div style={styles.rpmTrack}>
          {Array.from({ length: 16 }, (_, i) => {
            const threshold = (i + 1) / 16;
            const active = tel.rpm / 16000 > threshold;
            const danger = threshold > 0.85;
            return (
              <div key={i} style={{
                ...styles.rpmBar,
                background: active ? (danger ? '#E10600' : '#00e64e') : 'rgba(255,255,255,0.1)',
              }} />
            );
          })}
        </div>
        <div style={styles.rpmValue}>{rpm.toLocaleString()}</div>
      </div>
      {tel.drs && <div style={styles.drsActive}>DRS</div>}
      {reactionMs !== null && phase === 'running' && (
        <div style={{ ...styles.reactionOverlay, color: reactionColor }}>
          <div style={styles.reactionLabel}>{reactionLabel}</div>
          <div style={styles.reactionVal}>{reactionMs.toFixed(0)} ms</div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// LIGHTS PANEL
// ─────────────────────────────────────────────────────────────
function LightsPanel({ seq }: { seq: number }) {
  return (
    <div style={styles.lightsPanel}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = seq >= n;
        const green = seq === 6;
        return (
          <div key={n} style={{
            ...styles.lightPod,
            background: green ? '#00ff6e' : on ? '#E10600' : '#1a0000',
            boxShadow: green
              ? '0 0 20px #00ff6e, 0 0 60px rgba(0,255,110,.5)'
              : on ? '0 0 16px #E10600, 0 0 40px rgba(225,6,0,.5)'
                : 'none',
            border: `2px solid ${green ? '#00ff6e' : on ? '#E10600' : 'rgba(255,255,255,0.15)'}`,
          }} />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function SimulationClient() {
  const [modelUrl, setModelUrl] = useState('/models/bolid.glb');
  const [isObj, setIsObj] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sequence, setSequence] = useState(0);
  const [tel, setTel] = useState<TelemetryState>({ velocityMs: 0, rpm: 0, gear: 1, drs: false });
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [inspectMode, setInspectMode] = useState(false);
  const [showJumpStart, setShowJumpStart] = useState(false);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [raceTimeMs, setRaceTimeMs] = useState<number | null>(null);

  const carRef = useRef<THREE.Group>(null);
  const velRef = useRef(0);
  const distRef = useRef(0);
  const raceStartRef = useRef(0);       // время старта гонки (когда нажали launch ИЛИ зелёный)
  const greenLightTime = useRef(0);     // время зелёного огня — для реакции
  const seqTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const phaseRef = useRef<Phase>('idle');

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { seqRef.current = sequence; }, [sequence]);

  // FIX: callback вместо useEffect чтобы raceTimeMs устанавливался синхронно с setPhase
  const handleFinish = useCallback((timeMs: number) => {
    setRaceTimeMs(timeMs);
  }, []);

  function enterTrack() {
    setPhase('starting');
    phaseRef.current = 'starting';
    setSequence(0);
    setShowJumpStart(false);
    setReactionMs(null);
    setDistanceTraveled(0);
    setRaceTimeMs(null);
    velRef.current = 0;
    distRef.current = 0;

    if (carRef.current) {
      carRef.current.position.set(0, 0, 0);
      carRef.current.rotation.set(0, 0, 0);
    }

    let step = 0;
    function nextLight() {
      step++;
      setSequence(step);
      seqRef.current = step;
      if (step < 5) {
        seqTimerRef.current = setTimeout(nextLight, 700);
      } else {
        const greenDelay = 800 + Math.random() * 1700;
        seqTimerRef.current = setTimeout(() => {
          setSequence(6);
          seqRef.current = 6;
          greenLightTime.current = performance.now();

          // FIX: Таймер ВСЕГДА стартует при зелёном свете — независимо от нажатия Launch
          // Это позволяет считать реакцию даже если пользователь не нажал
          raceStartRef.current = Date.now();
        }, greenDelay);
      }
    }
    seqTimerRef.current = setTimeout(nextLight, 700);
  }

  function handleLaunch() {
    if (seqRef.current < 6) {
      // JUMP START — нажали до зелёного
      if (seqTimerRef.current) clearTimeout(seqTimerRef.current);
      setShowJumpStart(true);
      setPhase('jumpstart');
      phaseRef.current = 'jumpstart';
    } else if (seqRef.current === 6 && phaseRef.current === 'starting') {
      // FIX: считаем реакцию как разницу между нажатием и зелёным светом
      const rxMs = performance.now() - greenLightTime.current;
      setReactionMs(rxMs);
      // raceStartRef уже установлен при зелёном — не перезаписываем
      velRef.current = 3.0;
      setPhase('running');
      phaseRef.current = 'running';
    }
  }

  // FIX: авто-старт болида если зелёный горит и пользователь НЕ нажал launch
  // (болид трогается сам спустя 500мс для демо — можно убрать если не нужно)
  // Закомментировано — только ручной старт:
  // useEffect(() => {
  //   if (sequence === 6) {
  //     const autoLaunch = setTimeout(() => {
  //       if (phaseRef.current === 'starting') {
  //         velRef.current = 3.0;
  //         setPhase('running');
  //         phaseRef.current = 'running';
  //       }
  //     }, 500);
  //     return () => clearTimeout(autoLaunch);
  //   }
  // }, [sequence]);

  function reset() {
    if (seqTimerRef.current) clearTimeout(seqTimerRef.current);
    velRef.current = 0;
    distRef.current = 0;
    setPhase('idle');
    phaseRef.current = 'idle';
    setSequence(0);
    seqRef.current = 0;
    setTel({ velocityMs: 0, rpm: 0, gear: 1, drs: false });
    setReactionMs(null);
    setShowJumpStart(false);
    setDistanceTraveled(0);
    setRaceTimeMs(null);
    if (carRef.current) {
      carRef.current.position.set(0, 0, 0);
      carRef.current.rotation.set(0, 0, 0);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setModelUrl(URL.createObjectURL(file));
      setIsObj(file.name.toLowerCase().endsWith('.obj'));
    }
  }

  const scrollSpeed = phase === 'running' ? tel.velocityMs * 0.06 : 0;

  const formatTime = (ms: number) => {
    const s = ms / 1000;
    return `${s.toFixed(3)}s`;
  };

  return (
    <div style={styles.root}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.5, 12], fov: 42, near: 0.1, far: 3000 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <fog attach="fog" args={['#050508', 80, 600]} />
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[30, 60, 40]}
          intensity={3.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={400}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <directionalLight position={[-20, 20, -30]} intensity={0.8} color="#87ceeb" />
        <pointLight position={[0, 8, -18]} intensity={0.6} color="#ffffff" />

        <Suspense fallback={
          <Html center>
            <span style={{ color: '#fff', fontFamily: 'monospace', letterSpacing: 4 }}>LOADING MODEL...</span>
          </Html>
        }>
          <Environment preset="city" background={false} />
          <Track scrollSpeed={scrollSpeed} />
          <TrackSurrounds />
          {sequence > 0 && <Gantry sequenceState={sequence} />}

          <F1Car
            modelUrl={modelUrl}
            isObj={isObj}
            phase={phase}
            carRef={carRef}
            velocity={tel.velocityMs}
            inspectMode={inspectMode}
          />

          <FinishLine distanceTraveled={distanceTraveled} />

          <ContactShadows
            resolution={1024}
            scale={16}
            blur={1.5}
            opacity={0.7}
            far={8}
            color="#000"
          />

          <PhysicsTick
            velRef={velRef}
            distRef={distRef}
            raceStartRef={raceStartRef}
            phase={phase}
            setTel={setTel}
            setPhase={setPhase}
            setDistanceTraveled={setDistanceTraveled}
            carRef={carRef}
            onFinish={handleFinish}
          />

          <ChaseCam carRef={carRef} phase={phase} velocity={tel.velocityMs} />
          {phase !== 'running' && phase !== 'finished' && (
            <OrbitControls
              target={[0, 0.5, 0]}
              maxPolarAngle={Math.PI / 2.05}
              minDistance={3}
              maxDistance={25}
              enablePan={false}
            />
          )}
        </Suspense>
      </Canvas>

      {/* ── UI OVERLAY ── */}
      <div style={styles.ui}>
        <div style={styles.header}>
          <div style={styles.logo}>SKYRESS <span style={{ color: '#E10600' }}>GP</span></div>
          <div style={styles.teamList}>
            <div>MANUFACTURING <span style={{ color: 'rgba(255,255,255,.4)' }}>·</span> YEKIYA ISLAM</div>
            <div>ENTERPRISE <span style={{ color: 'rgba(255,255,255,.4)' }}>·</span> NAMIYASH AIBOL</div>
            <div>DIGITAL <span style={{ color: 'rgba(255,255,255,.4)' }}>·</span> NYSSANALY ASLAN</div>
          </div>
        </div>

        {(phase === 'starting' || phase === 'running') && sequence > 0 && (
          <LightsPanel seq={sequence} />
        )}

        {phase === 'running' && (
          <TelemetryHUD tel={tel} phase={phase} reactionMs={reactionMs} />
        )}

        {(phase === 'running' || phase === 'finished') && (
          <TrackProgress distanceTraveled={distanceTraveled} phase={phase} />
        )}

        {showJumpStart && (
          <div style={styles.jsOverlay}>
            <div style={styles.jsTitle}>JUMP START</div>
            <div style={styles.jsSub}>10-SECOND PENALTY — RACE DISQUALIFIED</div>
            <button style={{ ...styles.btnPrimary, pointerEvents: 'all', marginTop: 24 }} onClick={reset}>
              RESET
            </button>
          </div>
        )}

        {phase === 'finished' && !showJumpStart && (
          <div style={styles.finishedOverlay}>
            <div style={styles.finTitle}>RACE COMPLETE</div>
            {raceTimeMs !== null && (
              <div style={{ ...styles.finStat, fontSize: 28, color: '#fff', marginTop: 8 }}>
                {formatTime(raceTimeMs)}
              </div>
            )}
            <div style={styles.finStat}>TOP SPEED {Math.round(PHYSICS.V_MAX * 3.6)} KM/H</div>
            {reactionMs !== null && (
              <div style={styles.finStat}>REACTION {Math.round(reactionMs)} MS</div>
            )}
            <button
              style={{ ...styles.btnPrimary, pointerEvents: 'all', marginTop: 20 }}
              onClick={reset}
            >
              RACE AGAIN
            </button>
          </div>
        )}

        <div style={styles.bottomBar}>
          <div style={styles.btnRow}>
            <label style={styles.uploadBtn}>
              UPLOAD MODEL
              <input type="file" accept=".glb,.gltf,.obj" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>

            <button
              style={{ ...styles.btn, ...(inspectMode ? styles.btnActive : {}) }}
              onClick={() => setInspectMode(v => !v)}
            >
              INSPECT
            </button>

            {phase === 'idle' && (
              <button style={styles.btnPrimary} onClick={enterTrack}>
                ENTER TRACK
              </button>
            )}

            {phase === 'starting' && (
              <button
                style={{
                  ...styles.btnPrimary,
                  ...(sequence === 6 ? styles.btnGreen : styles.btnRed),
                  animation: sequence === 6 ? 'pulse 0.5s infinite alternate' : 'none',
                }}
                onClick={handleLaunch}
              >
                {sequence === 6 ? '⚡ LAUNCH!' : 'WAIT...'}
              </button>
            )}

            {phase === 'running' && (
              <button style={{ ...styles.btn, color: 'rgba(255,255,255,0.3)', cursor: 'default' }}>
                RACING...
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={styles.vignette} />
      <div style={styles.scanlines} />

      <style>{`
        @keyframes pulse {
          from { box-shadow: 0 0 10px rgba(0,255,110,.4); }
          to { box-shadow: 0 0 30px rgba(0,255,110,.9), 0 0 60px rgba(0,255,110,.4); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    background: '#0a0a0f',
    overflow: 'hidden',
    fontFamily: '"Courier New", Courier, monospace',
  },
  ui: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '18px 24px',
    background: 'linear-gradient(180deg,rgba(0,0,0,.85) 0%,transparent 100%)',
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 5,
    color: '#fff',
  },
  teamList: {
    textAlign: 'right',
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,.45)',
    lineHeight: 1.9,
  },
  lightsPanel: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    gap: 14,
  },
  lightPod: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    transition: 'all 0.15s ease',
  },
  speedWrap: {
    position: 'absolute',
    bottom: 90,
    left: 24,
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  speedNum: {
    fontSize: 64,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1,
    letterSpacing: -2,
  },
  speedUnit: {
    fontSize: 13,
    letterSpacing: 3,
    color: 'rgba(255,255,255,.5)',
  },
  gearBox: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    textAlign: 'center',
    background: 'rgba(0,0,0,.7)',
    border: '1.5px solid rgba(255,255,255,.15)',
    padding: '8px 20px',
    backdropFilter: 'blur(8px)',
  },
  gearNum: {
    fontSize: 56,
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1,
  },
  gearLabel: {
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,.4)',
    marginTop: 2,
  },
  rpmWrap: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 24px',
  },
  rpmLabel: {
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,.4)',
    minWidth: 30,
  },
  rpmTrack: {
    flex: 1,
    display: 'flex',
    gap: 3,
    alignItems: 'center',
    height: 12,
  },
  rpmBar: {
    flex: 1,
    height: '100%',
    borderRadius: 1,
    transition: 'background 0.04s',
  },
  rpmValue: {
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(255,255,255,.5)',
    minWidth: 60,
    textAlign: 'right',
  },
  drsActive: {
    position: 'absolute',
    top: 20,
    right: 24,
    padding: '4px 12px',
    background: '#00e64e',
    color: '#001a0a',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 3,
    borderRadius: 2,
  },
  reactionOverlay: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    textAlign: 'center',
  },
  reactionLabel: {
    fontSize: 12,
    letterSpacing: 4,
    color: 'rgba(255,255,255,.5)',
    marginBottom: 4,
  },
  reactionVal: {
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: -2,
    lineHeight: 1,
  },
  progressWrap: {
    position: 'absolute',
    top: 72,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(0,0,0,0.6)',
    padding: '8px 16px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
    minWidth: 280,
  },
  progressLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.4)',
    minWidth: 35,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #E10600, #ff6600)',
    borderRadius: 3,
    transition: 'width 0.1s linear',
  },
  progressCar: {
    position: 'absolute',
    top: -6,
    transform: 'translateX(-50%) rotate(0deg)',
    fontSize: 10,
    color: '#fff',
    transition: 'left 0.1s linear',
  },
  progressDist: {
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.4)',
    minWidth: 70,
    textAlign: 'right',
  },
  jsOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(225,6,0,0.12)',
    backdropFilter: 'blur(2px)',
    pointerEvents: 'all',
  },
  jsTitle: {
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: 8,
    color: '#E10600',
    textShadow: '0 0 40px rgba(225,6,0,.8)',
  },
  jsSub: {
    fontSize: 12,
    letterSpacing: 4,
    color: 'rgba(255,255,255,.5)',
    marginTop: 12,
  },
  finishedOverlay: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    textAlign: 'center',
    background: 'rgba(0,0,0,0.88)',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '32px 48px',
    backdropFilter: 'blur(12px)',
    pointerEvents: 'all',
  },
  finTitle: {
    fontSize: 48,
    fontWeight: 700,
    letterSpacing: 6,
    color: '#fff',
  },
  finStat: {
    fontSize: 13,
    letterSpacing: 4,
    color: 'rgba(255,255,255,.5)',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '0 24px 20px',
    background: 'linear-gradient(0deg,rgba(0,0,0,.85) 0%,transparent 100%)',
    pointerEvents: 'all',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn: {
    padding: '10px 22px',
    fontFamily: '"Courier New", monospace',
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: 700,
    border: '1.5px solid rgba(255,255,255,.25)',
    background: 'rgba(0,0,0,.6)',
    color: 'rgba(255,255,255,.7)',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'all .15s',
  },
  btnActive: {
    borderColor: '#E10600',
    color: '#E10600',
  },
  uploadBtn: {
    padding: '10px 22px',
    fontFamily: '"Courier New", monospace',
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: 700,
    border: '1.5px solid rgba(255,255,255,.2)',
    background: 'rgba(0,0,0,.6)',
    color: 'rgba(255,255,255,.5)',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  },
  btnPrimary: {
    padding: '12px 32px',
    fontFamily: '"Courier New", monospace',
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: 700,
    border: '1.5px solid rgba(255,255,255,.5)',
    background: 'rgba(0,0,0,.8)',
    color: '#fff',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'all .15s',
  },
  btnRed: {
    borderColor: '#E10600',
    color: '#E10600',
  },
  btnGreen: {
    borderColor: '#00ff6e',
    color: '#00ff6e',
    boxShadow: '0 0 16px rgba(0,255,110,.4)',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.75) 100%)',
    pointerEvents: 'none',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)',
    pointerEvents: 'none',
  },
};
