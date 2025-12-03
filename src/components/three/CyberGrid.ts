import * as THREE from 'three';

export class CyberGrid {
  public mesh: THREE.Group;
  private grid1: THREE.GridHelper;
  private grid2: THREE.GridHelper;

  constructor() {
    this.mesh = new THREE.Group();
    
    // Primary Grid (Floor)
    this.grid1 = new THREE.GridHelper(100, 50, 0x00f3ff, 0x0a1f30);
    this.grid1.position.y = -2;
    
    // Ceiling Grid (Mirror effect)
    this.grid2 = new THREE.GridHelper(100, 50, 0xbc13fe, 0x0a1f30);
    this.grid2.position.y = 8;
    this.grid2.rotation.x = Math.PI; // Flip it

    this.mesh.add(this.grid1);
    this.mesh.add(this.grid2);
  }

  animate(time: number) {
    // Move grids to create forward motion sensation
    const speed = 0.5;
    const zPos = (time * speed) % 2; 
    this.grid1.position.z = zPos;
    this.grid2.position.z = zPos;
    
    // Subtle breathing
    this.mesh.rotation.z = Math.sin(time * 0.1) * 0.02;
  }
}