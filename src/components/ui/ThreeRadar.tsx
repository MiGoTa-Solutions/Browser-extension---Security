import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeRadar() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const width = mountRef.current.clientWidth;
    const height = 300; // Fixed height for the radar panel
    
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Radar Circles
    const geometry = new THREE.RingGeometry(1, 1.02, 64);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x3b82f6, 
      transparent: true, 
      opacity: 0.3, 
      side: THREE.DoubleSide 
    });
    
    const ring1 = new THREE.Mesh(geometry, material);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.52, 64), material);
    const ring3 = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.52, 64), material);
    
    scene.add(ring1);
    scene.add(ring2);
    scene.add(ring3);

    // Scanning Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.5, 0, 0)
    ]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
    const scanLine = new THREE.Line(lineGeo, lineMat);
    scene.add(scanLine);

    camera.position.z = 3.5;
    camera.position.y = -1;
    camera.rotation.x = 0.4;

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rotate scan line
      scanLine.rotation.z -= 0.05;

      // Pulse rings
      const scale = 1 + Math.sin(Date.now() * 0.002) * 0.05;
      ring1.scale.set(scale, scale, 1);
      
      // Subtle camera movement
      camera.position.x = Math.sin(Date.now() * 0.001) * 0.2;
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if(mountRef.current) {
        const w = mountRef.current.clientWidth;
        renderer.setSize(w, height);
        camera.aspect = w / height;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if(mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div ref={mountRef} className="w-full h-[300px] rounded-xl overflow-hidden relative">
      <div className="absolute top-2 left-4 text-xs text-blue-400 font-mono z-10">
        SYSTEM_STATUS: SCANNING...
      </div>
      {/* Overlay gradient for aesthetics */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-50 pointer-events-none" />
    </div>
  );
}