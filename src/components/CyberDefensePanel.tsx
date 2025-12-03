// src/components/CyberDefensePanel.tsx

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ---- static geometries so they aren't re-created every frame ----
const HEX_SHELL_GEOMETRY = new THREE.IcosahedronGeometry(1.6, 2);
const HEX_SHELL_EDGES = new THREE.EdgesGeometry(HEX_SHELL_GEOMETRY);

const INNER_SHELL_GEOMETRY = new THREE.IcosahedronGeometry(1.1, 2);
const INNER_SHELL_EDGES = new THREE.EdgesGeometry(INNER_SHELL_GEOMETRY);

const CORE_GEOMETRY = new THREE.SphereGeometry(0.85, 32, 32);
const BASE_RING_GEOMETRY = new THREE.RingGeometry(2.1, 2.7, 64);

const LOCK_BODY_GEOMETRY = new THREE.BoxGeometry(0.7, 0.9, 0.18);
const LOCK_SHACKLE_GEOMETRY = new THREE.TorusGeometry(
  0.45,
  0.07,
  16,
  32,
  Math.PI
);
const LOCK_KEYHOLE_CIRCLE = new THREE.CircleGeometry(0.08, 16);
const LOCK_KEYHOLE_STEM = new THREE.BoxGeometry(0.04, 0.14, 0.03);

// ---- Hex shield sphere (outer glow + inner hex shell + core) ----
function HexShieldSphere({
  isFocused,
  glowIntensity,
  rotationSpeed,
}: {
  isFocused: boolean;
  glowIntensity: number;
  rotationSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // medium rotation
    groupRef.current.rotation.y = t * rotationSpeed;
    groupRef.current.rotation.x = Math.sin(t * 0.25) * 0.18;

    // subtle breathing + focus bump
    const base = 1;
    const pulse = 1 + Math.sin(t * 2.0) * 0.03;
    const focus = isFocused ? 1.08 : 1;
    const scale = base * pulse * focus;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} position={[-2.5, 0.25, 0]}>
      {/* Outer additive glow shell */}
      <mesh>
        <sphereGeometry args={[2.05, 48, 48]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer hex / geodesic shell */}
      <lineSegments geometry={HEX_SHELL_EDGES}>
        <lineBasicMaterial
          color="#38e9ff"
          linewidth={1}
          transparent
          opacity={0.8}
        />
      </lineSegments>

      {/* Inner hex shell */}
      <lineSegments geometry={INNER_SHELL_EDGES}>
        <lineBasicMaterial
          color="#22c1f1"
          linewidth={0.5}
          transparent
          opacity={0.9}
        />
      </lineSegments>

      {/* Core sphere */}
      <mesh geometry={CORE_GEOMETRY}>
        <meshStandardMaterial
          color="#020617"
          emissive="#0ea5e9"
          emissiveIntensity={glowIntensity}
          metalness={0.4}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// ---- Lock glyph (style B) in front of shield ----
function LockGlyph({
  isFocused,
  glowIntensity,
}: {
  isFocused: boolean;
  glowIntensity: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // medium rotation around Y
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.25;

    const baseScale = 0.9;
    const pulse = 1 + Math.sin(t * 3.0) * 0.02;
    const focus = isFocused ? 1.08 : 1;
    const s = baseScale * pulse * focus;
    groupRef.current.scale.setScalar(s);
  });

  return (
    <group position={[-2.5, -0.1, 1.3]} ref={groupRef}>
      {/* Body */}
      <mesh geometry={LOCK_BODY_GEOMETRY}>
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#22d3ee"
          emissiveIntensity={glowIntensity}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>

      {/* Shackle */}
      <mesh
        geometry={LOCK_SHACKLE_GEOMETRY}
        position={[0, 0.55, 0]}
        rotation={[Math.PI, 0, 0]}
      >
        <meshStandardMaterial
          color="#e0f2fe"
          emissive="#38bdf8"
          emissiveIntensity={glowIntensity * 0.7}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Keyhole circle */}
      <mesh
        geometry={LOCK_KEYHOLE_CIRCLE}
        position={[0, -0.05, 0.1]}
        rotation={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#020617"
          emissive="#0f172a"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Keyhole stem */}
      <mesh
        geometry={LOCK_KEYHOLE_STEM}
        position={[0, -0.18, 0.11]}
      >
        <meshStandardMaterial
          color="#020617"
          emissive="#020617"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}

