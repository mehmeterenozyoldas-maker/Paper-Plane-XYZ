import * as THREE from 'three';
import type { FlightSummary, FlightTrajectoryPoint } from '../types';

/**
 * 3D Flight Path Trajectory Ribbon and Landing Marker.
 * Displays the 3D flight trajectory and landing target with summary telemetry.
 */
export class FlightRibbon extends THREE.Group {
  private line: THREE.Line;
  private lineGeometry: THREE.BufferGeometry;
  private maxPoints = 600;
  private positions: Float32Array;
  private colors: Float32Array;
  private pointCount = 0;

  // Landing Marker Target
  private landingGroup: THREE.Group;
  private landingRing: THREE.Mesh;
  private landingPulse: THREE.Mesh;
  public enabled = true;

  constructor() {
    super();
    this.name = 'FlightRibbon';

    this.positions = new Float32Array(this.maxPoints * 3);
    this.colors = new Float32Array(this.maxPoints * 3);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.lineGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3)
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });

    this.line = new THREE.Line(this.lineGeometry, lineMaterial);
    this.add(this.line);

    // Landing Target Bullseye
    this.landingGroup = new THREE.Group();
    this.landingGroup.visible = false;

    const ringGeo = new THREE.RingGeometry(0.12, 0.16, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.landingRing = new THREE.Mesh(ringGeo, ringMat);
    this.landingRing.rotation.x = -Math.PI / 2;

    const pulseGeo = new THREE.RingGeometry(0.2, 0.22, 32);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    this.landingPulse = new THREE.Mesh(pulseGeo, pulseMat);
    this.landingPulse.rotation.x = -Math.PI / 2;

    this.landingGroup.add(this.landingRing, this.landingPulse);
    this.add(this.landingGroup);
  }

  clearRibbon(): this {
    this.pointCount = 0;
    this.lineGeometry.setDrawRange(0, 0);
    this.landingGroup.visible = false;
    return this;
  }

  addPoint(pos: THREE.Vector3, speed: number) {
    if (this.pointCount >= this.maxPoints) {
      // Shift left by 1 point to maintain rolling path
      this.positions.copyWithin(0, 3, this.maxPoints * 3);
      this.colors.copyWithin(0, 3, this.maxPoints * 3);
      this.pointCount = this.maxPoints - 1;
    }

    const idx = this.pointCount * 3;
    this.positions[idx] = pos.x;
    this.positions[idx + 1] = pos.y;
    this.positions[idx + 2] = pos.z;

    // Map speed to color gradient:
    // Speed > 6 m/s: Cyan
    // Speed 3-6 m/s: Emerald
    // Speed < 3 m/s: Amber/Magenta
    const speedRatio = Math.min(1.0, speed / 8.0);
    if (speedRatio > 0.5) {
      // Cyan to Emerald
      this.colors[idx] = 0.1;
      this.colors[idx + 1] = 0.7 + (speedRatio - 0.5) * 0.6;
      this.colors[idx + 2] = 0.95;
    } else {
      // Amber to Emerald
      this.colors[idx] = 1.0 - speedRatio * 1.6;
      this.colors[idx + 1] = 0.6 + speedRatio * 0.4;
      this.colors[idx + 2] = 0.2;
    }

    this.pointCount++;
    this.lineGeometry.setDrawRange(0, this.pointCount);
    (this.lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lineGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  showLandingMarker(landingPos: THREE.Vector3) {
    this.landingGroup.position.copy(landingPos);
    this.landingGroup.position.y = 0.025;
    this.landingGroup.visible = true;
  }

  updateLandingAnimation(time: number) {
    if (this.landingGroup.visible) {
      const scale = 1.0 + Math.sin(time * 3) * 0.15;
      this.landingPulse.scale.setScalar(scale);
    }
  }

  dispose() {
    this.lineGeometry.dispose();
    (this.line.material as THREE.Material).dispose();
    this.landingRing.geometry.dispose();
    this.landingPulse.geometry.dispose();
  }
}
