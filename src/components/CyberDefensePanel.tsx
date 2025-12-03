import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
// import { EffectComposer, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ThreeRadar } from './three/ThreeRadar';
import { ThreatPings } from './three/ThreatPings';

// Lerp utility for smooth animations
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

// Context for sharing scene state
interface SceneContextType {
  cursorTarget: { x: number; y: number };
  isInputFocused: boolean;
  threatPulses: Array<{ id: number; time: number; position: THREE.Vector3 }>;
}

const SceneContext = createContext<SceneContextType>({
  cursorTarget: { x: 0, y: 0 },
  isInputFocused: false,
  threatPulses: []
});

// Large SecureShield OS Hologram (Left Side)
function SecureShieldHologram() {
  const groupRef = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const arcRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Rotate the entire hologram
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    
    // Pulse shield
    if (shieldRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
      shieldRef.current.scale.set(pulse, pulse, pulse);
    }
    
    // Animate scanning arcs
    arcRefs.current.forEach((arc, i) => {
      if (arc) {
        arc.rotation.z = state.clock.elapsedTime * (0.5 + i * 0.2);
      }
    });
  });

  return (
    <group ref={groupRef} position={[-3, 0, 0]}>
      {/* Central Shield Geometry */}
      <mesh ref={shieldRef}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color="#00E8FF"
          emissive="#00E8FF"
          emissiveIntensity={1.5}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* Scanning Arcs */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) arcRefs.current[i] = el; }}
          position={[0, 0, i * 0.1]}
        >
          <torusGeometry args={[1.8 + i * 0.3, 0.02, 16, 64, Math.PI]} />
          <meshStandardMaterial
            color="#7F5AF0"
            emissive="#7F5AF0"
            emissiveIntensity={1.2}
            transparent
            opacity={0.6 - i * 0.1}
          />
        </mesh>
      ))}
      
      {/* Floating Code Glyphs */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 2.5;
        return (
          <mesh
            key={`glyph-${i}`}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle) * radius * 0.5,
              Math.sin(angle * 2) * 0.5
            ]}
          >
            <boxGeometry args={[0.1, 0.1, 0.02]} />
            <meshStandardMaterial
              color="#00ffcc"
              emissive="#00ffcc"
              emissiveIntensity={0.8}
              transparent
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Volumetric Light Cone pointing toward auth card
function VolumetricLight() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = 0.4 + Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    if (!Array.isArray(meshRef.current.material)) {
      meshRef.current.material.opacity = pulse;
    }
  });

  return (
    <>
      {/* Spotlight effect */}
      <spotLight
        position={[-3, 2, 2]}
        angle={0.6}
        penumbra={0.5}
        intensity={1.5}
        color="#00E8FF"
        target-position={[2, 0, 0]}
      />
      
      {/* Cone mesh for volumetric effect */}
      <mesh ref={meshRef} position={[-2, 0, 1]} rotation={[0, Math.PI / 6, 0]}>
        <coneGeometry args={[2, 6, 32, 1, true]} />
        <meshBasicMaterial
          color="#00E8FF"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// Threat Pulse Ring Component
function ThreatPulseRing({ position, startTime }: { position: THREE.Vector3; startTime: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const elapsed = state.clock.elapsedTime - startTime;
    const scale = 0.2 + elapsed * 1.5;
    const opacity = Math.max(0, 1 - elapsed * 0.5);
    
    meshRef.current.scale.set(scale, scale, 0.1);
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = opacity;
    
    // Remove after fade
    if (opacity <= 0) {
      meshRef.current.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[1, 0.08, 8, 32]} />
      <meshStandardMaterial
        color="#ff0055"
        emissive="#ff0055"
        emissiveIntensity={2}
        transparent
        opacity={1}
        toneMapped={false}
      />
    </mesh>
  );
}

// Threat radar nodes with dynamic count and pulse emission
// Replaced by ThreeRadar and ThreatPings components
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ThreatRadar({ count = 8 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [nodes] = useState(() => {
    // Dynamic count for performance scaling
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      radius: 2 + Math.random() * 3,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));
  });

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = state.clock.elapsedTime * 0.1;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {nodes.map((node, i) => (
        <ThreatNode key={i} {...node} index={i} />
      ))}
    </group>
  );
}

function ThreatNode({ angle, radius, speed, phase, index }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastPulseTime = useRef(0);
  const [pulses, setPulses] = useState<Array<{ id: number; time: number; position: THREE.Vector3 }>>(() => [])

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    const r = radius + Math.sin(t) * 0.5;
    meshRef.current.position.x = Math.cos(angle + t * 0.2) * r;
    meshRef.current.position.y = Math.sin(angle + t * 0.2) * r;
    
    // Random pulse emission (every 3-8 seconds per node)
    const pulseInterval = 3 + index * 0.7;
    if (state.clock.elapsedTime - lastPulseTime.current > pulseInterval) {
      lastPulseTime.current = state.clock.elapsedTime;
      const pos = meshRef.current.position.clone();
      setPulses((prev: any[]) => [...prev.slice(-2), { id: Date.now(), time: state.clock.elapsedTime, position: pos }]);
    }
    meshRef.current.position.z = Math.sin(t * 2) * 0.3;
    
    // Pulse scale
    const scale = 0.08 + Math.sin(t * 3) * 0.02;
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#ff0055"
          emissive="#ff0055"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      {pulses.map((pulse: any) => (
        <ThreatPulseRing key={pulse.id} position={pulse.position} startTime={pulse.time} />
      ))}
    </>
  );
}

