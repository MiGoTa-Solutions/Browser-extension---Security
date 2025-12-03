import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface SceneFeatureFlags {
  enableParallax: boolean;
  enableDOF: boolean;
  particleCount: number;
  lowPowerMode: boolean;
}

export interface SceneInteraction {
  intensity: number;
  error: boolean;
  buttonHover: boolean;
}

export function useCyberScene(containerRef: React.RefObject<HTMLDivElement>) {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number;
  } | null>(null);
  
  const [featureFlags, setFeatureFlags] = useState<SceneFeatureFlags>({
    enableParallax: true,
    enableDOF: false,
    particleCount: 30,
    lowPowerMode: false
  });
  
  const [interaction, setInteraction] = useState<SceneInteraction>({
    intensity: 1,
    error: false,
    buttonHover: false
  });
  
  const mousePosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });
  const isPaused = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Detect low-power mode
    const isExtension = window.innerWidth < 600 || window.location.pathname.includes('lock.html');
    const isTabHidden = document.hidden;
    const initialLowPower = isExtension || isTabHidden;
    
    setFeatureFlags(prev => ({
      ...prev,
      enableParallax: window.innerWidth >= 768 && !initialLowPower,
      enableDOF: !isExtension,
      particleCount: initialLowPower ? 15 : 30,
      lowPowerMode: initialLowPower
    }));

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a14, 0.02);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power', // Extension-friendly
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00f3ff, 2, 50);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xbc13fe, 2, 50);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Cyber Grid Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f3ff, 0x001a1f);
    gridHelper.position.y = -5;
    scene.add(gridHelper);

    // Security Polyhedrons
    const polyhedrons: THREE.Mesh[] = [];
    const polyGeo = new THREE.IcosahedronGeometry(1.5, 0);
    const polyMat = new THREE.MeshPhongMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < 5; i++) {
      const poly = new THREE.Mesh(polyGeo, polyMat.clone());
      poly.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 30
      );
      poly.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      polyhedrons.push(poly);
      scene.add(poly);
    }

    // Floating Data Blocks
    const dataBlocks: THREE.Mesh[] = [];
    const blockGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const blockMat = new THREE.MeshPhongMaterial({
      color: 0xbc13fe,
      emissive: 0xbc13fe,
      emissiveIntensity: 0.5,
    });

    for (let i = 0; i < 20; i++) {
      const block = new THREE.Mesh(blockGeo, blockMat.clone());
      block.position.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 50
      );
      dataBlocks.push(block);
      scene.add(block);
    }

    // Scan Lines
    const scanLineGeo = new THREE.PlaneGeometry(100, 0.1);
    const scanLineMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const scanLine = new THREE.Mesh(scanLineGeo, scanLineMat);
    scanLine.rotation.x = Math.PI / 2;
    scene.add(scanLine);

    // Mouse parallax handler
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768 || !featureFlags.enableParallax) return;
      
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      mousePosition.current = { x, y };
      targetRotation.current = {
        x: y * 0.021, // Max 1.2 degrees
        y: x * 0.021
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    // Tab visibility handler
    const handleVisibilityChange = () => {
      isPaused.current = document.hidden;
      setFeatureFlags(prev => ({
        ...prev,
        lowPowerMode: document.hidden
      }));
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Animation Loop
    const clock = new THREE.Clock();
    let animationId: number = 0;

    const animate = () => {
      if (isPaused.current) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      
      animationId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      
      // Smooth parallax camera rotation
      if (featureFlags.enableParallax) {
        currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.05;
        currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.05;
        
        camera.rotation.x = currentRotation.current.x;
        camera.rotation.y = currentRotation.current.y;
      }

      // Rotate polyhedrons
      polyhedrons.forEach((poly, i) => {
        poly.rotation.x += 0.005 * (i % 2 === 0 ? 1 : -1);
        poly.rotation.y += 0.003 * (i % 2 === 0 ? 1 : -1);
        poly.position.y += Math.sin(elapsedTime + i) * 0.01;
      });

      // Float data blocks
      dataBlocks.forEach((block, i) => {
        block.position.y += Math.sin(elapsedTime * 0.5 + i) * 0.02;
        block.rotation.x += 0.01;
        block.rotation.z += 0.01;
      });

      // Move scan line
      scanLine.position.y = Math.sin(elapsedTime * 0.5) * 10;

      // Move grid
      gridHelper.position.z = (elapsedTime * 2) % 2;

      // Orbit lights
      pointLight1.position.x = Math.sin(elapsedTime * 0.5) * 15;
      pointLight1.position.z = Math.cos(elapsedTime * 0.5) * 15;

      renderer.render(scene, camera);
    };
    animate();

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    sceneRef.current = { scene, camera, renderer, animationId };

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      scene.clear();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [containerRef, featureFlags.enableParallax]);

  return { sceneRef, featureFlags, interaction, setInteraction };
}
