'use client';

import { Canvas as R3FCanvas } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import { Sky } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { ACESFilmicToneMapping, type Mesh } from 'three';
import { Ship } from './Ship';

/**
 * Sea — large plane with sunset-tinted reflective material.
 * Real water shader is a follow-up; this reads correctly under golden hour.
 */
function Sea() {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    // Subtle breathing motion
    ref.current.position.y = -0.3 + Math.sin(t * 0.3) * 0.015;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
      <planeGeometry args={[120, 120, 1, 1]} />
      <meshStandardMaterial
        color="#1a2545"
        roughness={0.25}
        metalness={0.85}
      />
    </mesh>
  );
}

/**
 * Sunset lighting rig.
 * Directional warm key from the sun direction + cool fill from the opposite side.
 */
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#b8a088" />
      <directionalLight
        position={[-8, 6, -3]}
        intensity={2.2}
        color="#ffb070"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[5, 2, 8]}
        intensity={0.4}
        color="#4a5f8f"
      />
      {/* Soft rim from behind the ship */}
      <pointLight position={[-10, 3, -5]} intensity={0.6} color="#ff9050" distance={30} />
    </>
  );
}

/**
 * Main R3F canvas for the HeroShip scene.
 * Uses ACES tone mapping for filmic golden-hour look.
 */
export function Canvas() {
  return (
    <R3FCanvas
      camera={{ position: [4, 2.5, 7], fov: 42 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#1a1f3a']} />
      <fog attach="fog" args={['#2d2544', 12, 45]} />

      <Suspense fallback={null}>
        {/* Sunset sky */}
        <Sky
          distance={450000}
          sunPosition={[-10, 1, -4]}
          turbidity={8}
          rayleigh={3}
          mieCoefficient={0.005}
          mieDirectionalG={0.92}
        />

        <Lighting />
        <Sea />
        <Ship />
      </Suspense>
    </R3FCanvas>
  );
}
