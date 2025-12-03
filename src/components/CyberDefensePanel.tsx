import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';


/**
 * Small lerp utility for smooth transitions
 */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Scene context so 3D can react to UI:
 *  - cursorTarget: normalized mouse position
 *  - isInputFocused: any auth input focused?
 */
interface SceneContextType {
  cursorTarget: { x: number; y: number };
  isInputFocused: boolean;
}

const SceneContext = createContext<SceneContextType>({
  cursorTarget: { x: 0, y: 0 },
  isInputFocused: false,
});

/* -------------------------------------------------------------------------- */
/*  TACTICAL SHIELD — MAIN VISUAL NARRATIVE                                   */
/* -------------------------------------------------------------------------- */

/**
 * Layered octagonal shield:
 *  - Outer plates = perimeter firewall
 *  - Inner cores  = encryption layers
 *  - Sweep arc    = active scan
 *  - Edge markers = threat contact points
 */
function TacticalShield() {
  const groupRef = useRef<THREE.Group>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const { cursorTarget, isInputFocused } = useContext(SceneContext);

  const ringLayers = [
    { r: 3.0, color: '#00eaff', emission: 1.2, width: 0.14 },
    { r: 2.4, color: '#6366f1', emission: 1.3, width: 0.14 },
    { r: 1.8, color: '#06d6a0', emission: 1.4, width: 0.16 },
    { r: 1.2, color: '#0891b2', emission: 1.8, width: 0.2 },
  ];

  useFrame((state) => {
    if (!groupRef.current || !coreRef.current) return;
    const t = state.clock.elapsedTime;

    groupRef.current.rotation.z = Math.sin(t * 0.15) * 0.04;
    groupRef.current.rotation.y = lerp(
      groupRef.current.rotation.y,
      cursorTarget.x * 0.18,
      0.06
    );

    // Encryption heartbeat (moves energy)
    const scalePulse = 1 + Math.sin(t * 3.5) * 0.045;
    coreRef.current.scale.set(scalePulse, scalePulse, scalePulse);

    // Active verification — expands shield slightly
    const focusGrow = isInputFocused ? 1.12 : 1;
    groupRef.current.scale.set(1.15 * focusGrow, 1.15 * focusGrow, 1.15 * focusGrow);

    if (sweepRef.current) {
      sweepRef.current.rotation.z -= 0.015;
    }
  });

  return (
    <group ref={groupRef} position={[-3.6, 0.2, 0]}>
      {/* Outer Security Layers */}
      {ringLayers.map((l, i) => (
        <mesh key={i} position={[0, 0, 0.02 * i]}>
          <ringGeometry args={[l.r - l.width, l.r, 64]} />
          <meshStandardMaterial
            color={l.color}
            emissive={l.color}
            emissiveIntensity={l.emission}
            metalness={1}
            roughness={0.1}
            transparent
            opacity={0.88 - i * 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Encryption Core */}
      <mesh ref={coreRef} position={[0, 0, 0.2]}>
        <sphereGeometry args={[0.9, 48, 48]} />
        <meshStandardMaterial
          color="#0ea5e9"
          emissive="#38bdf8"
          emissiveIntensity={2.5}
          metalness={1}
          roughness={0.3}
        />
      </mesh>

      {/* Sweep Scanner */}
      <mesh ref={sweepRef} position={[0, 0, 0.25]}>
        <ringGeometry args={[1.15, 1.75, 64, 1, 0, Math.PI / 1.3]} />
        <meshStandardMaterial
          color="#22d3ee"
          transparent
          opacity={0.9}
          emissive="#22d3ee"
          emissiveIntensity={2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  BACKGROUND GRID + PARALLAX CAMERA                                         */
/* -------------------------------------------------------------------------- */

function CyberScene({
  mouseX = 0,
  mouseY = 0,
  cursorTarget,
  isInputFocused,
}: {
  mouseX?: number;
  mouseY?: number;
  cursorTarget: { x: number; y: number };
  isInputFocused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const targetRotation = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useFrame(() => {
    // Group parallax (very small angle, feels like whole scene tilts)
    if (!prefersReducedMotion.current && groupRef.current) {
      targetRotation.current.y = mouseX * 0.024; // ≈ 1.3°
      targetRotation.current.x = -mouseY * 0.018; // ≈ 1°
      groupRef.current.rotation.y = lerp(
        groupRef.current.rotation.y,
        targetRotation.current.y,
        0.08,
      );
      groupRef.current.rotation.x = lerp(
        groupRef.current.rotation.x,
        targetRotation.current.x,
        0.08,
      );
    }

    // subtle camera drift
    if (!prefersReducedMotion.current) {
      const t = performance.now() * 0.00008;
      camera.position.x = Math.sin(t) * 0.25;
      camera.position.y = 1.4 + Math.cos(t * 1.2) * 0.12;
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 6, 22]} />

      <ambientLight intensity={0.18} />
      <pointLight position={[8, 10, 8]} intensity={0.6} color="#38bdf8" />
      <pointLight position={[-6, -4, 6]} intensity={0.3} color="#f97316" />

      <SceneContext.Provider value={{ cursorTarget, isInputFocused }}>
        <group ref={groupRef}>
          {/* Tactical shield is the hero element */}
          <TacticalShield />
        </group>
      </SceneContext.Provider>

      {/* Ground grid – very soft, no harsh lines */}
      <gridHelper
        args={[40, 40, 'rgba(34,211,238,0.08)', 'rgba(15,23,42,0.2)']}
        position={[0, -2, 0]}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  CYBER DEFENSE PANEL WRAPPER (USED BY LOGIN / REGISTER)                    */
/* -------------------------------------------------------------------------- */

export function CyberDefensePanel({
  fullWidth: _fullWidth = false,
  onInputFocusChange,
}: {
  fullWidth?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}) {
  const [isExtension, setIsExtension] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorTarget, setCursorTarget] = useState({ x: 0, y: 0 });
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Extension popup detection
    const isPopup = window.innerWidth < 600 || window.innerHeight < 600;
    setIsExtension(isPopup);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce');
    setPrefersReducedMotion(mq.matches);
    const handleMq = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handleMq);

    return () => {
      mq.removeEventListener('change', handleMq);
    };
  }, []);

  // Mouse → parallax target
  useEffect(() => {
    if (prefersReducedMotion || isExtension) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
      setCursorTarget((prev) => ({
        x: prev.x + (x - prev.x) * 0.12,
        y: prev.y + (y - prev.y) * 0.12,
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion, isExtension]);

  // Hook up auth inputs via window events (you already dispatch these)
  useEffect(() => {
    const handleFocus = () => {
      setIsInputFocused(true);
      onInputFocusChange?.(true);
    };
    const handleBlur = () => {
      setIsInputFocused(false);
      onInputFocusChange?.(false);
    };

    window.addEventListener('input-focus', handleFocus as any);
    window.addEventListener('input-blur', handleBlur as any);

    return () => {
      window.removeEventListener('input-focus', handleFocus as any);
      window.removeEventListener('input-blur', handleBlur as any);
    };
  }, [onInputFocusChange]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020617]">
      {/* Three.js canvas (full cinematic) */}
      {!isExtension && (
        <Canvas
          camera={{ position: [0, 1.8, 9], fov: 45 }}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          frameloop={document.hidden ? 'never' : 'always'}
          className="absolute inset-0"
        >
          <CyberScene
            mouseX={mousePos.x}
            mouseY={mousePos.y}
            cursorTarget={cursorTarget}
            isInputFocused={isInputFocused}
          />
        </Canvas>
      )}

      {/* Fallback for extension popup – flat gradient + grid */}
      {isExtension && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.35),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(129,140,248,0.25),_transparent_60%)]" />
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
      )}

      {/* VERY subtle vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8))]" />
    </div>
  );
}
