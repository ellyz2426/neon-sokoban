// Particle system for visual effects

import {
  Group,
  Mesh,
  SphereGeometry,
  BoxGeometry,
  MeshBasicMaterial,
  Color,
  Vector3,
  AdditiveBlending,
} from '@iwsdk/core';

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
  rotSpeed: number;
}

export class ParticleSystem {
  private group: Group;
  private particles: Particle[] = [];
  private pool: Mesh[] = [];
  private sphereGeo: SphereGeometry;
  private boxGeo: BoxGeometry;

  constructor(parent: Group) {
    this.group = new Group();
    parent.add(this.group);
    this.sphereGeo = new SphereGeometry(0.008, 4, 4);
    this.boxGeo = new BoxGeometry(0.01, 0.01, 0.01);
  }

  // Burst of particles when box lands on target
  emitBoxOnTarget(x: number, y: number, z: number, color: Color): void {
    for (let i = 0; i < 12; i++) {
      this.spawn(x, y, z, color, 'sphere', 0.8);
    }
  }

  // Celebration burst when level completes
  emitCelebration(x: number, y: number, z: number, colors: Color[]): void {
    for (let i = 0; i < 30; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.spawn(x, y, z, c, Math.random() > 0.5 ? 'sphere' : 'box', 1.5);
    }
  }

  // Trail particle behind player
  emitTrail(x: number, y: number, z: number, color: Color): void {
    this.spawn(x, y + 0.01, z, color, 'sphere', 0.4, 0.03);
  }

  private spawn(
    x: number, y: number, z: number,
    color: Color, shape: 'sphere' | 'box',
    maxLife: number, speed = 0.1
  ): void {
    const mat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new Mesh(shape === 'sphere' ? this.sphereGeo : this.boxGeo, mat);
    mesh.position.set(x, y, z);

    const angle = Math.random() * Math.PI * 2;
    const upSpeed = 0.05 + Math.random() * 0.1;
    const vel = new Vector3(
      Math.cos(angle) * speed * (0.5 + Math.random()),
      upSpeed,
      Math.sin(angle) * speed * (0.5 + Math.random()),
    );

    this.group.add(mesh);
    this.particles.push({
      mesh,
      velocity: vel,
      life: maxLife,
      maxLife,
      rotSpeed: (Math.random() - 0.5) * 5,
    });
  }

  update(delta: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        toRemove.push(i);
        continue;
      }

      // Update position
      p.mesh.position.x += p.velocity.x * delta;
      p.mesh.position.y += p.velocity.y * delta;
      p.mesh.position.z += p.velocity.z * delta;

      // Gravity
      p.velocity.y -= 0.15 * delta;

      // Fade out
      const t = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = t;

      // Scale down
      const s = 0.5 + t * 0.5;
      p.mesh.scale.setScalar(s);

      // Rotate
      p.mesh.rotation.y += p.rotSpeed * delta;
    }

    // Remove dead particles
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.particles[idx];
      this.group.remove(p.mesh);
      (p.mesh.material as MeshBasicMaterial).dispose();
      this.particles.splice(idx, 1);
    }
  }

  clear(): void {
    for (const p of this.particles) {
      this.group.remove(p.mesh);
      (p.mesh.material as MeshBasicMaterial).dispose();
    }
    this.particles = [];
  }
}
