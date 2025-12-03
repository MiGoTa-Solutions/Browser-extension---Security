// src/components/CyberDefensePanel.tsx

import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';



// --------- Shared utilities / context ---------

const lerp = (start: number, end: number, factor: number) =>
  start + (end - start) * factor;

interface SceneContextType {
  cursorTarget: { x: number; y: number };
  isInputFocused: boolean;
}

const SceneContext = createContext<SceneContextType>({
  cursorTarget: { x: 0, y: 0 },
  isInputFocused: false,
});

// --------- Tactical Shield Core (Option 1) ---------

/**
 * Main hero object on the left.
 * Visually: layered octagonal shield + inner energy core + rotating scan wedge.
 * Story: this *is* SecureShield’s defense core.
 */
function TacticalShieldCore() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const rimRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow overall rotation – feels like an orbital defense core
    groupRef.current.rotation.z = t * 0.12;

    // Core breathing
    if (coreRef.current) {
      const s = 1 + Math.sin(t * 1.7) * 0.06;
      coreRef.current.scale.set(s, s, s);
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.3 + Math.sin(t * 2.4) * 0.3;
    }

    // Scan wedge sweeping around like a radar
    if (scanRef.current) {
      scanRef.current.rotation.z = -t * 0.9;
      const mat = scanRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.22 + (Math.sin(t * 3) + 1) * 0.1; // soft breathing
    }

    // Outer rim subtle shimmering
    if (rimRef.current) {
      const mat = rimRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.7 + (Math.sin(t * 2.8) + 1) * 0.15;
    }
  });

  // Helper: make an “octagon-ish” ring by reducing segments
  const OCT_SEGMENTS = 8;

  return (
    <group ref={groupRef} position={[-2.6, 0, 0]}>
      {/* Outer defense rim */}
      <mesh ref={rimRef}>
        <ringGeometry
          args={[2.1, 2.35, OCT_SEGMENTS, 1, 0, Math.PI * 2]}
        />
        <meshStandardMaterial
          color="#00F5FF"
          emissive="#00F5FF"
          emissiveIntensity={0.8}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary inner ring (slightly inset, violet tint) */}
      <mesh>
        <ringGeometry
          args={[1.6, 1.9, OCT_SEGMENTS, 1, 0, Math.PI * 2]}
        />
        <meshStandardMaterial
          color="#7F5AF0"
          emissive="#7F5AF0"
          emissiveIntensity={0.9}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner core plate */}
      <mesh ref={coreRef}>
        <circleGeometry args={[1.4, OCT_SEGMENTS]} />
        <meshStandardMaterial
          color="#02101A"
          emissive="#00E8FF"
          emissiveIntensity={1.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Hex/Oct grid lines inside the core */}
      {Array.from({ length: 3 }, (_, i) => (
        <mesh key={i}>
          <ringGeometry
            args={[0.4 + i * 0.3, 0.45 + i * 0.3, OCT_SEGMENTS, 1]}
          />
          <meshBasicMaterial
            color="#00FFE0"
            transparent
            opacity={0.35 - i * 0.08}
          />
        </mesh>
      ))}

      {/* Rotating scan wedge */}
      <mesh ref={scanRef}>
        {/* Ring segment: inner radius, outer radius, segments, thetaStart, thetaLength */}
        <ringGeometry
          args={[1.5, 2.2, 64, 1, 0, Math.PI / 3]}
        />
        <meshStandardMaterial
          color="#00FFE0"
          emissive="#00FFE0"
          emissiveIntensity={0.9}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Threat markers around perimeter – clearly attached to the shield, not “random” */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 2.3;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              0.02,
            ]}
          >
            <boxGeometry args={[0.12, 0.32, 0.06]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#FF0055' : '#FBBF24'}
              emissive={i % 2 === 0 ? '#FF0055' : '#FBBF24'}
              emissiveIntensity={1.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// --------- Scanning Ring (kept, but simplified + aligned with shield) ---------

function ScanningRing() {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetRotation = useRef({ x: 0, y: 0 });
  const { cursorTarget, isInputFocused } = useContext(SceneContext);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Cursor-driven tilt
    targetRotation.current.y = cursorTarget.x * 0.4;
    targetRotation.current.x = -cursorTarget.y * 0.25;

    meshRef.current.rotation.y = lerp(
      meshRef.current.rotation.y,
      targetRotation.current.y,
      0.08
    );
    meshRef.current.rotation.x = lerp(
      meshRef.current.rotation.x,
      targetRotation.current.x,
      0.08
    );

    // Gentle rotation so it feels alive but not noisy
    meshRef.current.rotation.z += 0.003;

    const base = 0.9 + Math.sin(t * Math.PI) * 0.06;
    const focusScale = isInputFocused ? 1.12 : 1;
    const s = base * focusScale;
    meshRef.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={meshRef} position={[-2.6, 0, -0.8]}>
      <torusGeometry args={[2.55, 0.06, 12, 64]} />
      <meshStandardMaterial
        color="#00FFCC"
        emissive="#00FFCC"
        emissiveIntensity={0.7}
        transparent
        opacity={0.65}
        toneMapped={false}
      />
    </mesh>
  );
}

// --------- Main 3D Scene ---------

function CyberScene({
  mouseX = 0,
  mouseY = 0,
  isExtension = false,
  cursorTarget,
  isInputFocused,
}: {
  mouseX?: number;
  mouseY?: number;
  isExtension?: boolean;
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
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useFrame(() => {
    if (!prefersReducedMotion.current && groupRef.current) {
      targetRotation.current.y = mouseX * 0.026; // ~1.5 degrees
      targetRotation.current.x = -mouseY * 0.02; // ~1.1 degrees

      groupRef.current.rotation.y = lerp(
        groupRef.current.rotation.y,
        targetRotation.current.y,
        0.08
      );
      groupRef.current.rotation.x = lerp(
        groupRef.current.rotation.x,
        targetRotation.current.x,
        0.08
      );
    }

    if (!prefersReducedMotion.current) {
      camera.position.x = Math.sin(Date.now() * 0.00012) * 0.12;
      camera.position.y = Math.cos(Date.now() * 0.00009) * 0.09;
    }
  });

  return (
    <>
      <color attach="background" args={['#050811']} />
      <fog attach="fog" args={['#050811', 4, 18]} />

      <ambientLight intensity={0.18} />
      <pointLight position={[8, 8, 8]} intensity={0.4} color="#00FFCC" />
      <pointLight position={[-6, -4, 6]} intensity={0.28} color="#7F5AF0" />

      <SceneContext.Provider value={{ cursorTarget, isInputFocused }}>
        <group ref={groupRef}>
          {/* Hero shield core */}
          {!isExtension && <TacticalShieldCore />}

          {/* Scanning ring hugging the shield – gives depth, not randomness */}
          {!isExtension && <ScanningRing />}
        </group>
      </SceneContext.Provider>

      {/* Ground grid – softer, no giant cone, no random shapes */}
      <gridHelper
        args={[40, 50, 'rgba(0,255,204,0.04)', 'rgba(26,26,46,0.03)']}
        position={[0, -2, 0]}
      />
    </>
  );
}

// --------- Wrapper used by Login / Register ---------

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
    const isPopup = window.innerWidth < 600 || window.innerHeight < 600;
    setIsExtension(isPopup);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);

    return () => {
      mq.removeEventListener('change', onChange);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isExtension) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
      setCursorTarget((prev) => ({
        x: prev.x + (x - prev.x) * 0.1,
        y: prev.y + (y - prev.y) * 0.1,
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion, isExtension]);

  // Hook into global input-focus / input-blur events from auth forms
  useEffect(() => {
    if (!onInputFocusChange) return;

    const handleFocus = () => {
      setIsInputFocused(true);
      onInputFocusChange(true);
    };
    const handleBlur = () => {
      setIsInputFocused(false);
      onInputFocusChange(false);
    };

    window.addEventListener('input-focus', handleFocus as any);
    window.addEventListener('input-blur', handleBlur as any);

    return () => {
      window.removeEventListener('input-focus', handleFocus as any);
      window.removeEventListener('input-blur', handleBlur as any);
    };
  }, [onInputFocusChange]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-cyber-steel">
      {/* Three.js canvas for full-page view */}
      {!isExtension && (
        <Canvas
          camera={{ position: [0, 2, 8], fov: 50 }}
          gl={{
            antialias: false,
            powerPreference: 'low-power',
            alpha: false,
          }}
          frameloop={document.hidden ? 'never' : 'always'}
          className="absolute inset-0"
        >
          <CyberScene
            mouseX={mousePos.x}
            mouseY={mousePos.y}
            isExtension={isExtension}
            cursorTarget={cursorTarget}
            isInputFocused={isInputFocused}
          />
        </Canvas>
      )}

      {/* Simple gradient fallback for extension popup */}
      {isExtension && (
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-steel via-slate-900 to-cyber-steel">
          <div className="absolute inset-0 opacity-20 bg-cyber-grid" />
        </div>
      )}

      {/* Lightweight HUD overlay – reused from your previous version */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35">
        <path
          d="M 20 20 L 20 60 M 20 20 L 60 20"
          stroke="#00ffcc"
          strokeWidth="2"
          fill="none"
          className="animate-pulse-slow"
        />
        <path
          d="M 20 calc(100% - 20) L 20 calc(100% - 60) M 20 calc(100% - 20) L 60 calc(100% - 20)"
          stroke="#bc13fe"
          strokeWidth="2"
          fill="none"
          className="animate-pulse-slow"
        />
      </svg>

      {/* Vertical data glyph columns – still there, but low opacity so they don’t fight the shield */}
      <div className="absolute inset-0 flex justify-around items-start pointer-events-none overflow-hidden opacity-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col space-y-1 text-[8px] font-mono text-cyan-400 animate-scroll-up"
            style={{ animationDelay: `${i * 0.25}s` }}
          >
            {Array.from({ length: 40 }).map((__, j) => (
              <span key={j}>
                {Math.random().toString(16).substring(2, 8)}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
}
