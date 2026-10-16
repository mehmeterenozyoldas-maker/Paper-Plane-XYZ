import * as THREE from 'three';
import type { AeroProfile, FlightState, FlightTelemetry, FlightTrajectoryPoint } from '../types';
import { RoomCollisionDetector } from './RoomCollisionDetector';

export class AeroPhysics {
  public profile: AeroProfile;
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public quaternion = new THREE.Quaternion();
  public angularVelocity = new THREE.Vector3(); // pitch, roll, yaw rates
  public state: FlightState = 'held';

  public wind = new THREE.Vector3(0, 0, 0); // ambient wind vector
  public airDensity = 1.225; // kg/m^3
  public gravity = 9.81; // m/s^2
  public floorY = 0.02;

  // Room Depth & Meshing collision detector
  public roomCollisionDetector = new RoomCollisionDetector();

  // Aerodynamic stall state tracking
  public didStall = false;
  public stallTimeSec = 0;

  // Real-time calculated aerodynamic forces
  public liftForce = new THREE.Vector3();
  public dragForce = new THREE.Vector3();
  public gravityForce = new THREE.Vector3();
  public totalForce = new THREE.Vector3();

  // Telemetry metrics
  public telemetry: FlightTelemetry;
  public trajectory: FlightTrajectoryPoint[] = [];
  public launchPosition = new THREE.Vector3();
  public launchTime = 0;
  private lastTrajectoryRecord = 0;

  constructor(profile: AeroProfile) {
    this.profile = profile;
    this.telemetry = this.getInitialTelemetry();
  }

  private getInitialTelemetry(): FlightTelemetry {
    return {
      state: 'held',
      airspeed: 0,
      airspeedKmh: 0,
      altitude: 0,
      angleOfAttackDeg: 0,
      bankAngleDeg: 0,
      liftForceN: 0,
      dragForceN: 0,
      liftToDragRatio: 0,
      distanceTraveledM: 0,
      flightTimeSec: 0,
      maxSpeedKmh: 0,
      maxAltitudeM: 0,
    };
  }

  setProfile(profile: AeroProfile) {
    this.profile = profile;
  }

  holdAt(pos: THREE.Vector3, quat: THREE.Quaternion) {
    this.state = 'held';
    this.position.copy(pos);
    this.quaternion.copy(quat);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.liftForce.set(0, 0, 0);
    this.dragForce.set(0, 0, 0);
    this.totalForce.set(0, 0, 0);
  }

  launch(initialVelocity: THREE.Vector3) {
    this.state = 'launched';
    this.velocity.copy(initialVelocity);
    this.launchPosition.copy(this.position);
    this.launchTime = performance.now();
    this.trajectory = [];
    this.lastTrajectoryRecord = 0;
    this.didStall = false;
    this.stallTimeSec = 0;

    this.telemetry = {
      ...this.getInitialTelemetry(),
      state: 'launched',
      altitude: this.position.y,
      maxAltitudeM: this.position.y,
      airspeed: initialVelocity.length(),
      airspeedKmh: initialVelocity.length() * 3.6,
      maxSpeedKmh: initialVelocity.length() * 3.6,
    };

    // Initial pitch rate from forward momentum
    this.angularVelocity.set(0, 0, 0);
  }

  update(dt: number) {
    if (this.state === 'held' || this.state === 'landed') {
      return;
    }

    // Clamp delta time for numerical stability
    const subDt = Math.min(dt, 0.033);

    // Compute relative airspeed accounting for wind
    const relativeAirspeedVec = this.velocity.clone().sub(this.wind);
    const airspeed = relativeAirspeedVec.length();

    // Plane orientation vectors (nose is +Z in model space)
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion).normalize();

    // Angle of Attack (AoA)
    let aoa = 0;
    if (airspeed > 0.15) {
      const vNorm = relativeAirspeedVec.clone().normalize();
      const dotForward = Math.max(-1, Math.min(1, vNorm.dot(forward)));
      const dotUp = vNorm.dot(up);
      // AoA is positive when air flows onto bottom of wing
      aoa = Math.atan2(-dotUp, dotForward);
    }

    const aoaDeg = THREE.MathUtils.radToDeg(aoa);

    // Dynamic Pressure: q = 0.5 * rho * v^2
    const q = 0.5 * this.airDensity * airspeed * airspeed;

    // Check stall condition
    const isStalled = Math.abs(aoa) > this.profile.stallAngleRad;
    this.state = isStalled ? 'stall' : airspeed > 0.5 ? 'gliding' : 'launched';

    // Lift Coefficient calculation
    let cl = 0;
    if (!isStalled) {
      cl = this.profile.liftSlope * aoa;
      cl = Math.max(-this.profile.maxLift, Math.min(this.profile.maxLift, cl));
    } else {
      // Flow separation: sharp loss of lift with high stall resistance
      const sign = aoa >= 0 ? 1 : -1;
      cl = sign * this.profile.maxLift * 0.35 * Math.cos(aoa);
    }

    // Drag Coefficient calculation (parasitic + induced drag + stall wave drag)
    let cd = this.profile.zeroLiftDrag + this.profile.inducedDragFactor * (cl * cl);
    if (isStalled) {
      cd += 0.85 * Math.sin(aoa) * Math.sin(aoa);
    }

