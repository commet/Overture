'use client';

import { useRef, Suspense, Component, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { DoubleSide, type Group } from 'three';

const MODEL_PATH = '/models/ship.glb';

/**
 * Minimal error boundary — if GLB is missing/fails, render placeholder
 * instead of crashing the canvas.
 */
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Swallow — falls back to placeholder
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * Placeholder ship — faceted primitives composed into a simple sailing vessel.
 * Visible until /public/models/ship.glb is in place.
 */
function PlaceholderShip() {
  return (
    <group>
      {/* Hull — main body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[3.2, 0.7, 1.15]} />
        <meshStandardMaterial color="#5c3d22" roughness={0.88} metalness={0.05} />
      </mesh>

      {/* Hull — bow taper (pointed front) */}
      <mesh position={[1.8, 0.35, 0]} castShadow>
        <coneGeometry args={[0.58, 1.2, 4]} />
        <meshStandardMaterial color="#4a3019" roughness={0.88} metalness={0.05} />
      </mesh>

      {/* Hull — stern (square back) */}
      <mesh position={[-1.6, 0.5, 0]} castShadow>
        <boxGeometry args={[0.4, 1, 1.15]} />
        <meshStandardMaterial color="#4a3019" roughness={0.88} metalness={0.05} />
      </mesh>

      {/* Deck */}
      <mesh position={[0, 0.71, 0]} castShadow>
        <boxGeometry args={[3.1, 0.05, 1.05]} />
        <meshStandardMaterial color="#8a6a3d" roughness={0.8} />
      </mesh>

      {/* Main mast (center) */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 2.4, 8]} />
        <meshStandardMaterial color="#3a2814" roughness={0.9} />
      </mesh>

      {/* Main sail */}
      <mesh position={[0, 2, 0.03]} castShadow>
        <planeGeometry args={[1.9, 1.5]} />
        <meshStandardMaterial color="#ead2a0" roughness={0.7} side={DoubleSide} />
      </mesh>

      {/* Fore mast */}
      <mesh position={[1.1, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 1.9, 8]} />
        <meshStandardMaterial color="#3a2814" roughness={0.9} />
      </mesh>

      {/* Fore sail */}
      <mesh position={[1.1, 1.65, 0.02]} castShadow>
        <planeGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#ead2a0" roughness={0.7} side={DoubleSide} />
      </mesh>

      {/* Crow's nest — placeholder for 망루 */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.22, 12]} />
        <meshStandardMaterial color="#5c3d22" roughness={0.85} />
      </mesh>

      {/* Helm wheel — placeholder for 악장 */}
      <mesh position={[-1.2, 1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.18, 0.04, 6, 16]} />
        <meshStandardMaterial color="#6b4a2b" roughness={0.85} />
      </mesh>
    </group>
  );
}

/**
 * Tries to load the real GLB. If missing, ErrorBoundary above swaps to placeholder.
 */
function RealShip() {
  const gltf = useGLTF(MODEL_PATH);
  return <primitive object={gltf.scene} scale={1} />;
}

export function Ship() {
  const ref = useRef<Group>(null);

  // Gentle ocean sway — the ship is always slightly moving
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.z = Math.sin(t * 0.5) * 0.025;
    ref.current.rotation.x = Math.sin(t * 0.35) * 0.015;
    ref.current.position.y = Math.sin(t * 0.7) * 0.04;
  });

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <ErrorBoundary fallback={<PlaceholderShip />}>
        <Suspense fallback={<PlaceholderShip />}>
          <RealShip />
        </Suspense>
      </ErrorBoundary>
    </group>
  );
}
