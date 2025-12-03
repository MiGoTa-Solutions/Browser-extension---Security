import * as THREE from 'three';

export class QuantumLock {
  public mesh: THREE.Group;
  private core: THREE.Mesh;
  private rings: THREE.Mesh[] = [];
  private particles: THREE.Points;
  private glowMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.mesh = new THREE.Group();

    // Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.2,
    });

    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    // 1. Central Core (Icosahedron)
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), metalMat);
    this.mesh.add(this.core);

    // 2. Rotating Rings
    const ringGeos = [
      new THREE.TorusGeometry(1.4, 0.05, 16, 100),
      new THREE.TorusGeometry(1.8, 0.08, 16, 100),
      new THREE.TorusGeometry(2.3, 0.02, 16, 100) // Thin outer scan ring
    ];

    ringGeos.forEach((geo, i) => {
      const ring = new THREE.Mesh(geo, i === 2 ? this.glowMaterial : metalMat);
      // Random initial rotation
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      this.rings.push(ring);
      this.mesh.add(ring);
    });

    // 3. Particle Field (Data bits)
    const particleGeo = new THREE.BufferGeometry();
    const count = 100;
    const posArray = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) {
      posArray[i] = (Math.random() - 0.5) * 10; 
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(particleGeo, partMat);
    this.mesh.add(this.particles);
  }

  // Interactive States
  public setFocus(isFocused: boolean) {
    if (isFocused) {
      this.glowMaterial.color.setHex(0xbc13fe); // Purple on focus
      this.core.scale.setScalar(1.1);
    } else {
      this.glowMaterial.color.setHex(0x00f3ff); // Blue default
      this.core.scale.setScalar(1.0);
    }
  }

  public setError() {
    this.glowMaterial.color.setHex(0xff003c); // Red error
    this.core.material = new THREE.MeshStandardMaterial({ 
        color: 0xff003c, emissive: 0xff003c, emissiveIntensity: 0.5 
    });
    setTimeout(() => {
        // Reset after delay
        this.setFocus(false);
        // Re-init material (simplified for this example)
    }, 1000);
  }

  public setSuccess() {
      this.glowMaterial.color.setHex(0x0aff0a); // Green success
      // Expansion animation handled in animate loop or controller
  }

  animate(time: number, speedMultiplier: number = 1) {
    // Rotate Core
    this.core.rotation.y += 0.01 * speedMultiplier;
    this.core.rotation.z += 0.005 * speedMultiplier;

    // Rotate Rings (Gyroscopic effect)
    this.rings.forEach((ring, i) => {
      const speed = (i + 1) * 0.005 * (i % 2 === 0 ? 1 : -1) * speedMultiplier;
      ring.rotation.x += speed;
      ring.rotation.y += speed * 0.5;
    });

    // Particles drift
    this.particles.rotation.y = time * 0.05;
  }
}