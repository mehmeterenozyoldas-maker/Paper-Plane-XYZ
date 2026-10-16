import * as THREE from 'three';

/**
 * 3D Aerodynamic Force Vector indicators (Lift, Drag, Gravity, Velocity)
 * emanating from the paper plane's center of pressure.
 */
export class AeroVectors extends THREE.Group {
  private liftArrow: THREE.ArrowHelper;
  private dragArrow: THREE.ArrowHelper;
  private gravArrow: THREE.ArrowHelper;
  private velArrow: THREE.ArrowHelper;
  public enabled = true;

  constructor() {
    super();
    this.name = 'AeroVectors';

    const origin = new THREE.Vector3(0, 0, 0);

    // Green for Lift Force
    this.liftArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      origin,
      0.1,
      0x10b981,
      0.035,
      0.02
    );

    // Red for Drag Force
    this.dragArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      origin,
      0.08,
      0xef4444,
      0.035,
      0.02
    );

    // Cyan/White for Gravity Force
    this.gravArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      origin,
      0.06,
      0x38bdf8,
      0.03,
      0.018
    );

    // Yellow for Velocity Vector
    this.velArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      origin,
      0.12,
      0xfbbf24,
      0.035,
      0.02
    );

    this.add(this.liftArrow, this.dragArrow, this.gravArrow, this.velArrow);
  }

  update(
    pos: THREE.Vector3,
    lift: THREE.Vector3,
    drag: THREE.Vector3,
    gravity: THREE.Vector3,
    velocity: THREE.Vector3
  ) {
    if (!this.enabled) {
      this.visible = false;
      return;
    }
    this.visible = true;
    this.position.copy(pos);

    // Scale factor to map Newton forces into intuitive visual lengths (meters)
    const forceScale = 2.4;
    const velScale = 0.05;

    // 1. Lift Vector
    const liftMag = lift.length();
    if (liftMag > 0.001) {
      this.liftArrow.visible = true;
      this.liftArrow.setDirection(lift.clone().normalize());
      this.liftArrow.setLength(
        Math.min(0.45, Math.max(0.04, liftMag * forceScale)),
        0.035,
        0.02
      );
    } else {
      this.liftArrow.visible = false;
    }

    // 2. Drag Vector
    const dragMag = drag.length();
    if (dragMag > 0.001) {
      this.dragArrow.visible = true;
      this.dragArrow.setDirection(drag.clone().normalize());
      this.dragArrow.setLength(
        Math.min(0.35, Math.max(0.04, dragMag * forceScale)),
        0.035,
        0.02
      );
    } else {
      this.dragArrow.visible = false;
    }

    // 3. Gravity Vector
    const gravMag = gravity.length();
    if (gravMag > 0.001) {
      this.gravArrow.visible = true;
      this.gravArrow.setDirection(gravity.clone().normalize());
      this.gravArrow.setLength(
        Math.min(0.3, Math.max(0.04, gravMag * forceScale)),
        0.03,
        0.018
      );
    } else {
      this.gravArrow.visible = false;
    }

    // 4. Velocity Vector
    const velMag = velocity.length();
    if (velMag > 0.15) {
      this.velArrow.visible = true;
      this.velArrow.setDirection(velocity.clone().normalize());
      this.velArrow.setLength(
        Math.min(0.4, Math.max(0.05, velMag * velScale)),
        0.035,
        0.02
      );
    } else {
      this.velArrow.visible = false;
    }
  }

  dispose() {
    this.liftArrow.dispose();
    this.dragArrow.dispose();
    this.gravArrow.dispose();
    this.velArrow.dispose();
  }
}