// Scanning Ring with cursor tracking and input focus response
function ScanningRing() {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetRotation = useRef({ x: 0, y: 0 });
  const { cursorTarget, isInputFocused } = useContext(SceneContext);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Cursor tracking with eased motion (lerp)
    targetRotation.current.y = cursorTarget.x * 0.5;
    targetRotation.current.x = -cursorTarget.y * 0.3;
    
    meshRef.current.rotation.y = lerp(meshRef.current.rotation.y, targetRotation.current.y, 0.05);
    meshRef.current.rotation.x = lerp(meshRef.current.rotation.x, targetRotation.current.x, 0.05);
    meshRef.current.rotation.z += 0.005;
    
    // Soft pulse every ~2 seconds (0.8-1.0 scale)
    const pulseBase = 0.9 + Math.sin(state.clock.elapsedTime * Math.PI) * 0.1;
    
    // Scale up when inputs focused (scan target)
    const focusScale = isInputFocused ? 1.15 : 1.0;
    const finalScale = pulseBase * focusScale;
    
    meshRef.current.scale.set(finalScale, finalScale, finalScale);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <torusGeometry args={[1.5, 0.12, 16, 64]} />
      <meshStandardMaterial
        color="#00ffcc"
        emissive="#00ffcc"
        emissiveIntensity={1.2}
        toneMapped={false}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// Floating data blocks with dynamic count
function DataBlocks({ count = 20 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [blocks] = useState(() => {
    // Dynamic particle count for performance scaling
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 5,
      speed: 0.5 + Math.random() * 1,
    }));
  });

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const block = blocks[i];
      child.position.y += 0.01 * block.speed;
      if (child.position.y > 4) {
        child.position.y = -4;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {blocks.map((block, i) => (
        <mesh key={i} position={[block.x, block.y, block.z]}>
          <boxGeometry args={[0.05, 0.2, 0.05]} />
          <meshStandardMaterial
            color="#6366f1"
            emissive="#6366f1"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

// Main 3D Scene with advanced camera parallax and cinematic fog
function CyberScene({ 
  mouseX = 0, 
  mouseY = 0, 
  lowPowerMode = false,
  isExtension = false,
  cursorTarget,
  isInputFocused
}: { 
  mouseX?: number; 
  mouseY?: number;
  lowPowerMode?: boolean;
  isExtension?: boolean;
  cursorTarget: { x: number; y: number };
  isInputFocused: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const targetRotation = useRef({ x: 0, y: 0 });
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useFrame(() => {
    // Advanced camera parallax (max 1-1.5 degrees) with smooth easing
    if (!prefersReducedMotion.current && groupRef.current) {
      targetRotation.current.y = mouseX * 0.026; // ~1.5 degrees
      targetRotation.current.x = -mouseY * 0.020; // ~1.15 degrees
      
      groupRef.current.rotation.y = lerp(groupRef.current.rotation.y, targetRotation.current.y, 0.08);
      groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, targetRotation.current.x, 0.08);
    }
    
    // Subtle camera sway
    if (!prefersReducedMotion.current) {
      camera.position.x = Math.sin(Date.now() * 0.0001) * 0.1;
      camera.position.y = Math.cos(Date.now() * 0.00012) * 0.08;
    }
  });

  return (
    <>
      <color attach="background" args={['#070b15']} />
      {/* Cinematic depth fog with smoother falloff */}
      <fog attach="fog" args={['#070b15', 4, 18]} />
      
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#00ffcc" />
      <pointLight position={[-10, -10, 5]} intensity={0.25} color="#ff0055" />
      
      <SceneContext.Provider value={{ cursorTarget, isInputFocused, threatPulses: [] }}>
        <group ref={groupRef}>
          {/* New Holographic Radar Dome System */}
          {!isExtension && <ThreeRadar intensity={isInputFocused ? 1.3 : 1} error={false} />}
          
          {/* Threat Pings with instanced meshes */}
          <ThreatPings count={lowPowerMode ? 15 : 30} lowPowerMode={lowPowerMode} />
          
          {/* Keep scanning ring for additional effect */}
          <ScanningRing />
          <DataBlocks count={lowPowerMode ? 10 : (isExtension ? 8 : 20)} />
          
          {/* Large SecureShield Hologram on left - hidden in extension */}
          {!isExtension && <SecureShieldHologram />}
          
          {/* Volumetric light pointing to auth card */}
          {!isExtension && <VolumetricLight />}
        </group>
      </SceneContext.Provider>
      
      {/* Depth of Field post-processing - temporarily disabled due to Three.js compatibility */}
      {/* {!isExtension && (
        <EffectComposer>
          <DepthOfField
            focusDistance={0.02}
            focalLength={0.05}
            bokehScale={2}
            height={480}
          />
        </EffectComposer>
      )} */}
      
      {/* Ultra-soft grid with no visible seam - unified across scene */}
      <gridHelper 
        args={[40, 50, 'rgba(0,255,204,0.02)', 'rgba(26,26,46,0.02)']} 
        position={[0, -2, 0]} 
      />
    </>
  );
}

export function CyberDefensePanel({ fullWidth: _fullWidth = false, onInputFocusChange }: { fullWidth?: boolean; onInputFocusChange?: (focused: boolean) => void }) {
  const [isExtension, setIsExtension] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorTarget, setCursorTarget] = useState({ x: 0, y: 0 });
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [lowPowerMode, setLowPowerMode] = useState(false);

  useEffect(() => {
    // Detect if running in extension popup
    const isPopup = window.innerWidth < 600 || window.innerHeight < 600;
    setIsExtension(isPopup);
    
    // Enable low power mode for extension popups or when DevTools is open
    setLowPowerMode(isPopup || (window.outerWidth - window.innerWidth > 160));
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    // Monitor visibility for performance
    const handleVisibilityChange = () => {
      setLowPowerMode(document.hidden || isPopup);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isExtension) return;

    // Advanced mouse tracking for parallax and cursor interactions
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
      
      // Smooth cursor target for ring tracking
      setCursorTarget(prev => ({
        x: prev.x + (x - prev.x) * 0.1,
        y: prev.y + (y - prev.y) * 0.1
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion, isExtension]);
  
  // Listen for input focus changes from parent
  useEffect(() => {
    if (onInputFocusChange) {
      const handleFocus = () => setIsInputFocused(true);
      const handleBlur = () => setIsInputFocused(false);
      
      window.addEventListener('input-focus', handleFocus as any);
      window.addEventListener('input-blur', handleBlur as any);
      
      return () => {
        window.removeEventListener('input-focus', handleFocus as any);
        window.removeEventListener('input-blur', handleBlur as any);
      };
    }
  }, [onInputFocusChange]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-cyber-steel">
      {/* Three.js Canvas with performance controls */}
      {!isExtension && (
        <Canvas
          camera={{ position: [0, 2, 8], fov: 50 }}
          gl={{ 
            antialias: false, 
            powerPreference: 'low-power',
            alpha: false
          }}
          frameloop={document.hidden ? 'never' : 'always'}
          className="absolute inset-0"
        >
          <CyberScene 
            mouseX={mousePos.x} 
            mouseY={mousePos.y} 
            lowPowerMode={lowPowerMode}
            isExtension={isExtension}
            cursorTarget={cursorTarget}
            isInputFocused={isInputFocused}
          />
        </Canvas>
      )}

      {/* Fallback CSS Grid + SVG for extension popup */}
      {isExtension && (
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-steel via-slate-900 to-cyber-steel">
          <div className="absolute inset-0 opacity-20 bg-cyber-grid" />
        </div>
      )}

      {/* SVG HUD Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        {/* Corner brackets */}
        <path
          d="M 20 20 L 20 60 M 20 20 L 60 20"
          stroke="#00ffcc"
          strokeWidth="2"
          fill="none"
          className="animate-pulse-slow"
        />
        <path
          d="M calc(100% - 20) 20 L calc(100% - 60) 20 M calc(100% - 20) 20 L calc(100% - 20) 60"
          stroke="#ff0055"
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
        <path
          d="M calc(100% - 20) calc(100% - 20) L calc(100% - 60) calc(100% - 20) M calc(100% - 20) calc(100% - 20) L calc(100% - 20) calc(100% - 60)"
          stroke="#fbbf24"
          strokeWidth="2"
          fill="none"
          className="animate-pulse-slow"
        />

        {/* Scan lines */}
        <line
          x1="0"
          y1="33%"
          x2="100%"
          y2="33%"
          stroke="#00ffcc"
          strokeWidth="1"
          opacity="0.1"
          className="animate-scan-horizontal"
        />
        <line
          x1="0"
          y1="66%"
          x2="100%"
          y2="66%"
          stroke="#ff0055"
          strokeWidth="1"
          opacity="0.1"
          className="animate-scan-horizontal"
          style={{ animationDelay: '2s' }}
        />
      </svg>

      {/* Data columns overlay */}
      <div className="absolute inset-0 flex justify-around items-start pointer-events-none overflow-hidden opacity-10">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col space-y-1 text-[8px] font-mono text-cyan-400 animate-scroll-up"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {[...Array(40)].map((_, j) => (
              <span key={j}>{Math.random().toString(16).substring(2, 8)}</span>
            ))}
          </div>
        ))}
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60 pointer-events-none" />
    </div>
  );
}