// ---- Scene wrapper (camera, lights, parallax, base ring) ----
function CyberScene({
  mouseX,
  mouseY,
  lowPowerMode,
  isExtension,
  isInputFocused,
}: {
  mouseX: number;
  mouseY: number;
  lowPowerMode: boolean;
  isExtension: boolean;
  isInputFocused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useFrame(() => {
    const t = performance.now() * 0.001;

    if (!prefersReducedMotion && groupRef.current) {
      // subtle parallax, clamped
      const targetY = THREE.MathUtils.clamp(mouseX * 0.03, -0.5, 0.5);
      const targetX = THREE.MathUtils.clamp(-mouseY * 0.025, -0.4, 0.4);

      groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.08;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.08;
    }

    if (!prefersReducedMotion) {
      camera.position.x = Math.sin(t * 0.1) * 0.15;
      camera.position.y = 1.3 + Math.cos(t * 0.07) * 0.1;
      camera.lookAt(0, 0.3, 0);
    }
  });

  const glow = lowPowerMode ? 0.9 : 1.4;
  const rot = lowPowerMode ? 0.18 : 0.28;

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 6, 24]} />

      <group ref={groupRef}>
        {/* Base grid / plane */}
        <gridHelper
          args={[40, 40, "rgba(34,211,238,0.15)", "rgba(15,23,42,0.2)"]}
          position={[0, -2, 0]}
        />

        {/* Soft ground disk under sphere */}
        <mesh
          geometry={BASE_RING_GEOMETRY}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-2.5, -1.4, 0]}
        >
          <meshBasicMaterial
            color="#0ea5e9"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>

        <HexShieldSphere
          isFocused={isInputFocused}
          glowIntensity={glow}
          rotationSpeed={rot}
        />
        <LockGlyph isFocused={isInputFocused} glowIntensity={glow * 0.7} />
      </group>

      {/* Lights */}
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[4, 6, 6]}
        intensity={1.1}
        color="#bae6fd"
      />
      <pointLight position={[-5, 3, 4]} intensity={1.4} color="#22d3ee" />
      <pointLight position={[-3, -2, -4]} intensity={0.7} color="#a855f7" />
    </>
  );
}

// ---- Public component used by Login / Register ----
export function CyberDefensePanel({
  fullWidth: _fullWidth = false,
  onInputFocusChange,
}: {
  fullWidth?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}) {
  const [isExtension, setIsExtension] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // detect popup / low power
  useEffect(() => {
    const popup = window.innerWidth < 600 || window.innerHeight < 600;
    setIsExtension(popup);

    setLowPowerMode(popup || window.outerWidth - window.innerWidth > 160);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);

    const visHandler = () => {
      setLowPowerMode(document.hidden || popup);
    };
    document.addEventListener("visibilitychange", visHandler);

    return () => {
      mq.removeEventListener("change", handler);
      document.removeEventListener("visibilitychange", visHandler);
    };
  }, []);

  // parallax mouse tracking
  useEffect(() => {
    if (prefersReducedMotion || isExtension) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReducedMotion, isExtension]);

  // listen for focus events from inputs
  useEffect(() => {
    const handleFocus = () => setIsInputFocused(true);
    const handleBlur = () => setIsInputFocused(false);

    window.addEventListener("input-focus", handleFocus as any);
    window.addEventListener("input-blur", handleBlur as any);

    return () => {
      window.removeEventListener("input-focus", handleFocus as any);
      window.removeEventListener("input-blur", handleBlur as any);
    };
  }, []);

  // notify parent if they care
  useEffect(() => {
    if (onInputFocusChange) {
      onInputFocusChange(isInputFocused);
    }
  }, [isInputFocused, onInputFocusChange]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-cyber-steel">
      {/* Three.js Canvas */}
      {!isExtension && (
        <Canvas
          camera={{ position: [0, 1.4, 7.2], fov: 45 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
          }}
          className="absolute inset-0"
        >
          <CyberScene
            mouseX={mousePos.x}
            mouseY={mousePos.y}
            lowPowerMode={lowPowerMode}
            isExtension={isExtension}
            isInputFocused={isInputFocused}
          />
        </Canvas>
      )}

      {/* Fallback background for extension popup */}
      {isExtension && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0 opacity-25 bg-cyber-grid" />
        </div>
      )}

      {/* very light HUD data stream behind everything */}
      <div className="absolute inset-0 flex justify-around items-start pointer-events-none overflow-hidden opacity-10">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col space-y-1 text-[8px] font-mono text-cyan-400 animate-scroll-up"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            {Array.from({ length: 36 }).map((__, j) => (
              <span key={j}>{Math.random().toString(16).substring(2, 8)}</span>
            ))}
          </div>
        ))}
      </div>

      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/70 pointer-events-none" />
    </div>
  );
}
