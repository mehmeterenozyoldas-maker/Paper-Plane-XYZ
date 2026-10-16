import * as THREE from 'three';
import * as xb from 'xrblocks';
import { sounds } from '../sound/AudioEffects';

export interface GrabbablePanelTarget {
  card: xb.UICard;
  setHoverState: (hovered: boolean, focused: boolean) => void;
  width: number;
}

interface HandState {
  handedness: xb.Handedness;
  isPinching: boolean;
  pinchPoint: THREE.Vector3;
  pinchDistance: number;
  grabbedTarget: GrabbablePanelTarget | null;
  grabOffset: THREE.Vector3;
  grabStartCardPos: THREE.Vector3;
  grabStartCardQuat: THREE.Quaternion;
  indicatorMesh: THREE.Mesh;
}

/**
 * XRExtendedHandTracking
 * Provides natural pinch-and-grab 6-DoF spatial interactions for XR panels,
 * moving beyond controller-only input into natural hand tracking.
 * Supports dual-hand tracking, pinch detection, single-hand 6-DoF move, and two-handed pinch-to-scale.
 */
export class XRExtendedHandTracking extends xb.Script {
  private targets: GrabbablePanelTarget[] = [];
  private leftHand: HandState;
  private rightHand: HandState;

  // Visual pinch halos
  private indicatorGeo = new THREE.SphereGeometry(0.012, 16, 16);
  private indicatorMatL = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });
  private indicatorMatR = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0,
    depthTest: false,
  });

  // Two-handed pinch-to-scale state
  private twoHandedTarget: GrabbablePanelTarget | null = null;
  private twoHandedInitialDistance = 0;
  private twoHandedInitialScale = 1.0;

  constructor() {
    super();
    this.name = 'XRExtendedHandTracking';

    const meshL = new THREE.Mesh(this.indicatorGeo, this.indicatorMatL);
    const meshR = new THREE.Mesh(this.indicatorGeo, this.indicatorMatR);
    meshL.renderOrder = 2000;
    meshR.renderOrder = 2000;
    this.add(meshL, meshR);

    this.leftHand = {
      handedness: xb.Handedness.LEFT,
      isPinching: false,
      pinchPoint: new THREE.Vector3(),
      pinchDistance: 1.0,
      grabbedTarget: null,
      grabOffset: new THREE.Vector3(),
      grabStartCardPos: new THREE.Vector3(),
      grabStartCardQuat: new THREE.Quaternion(),
      indicatorMesh: meshL,
    };

    this.rightHand = {
      handedness: xb.Handedness.RIGHT,
      isPinching: false,
      pinchPoint: new THREE.Vector3(),
      pinchDistance: 1.0,
      grabbedTarget: null,
      grabOffset: new THREE.Vector3(),
      grabStartCardPos: new THREE.Vector3(),
      grabStartCardQuat: new THREE.Quaternion(),
      indicatorMesh: meshR,
    };
  }

  registerPanel(target: GrabbablePanelTarget) {
    if (!this.targets.includes(target)) {
      this.targets.push(target);
    }
  }

  update() {
    const hands = xb.user?.hands;
    const controllers = xb.user?.controllers ?? [];

    this.updateHandState(this.leftHand, hands, controllers[0]);
    this.updateHandState(this.rightHand, hands, controllers[1]);

    // Check two-handed interaction if both hands are pinching the same panel
    if (this.leftHand.grabbedTarget && this.leftHand.grabbedTarget === this.rightHand.grabbedTarget) {
      this.handleTwoHandedInteraction(this.leftHand.grabbedTarget);
    } else {
      this.twoHandedTarget = null;
      // Single-hand movement
      this.handleSingleHandDrag(this.leftHand);
      this.handleSingleHandDrag(this.rightHand);
    }

    // Evaluate proximity hover states for ungrabbed panels
    this.updateProximityHovers();
  }

  private updateHandState(state: HandState, hands: xb.Hands | undefined, controller: xb.Controller | undefined) {
    let indexPos: THREE.Vector3 | null = null;
    let thumbPos: THREE.Vector3 | null = null;

    if (hands) {
      const indexJoint = hands.getIndexTip(state.handedness);
      const thumbJoint = hands.getThumbTip(state.handedness);

      if (indexJoint && thumbJoint) {
        indexPos = indexJoint.getWorldPosition(new THREE.Vector3());
        thumbPos = thumbJoint.getWorldPosition(new THREE.Vector3());
      }
    }

    // Fallback to simulated controller/mouse position if optical hand joints aren't active
    if (!indexPos || !thumbPos) {
      if (controller) {
        const ctrlPos = controller.getWorldPosition(new THREE.Vector3());
        indexPos = ctrlPos.clone().add(new THREE.Vector3(0, 0, -0.04));
        thumbPos = ctrlPos.clone().add(new THREE.Vector3(0, -0.015, -0.02));
        if (controller.userData?.selected) {
          thumbPos.copy(indexPos);
        }
      }
    }

    if (indexPos && thumbPos) {
      state.pinchDistance = indexPos.distanceTo(thumbPos);
      state.pinchPoint.copy(indexPos).add(thumbPos).multiplyScalar(0.5);

      const wasPinching = state.isPinching;
      // Natural pinch threshold: < 3.2cm for pinch, > 4.8cm for release
      if (!wasPinching && state.pinchDistance < 0.034) {
        state.isPinching = true;
        this.onPinchStart(state);
      } else if (wasPinching && state.pinchDistance > 0.048) {
        state.isPinching = false;
        this.onPinchEnd(state);
      }

      // Visual indicator halo
      state.indicatorMesh.position.copy(state.pinchPoint);
      const mat = state.indicatorMesh.material as THREE.MeshBasicMaterial;
      const proximityAlpha = Math.max(0, Math.min(0.85, 1.0 - state.pinchDistance / 0.08));
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, state.isPinching ? 0.9 : proximityAlpha, 0.25);
      state.indicatorMesh.scale.setScalar(state.isPinching ? 1.4 : 0.8 + proximityAlpha * 0.4);
    } else {
      state.isPinching = false;
      const mat = state.indicatorMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0;
    }
  }

  private onPinchStart(state: HandState) {
    sounds.playPinch();

    // Check if pinch occurred close to any registered panel
    for (const target of this.targets) {
      const cardPos = target.card.position;
      const dist = state.pinchPoint.distanceTo(cardPos);

      // Proximity envelope around the panel (taking into account card width and reach)
      const maxGrabDist = target.width * 0.75 + 0.15;
      if (dist < maxGrabDist) {
        state.grabbedTarget = target;
        state.grabOffset.copy(cardPos).sub(state.pinchPoint);
        state.grabStartCardPos.copy(cardPos);
        state.grabStartCardQuat.copy(target.card.quaternion);

        target.setHoverState(true, true);
        sounds.playGrab();
        break;
      }
    }
  }

  private onPinchEnd(state: HandState) {
    if (state.grabbedTarget) {
      state.grabbedTarget.setHoverState(false, false);
      sounds.playRelease();
      state.grabbedTarget = null;
    }
  }

  private handleSingleHandDrag(state: HandState) {
    if (!state.isPinching || !state.grabbedTarget) return;

    const card = state.grabbedTarget.card;
    const targetPos = state.pinchPoint.clone().add(state.grabOffset);

    // Smooth physical motion interpolation
    card.position.lerp(targetPos, 0.35);

    // Subtle natural tilt following hand movement
    const userCam = xb.core?.camera;
    if (userCam) {
      // Gentle billboard orientation facing user softly
      const lookPos = new THREE.Vector3(userCam.position.x, card.position.y, userCam.position.z);
      const m = new THREE.Matrix4().lookAt(card.position, lookPos, new THREE.Vector3(0, 1, 0));
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);
      card.quaternion.slerp(targetQuat, 0.08);
    }
  }

  private handleTwoHandedInteraction(target: GrabbablePanelTarget) {
    const card = target.card;
    const handDist = this.leftHand.pinchPoint.distanceTo(this.rightHand.pinchPoint);

    if (!this.twoHandedTarget) {
      this.twoHandedTarget = target;
      this.twoHandedInitialDistance = Math.max(0.05, handDist);
      this.twoHandedInitialScale = card.scale.x;
      target.setHoverState(true, true);
    } else {
      // Scale panel naturally based on distance between two hands
      const scaleFactor = handDist / this.twoHandedInitialDistance;
      const targetScale = Math.min(2.0, Math.max(0.5, this.twoHandedInitialScale * scaleFactor));
      card.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);

      // Midpoint between hands moves the panel center
      const midPoint = this.leftHand.pinchPoint.clone().add(this.rightHand.pinchPoint).multiplyScalar(0.5);
      card.position.lerp(midPoint, 0.25);
    }
  }

  private updateProximityHovers() {
    for (const target of this.targets) {
      // If actively grabbed, already handled
      if (this.leftHand.grabbedTarget === target || this.rightHand.grabbedTarget === target) {
        continue;
      }

      const cardPos = target.card.position;
      const distL = this.leftHand.pinchPoint.distanceTo(cardPos);
      const distR = this.rightHand.pinchPoint.distanceTo(cardPos);
      const closestDist = Math.min(distL, distR);

      const hoverDist = target.width * 0.65 + 0.12;
      const isHovered = closestDist < hoverDist;

      target.setHoverState(isHovered, false);
    }
  }

  dispose() {
    this.indicatorGeo.dispose();
    this.indicatorMatL.dispose();
    this.indicatorMatR.dispose();
    this.targets = [];
  }
}
