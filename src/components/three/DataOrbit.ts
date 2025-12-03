import * as THREE from 'three';

export class DataOrbit {
  public mesh: THREE.Group;
  private satellites: THREE.Mesh[] = [];

  constructor() {
    this.mesh = new THREE.Group();

    // Simple geometry placeholders for icons (Shield, Globe, etc.)
    // In a real prod build, we would load SVGs or Textures. 
    // Using geometric abstractions for "Data Objects".
    
    const shapes = [
      new THREE.OctahedronGeometry(0.3), // Shield-ish
      new THREE.SphereGeometry(0.2, 8, 8), // Globe
      new THREE.ConeGeometry(0.2, 0.4, 4), // Threat/Spike
      new THREE.TorusGeometry(0.2, 0.05, 8, 16), // Eye
      new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16) // Cookie
    ];

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    shapes.forEach((geo, i) => {
      const mesh = new THREE.Mesh(geo, material);
      // Position initially
      const angle = (i / shapes.length) * Math.PI * 2;
      const radius = 3.5;
      mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      
      this.satellites.push(mesh);
      this.mesh.add(mesh);
    });
  }

  animate(time: number) {
    // Orbit rotation
    this.mesh.rotation.y = time * 0.1;

    // Individual object tumbling
    this.satellites.forEach((sat, i) => {
      sat.rotation.x += 0.02;
      sat.rotation.z += 0.02;
      
      // Bobbing effect
      sat.position.y = Math.sin(time * 2 + i) * 0.2;
    });
  }
}