    // Lift Force Vector: perpendicular to velocity, in plane's pitch plane
    const liftMagnitude = q * this.profile.wingArea * cl;
    if (airspeed > 0.1) {
      const liftDirection = right.clone().cross(relativeAirspeedVec).normalize();
      this.liftForce.copy(liftDirection.multiplyScalar(liftMagnitude));
    } else {
      this.liftForce.set(0, 0, 0);
    }

    // Drag Force Vector: strictly opposite to relative airspeed
    const dragMagnitude = q * this.profile.wingArea * cd;
    if (airspeed > 0.1) {
      const dragDirection = relativeAirspeedVec.clone().normalize().negate();
      this.dragForce.copy(dragDirection.multiplyScalar(dragMagnitude));
    } else {
      this.dragForce.set(0, 0, 0);
    }

    // Gravity Force Vector
    this.gravityForce.set(0, -this.profile.mass * this.gravity, 0);

    // Total Force & Acceleration (F = m * a => a = F / m)
    this.totalForce.copy(this.liftForce).add(this.dragForce).add(this.gravityForce);
    const acceleration = this.totalForce.clone().divideScalar(this.profile.mass);

    // Integrate Velocity & Position
    this.velocity.addScaledVector(acceleration, subDt);
    this.position.addScaledVector(this.velocity, subDt);

    // --- Aerodynamic Moments & Orientation Updates ---
    if (airspeed > 0.4) {
      // 1. Pitch stability: plane naturally aligns nose to velocity vector
      const vNorm = this.velocity.clone().normalize();
      const pitchError = -vNorm.dot(up); // Positive if nose needs to pitch down
      const pitchTorque = pitchError * this.profile.pitchStability;
      this.angularVelocity.x += pitchTorque * subDt;

      // 2. Roll / Dihedral stability: rights the plane towards wings-level
      const rollError = right.y; // If right wing is lower than left, right.y < 0
      const rollTorque = -rollError * this.profile.rollStability;
      this.angularVelocity.z += rollTorque * subDt;

      // 3. Banked Turn Coupling: lateral lift creates authentic yaw turning
      const lateralLift = this.liftForce.dot(right);
      const yawTorque = -lateralLift * 1.5;
      this.angularVelocity.y += yawTorque * subDt;
    }

    // Aerodynamic rotational damping
    this.angularVelocity.multiplyScalar(Math.pow(0.88, subDt * 60));

    // Apply rotation
    const deltaRot = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        this.angularVelocity.x * subDt,
        this.angularVelocity.y * subDt,
        this.angularVelocity.z * subDt,
        'XYZ'
      )
    );
    this.quaternion.multiply(deltaRot);

    // Smooth alignment with flight vector
    if (airspeed > 0.8 && !isStalled) {
      const targetLook = this.position.clone().add(this.velocity);
      const m = new THREE.Matrix4().lookAt(this.position, targetLook, up);
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);
      this.quaternion.slerp(targetQuat, 0.08);
    }

    // Stall tracking for Gemini Co-Pilot debrief
    if (isStalled && !this.didStall) {
      this.didStall = true;
      this.stallTimeSec = (performance.now() - this.launchTime) / 1000;
    }

    // Room Depth & Scene Mesh Collision Detection
    const hitResult = this.roomCollisionDetector.checkCollision(this.position, this.velocity, subDt);
    if (hitResult) {
      if (hitResult.isFloorOrTable) {
        // Land cleanly on floor, table, or sofa
        this.position.copy(hitResult.point).addScaledVector(hitResult.normal, 0.015);
        this.state = 'landed';
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
      } else {
        // Bounce off vertical wall/furniture with paper restitution
        this.position.copy(hitResult.point).addScaledVector(hitResult.normal, 0.02);
        this.velocity.reflect(hitResult.normal).multiplyScalar(0.35);
        this.angularVelocity.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        );
      }
    } else if (this.position.y <= this.floorY) {
      // Default floor landing fallback
      this.position.y = this.floorY;
      this.state = 'landed';
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);
    }

    // Calculate Bank Angle in degrees
    const bankAngleDeg = THREE.MathUtils.radToDeg(Math.atan2(right.y, up.y));

    // Update Telemetry
    const speedKmh = airspeed * 3.6;
    const distanceM = this.position.distanceTo(this.launchPosition);
    const flightTimeSec = (performance.now() - this.launchTime) / 1000;
    const ld = dragMagnitude > 0.0001 ? Math.abs(liftMagnitude / dragMagnitude) : 0;

    this.telemetry = {
      state: this.state,
      airspeed,
      airspeedKmh: speedKmh,
      altitude: Math.max(0, this.position.y),
      angleOfAttackDeg: aoaDeg,
      bankAngleDeg,
      liftForceN: Math.abs(liftMagnitude),
      dragForceN: Math.abs(dragMagnitude),
      liftToDragRatio: Math.min(25, ld),
      distanceTraveledM: distanceM,
      flightTimeSec,
      maxSpeedKmh: Math.max(this.telemetry.maxSpeedKmh, speedKmh),
      maxAltitudeM: Math.max(this.telemetry.maxAltitudeM, this.position.y),
    };

    // Record trajectory points for 3D flight ribbon and replay
    const now = performance.now();
    if (now - this.lastTrajectoryRecord >= 35) {
      this.trajectory.push({
        position: this.position.clone(),
        velocity: this.velocity.clone(),
        speed: airspeed,
        time: flightTimeSec,
        state: this.state,
      });
      this.lastTrajectoryRecord = now;
    }
  }
}
