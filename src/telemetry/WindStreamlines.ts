import * as THREE from 'three';

/**
 * Animated wind tunnel streamlines flowing over the wings.
 * Visualizes laminar flow vs turbulent flow separation during stalls.
 */
export class WindStreamlines extends THREE.Group {
  public enabled = true;
  private particleCount = 180;
  private positions: Float32Array;
  private colors: Float32Array;
  private seeds: Float32Array;
  private points: THREE.Points;

  constructor() {
    super();
    this.name = 'WindStreamlines';

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.seeds = new Float32Array(this.particleCount);

    // Initialize particle offsets and random seeds
    for (let i = 0; i < this.particleCount; i++) {
      this.seeds[i] = Math.random();
      this.resetParticle(i, 0, 0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.016,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.add(this.points);
  }

  private resetParticle(index: number, wingHalfSpan: number, aoa: number) {
    const idx = index * 3;
    // Spread along wingspan
    const spanOffset = (Math.random() - 0.5) * Math.max(0.24, wingHalfSpan * 2);
    // Start slightly ahead of nose in local coords
    const localZ = 0.22 + Math.random() * 0.08;
    const localY = (Math.random() - 0.5) * 0.03;

    this.positions[idx] = spanOffset;
    this.positions[idx + 1] = localY;
    this.positions[idx + 2] = localZ;

    // Color: cyan for laminar flow, orange/red for stall
    const isStalled = Math.abs(aoa) > 0.28;
    if (isStalled) {
      this.colors[idx] = 1.0;
      this.colors[idx + 1] = 0.35 + Math.random() * 0.2;
      this.colors[idx + 2] = 0.1;
    } else {
      this.colors[idx] = 0.2 + Math.random() * 0.2;
      this.colors[idx + 1] = 0.8 + Math.random() * 0.2;
      this.colors[idx + 2] = 1.0;
    }
  }

  update(
    planePos: THREE.Vector3,
    planeQuat: THREE.Quaternion,
    airspeed: number,
    aoaRad: number,
    wingspan: number
  ) {
    if (!this.enabled || airspeed < 0.2) {
      this.visible = false;
      return;
    }
    this.visible = true;

    this.position.copy(planePos);
    this.quaternion.copy(planeQuat);

    const isStalled = Math.abs(aoaRad) > 0.28;
    const flowSpeed = Math.min(0.045, 0.015 + airspeed * 0.0035);

    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.points.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      // Stream airflow backward over wing chord (-Z in plane local coordinates)
      this.positions[idx + 2] -= flowSpeed;

      // Vertical flow behavior: laminar hugs wing, stall separates upward
      if (isStalled) {
        // Turbulent flutter and vortex shedding
        const flutter = Math.sin(performance.now() * 0.02 + this.seeds[i] * 10) * 0.008;
        this.positions[idx + 1] += 0.003 + flutter;
        this.positions[idx] += flutter * 0.5;

        this.colors[idx] = 1.0;
        this.colors[idx + 1] = 0.35;
        this.colors[idx + 2] = 0.1;
      } else {
        // Smooth streamlined flow
        this.positions[idx + 1] *= 0.98;
        this.colors[idx] = 0.25;
        this.colors[idx + 1] = 0.85;
        this.colors[idx + 2] = 1.0;
      }

      // Recycle particles once they pass the trailing edge
      if (this.positions[idx + 2] < -0.35) {
        this.resetParticle(i, wingspan * 0.5, aoaRad);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
