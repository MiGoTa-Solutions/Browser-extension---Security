import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ThreeRadarProps {
  intensity?: number;
  error?: boolean;
}

export function ThreeRadar({ intensity = 1, error = false }: ThreeRadarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Rotate sweep line
    if (sweepRef.current) {
      sweepRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
    
    // Pulse glow based on intensity
    if (glowRef.current && glowRef.current.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.material.opacity = pulse * intensity;
      
      // Error state - red pulse
      if (error) {
        glowRef.current.material.color.setHex(0xff0033);
        glowRef.current.material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      } else {
        glowRef.current.material.color.setHex(0x00ffcc);
      }
    }
  });

  return (
    <group ref={groupRef} position={[-3, 0, 0]}>
      {/* Spherical dome outline */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color="#00ffcc"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          wireframe
        />
      </mesh>
      
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.02, 16, 100]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.6} />
      </mesh>
      
      {/* Inner glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.3, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color="#00ffcc"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* Rotating sweep line */}
      <mesh ref={sweepRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 0.05]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Grid lines on base */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={`grid-${i}`}
            position={[Math.cos(angle) * 1.25, 0, Math.sin(angle) * 1.25]}
            rotation={[-Math.PI / 2, angle, 0]}
          >
            <planeGeometry args={[2.5, 0.01]} />
            <meshBasicMaterial
              color="#00ffcc"
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
      
      {/* Center pillar */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 16]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.4} />
      </mesh>
      
      {/* Top cap */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
