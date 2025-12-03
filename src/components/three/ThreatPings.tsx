import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ThreatPingsProps {
  count?: number;
  lowPowerMode?: boolean;
}

export function ThreatPings({ count = 30, lowPowerMode = false }: ThreatPingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pulseRingsRef = useRef<Array<{ position: THREE.Vector3; time: number; active: boolean }>>([]);
  
  const actualCount = lowPowerMode ? Math.floor(count / 2) : count;
  
  // Generate random positions for threat nodes
  const positions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < actualCount; i++) {
      const radius = 5 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI / 2;
      
      pos.push(new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta) - 3,
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      ));
    }
    return pos;
  }, [actualCount]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const tempMatrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();
    
    positions.forEach((pos, i) => {
      // Calculate distance from radar center
      const distance = pos.distanceTo(new THREE.Vector3(-3, 0, 0));
      
      // Animate position slightly
      const offset = Math.sin(state.clock.elapsedTime + i) * 0.1;
      const newPos = pos.clone();
      newPos.y += offset;
      
      // Scale pulse
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.2;
      tempMatrix.makeScale(pulse, pulse, pulse);
      tempMatrix.setPosition(newPos);
      
      meshRef.current!.setMatrixAt(i, tempMatrix);
      
      // Color based on distance
      if (distance < 2.5) {
        tempColor.setHex(0xff0033); // Close = red
        
        // Trigger pulse ring
        if (Math.random() < 0.02 && !pulseRingsRef.current[i]?.active) {
          pulseRingsRef.current[i] = { position: newPos, time: state.clock.elapsedTime, active: true };
        }
      } else if (distance < 5) {
        tempColor.setHex(0xff9900); // Medium = orange
      } else {
        tempColor.setHex(0xffff00); // Far = yellow
      }
      
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    
    // Clean up old pulse rings
    pulseRingsRef.current = pulseRingsRef.current.filter(ring => {
      if (ring && ring.active) {
        const age = state.clock.elapsedTime - ring.time;
        if (age > 2) {
          ring.active = false;
          return false;
        }
      }
      return true;
    });
  });
  
  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, actualCount]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      
      {/* Pulse rings */}
      {pulseRingsRef.current.map((ring, i) => 
        ring && ring.active && <PulseRing key={i} position={ring.position} startTime={ring.time} />
      )}
    </>
  );
}

function PulseRing({ position, startTime }: { position: THREE.Vector3; startTime: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const age = state.clock.elapsedTime - startTime;
    const progress = age / 2; // 2 second duration
    
    const scale = 1 + progress * 3;
    meshRef.current.scale.set(scale, scale, scale);
    
    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.opacity = Math.max(0, 0.6 * (1 - progress));
    }
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[0.3, 0.02, 8, 32]} />
      <meshBasicMaterial
        color="#ff0033"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
