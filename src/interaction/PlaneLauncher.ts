import * as THREE from 'three';
import * as xb from 'xrblocks';
import type { AeroPhysics } from '../physics/AeroPhysics';
import { sounds } from '../sound/AudioEffects';

export interface ThrowEvent {
  velocity: THREE.Vector3;
  origin: THREE.Vector3;
}

export class PlaneLauncher {
  private aeroPhysics: AeroPhysics;
  private planeGroup: THREE.Group;
  private isGrabbing = false;
  private prevPositions: Array<{ pos: THREE.Vector3; time: number }> = [];

  // Launch pedestal position when plane is resting ready to be thrown
  public homePosition = new THREE.Vector3(0, 1.35, -0.65);
  public homeRotation = new THREE.Euler(0.08, 0, 0); // slight positive launch pitch

  // Custom launch settings for launcher mode
  public launchSpeed = 5.2; // m/s
  public launchPitchDeg = 12; // degrees upward
  public launchHeadingDeg = 0; // heading

  constructor(aeroPhysics: AeroPhysics, planeGroup: THREE.Group) {
    this.aeroPhysics = aeroPhysics;
    this.planeGroup = planeGroup;
    this.resetToHome();
  }

  setPlaneGroup(planeGroup: THREE.Group) {
    this.planeGroup = planeGroup;
    this.resetToHome();
  }

  resetToHome() {
    const q = new THREE.Quaternion().setFromEuler(this.homeRotation);
    this.aeroPhysics.holdAt(this.homePosition, q);
    this.planeGroup.position.copy(this.homePosition);
    this.planeGroup.quaternion.copy(q);
    this.prevPositions = [];
    this.isGrabbing = false;
  }

  startGrab(worldPos: THREE.Vector3) {
    this.isGrabbing = true;
    this.prevPositions = [{ pos: worldPos.clone(), time: performance.now() }];
    sounds.playGrab();
  }

  updateGrab(worldPos: THREE.Vector3, worldQuat?: THREE.Quaternion) {
    if (!this.isGrabbing) return;

    this.planeGroup.position.copy(worldPos);
    if (worldQuat) {
      this.planeGroup.quaternion.copy(worldQuat);
    }
    this.aeroPhysics.position.copy(worldPos);
    if (worldQuat) {
      this.aeroPhysics.quaternion.copy(worldQuat);
    }

    // Keep last 5 sampled positions for smooth throwing velocity estimation
    const now = performance.now();
    this.prevPositions.push({ pos: worldPos.clone(), time: now });
    if (this.prevPositions.length > 6) {
      this.prevPositions.shift();
    }
  }

  releaseThrow(): THREE.Vector3 {
    if (!this.isGrabbing) {
      return new THREE.Vector3(0, 0, 0);
    }
    this.isGrabbing = false;

    // Estimate release velocity from position history
    let throwVelocity = new THREE.Vector3(0, 0, 0);
    if (this.prevPositions.length >= 2) {
      const oldest = this.prevPositions[0];
      const newest = this.prevPositions[this.prevPositions.length - 1];
      const dt = (newest.time - oldest.time) / 1000;

      if (dt > 0.01) {
        throwVelocity.subVectors(newest.pos, oldest.pos).divideScalar(dt);
      }
    }

    // If released with minimal movement, give it a default forward glide push
    const speed = throwVelocity.length();
    if (speed < 1.0) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.planeGroup.quaternion);
      throwVelocity = forward.multiplyScalar(this.launchSpeed);
    }

    sounds.playPinch();
    this.aeroPhysics.launch(throwVelocity);
    return throwVelocity;
  }

  launchPreset(speed?: number, pitchDeg?: number) {
    const launchSpeed = speed ?? this.launchSpeed;
    const pitch = THREE.MathUtils.degToRad(pitchDeg ?? this.launchPitchDeg);

    // Compute forward vector with pitch
    const dir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch)).normalize();
    const velocity = dir.multiplyScalar(launchSpeed);

    // Set plane facing forward
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, 0));
    this.aeroPhysics.holdAt(this.homePosition, quat);
    this.planeGroup.position.copy(this.homePosition);
    this.planeGroup.quaternion.copy(quat);

    sounds.playPinch();
    this.aeroPhysics.launch(velocity);
  }
}
