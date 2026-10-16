import * as THREE from 'three';
import * as xb from 'xrblocks';
import { sounds } from '../sound/AudioEffects';

export interface CollisionResult {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  isFloorOrTable: boolean;
}

export class RoomCollisionDetector {
  private raycaster = new THREE.Raycaster();
  private collisionObjects: THREE.Object3D[] = [];

  constructor() {
    this.raycaster.far = 0.5;
  }

  /**
   * Registers scene objects to test against (e.g. simulator furniture, room depth mesh)
   */
  registerObstacle(obj: THREE.Object3D) {
    if (!this.collisionObjects.includes(obj)) {
      this.collisionObjects.push(obj);
    }
  }

  /**
   * Checks whether the plane at `position` moving along `velocity` will strike a room mesh or depth surface.
   */
  checkCollision(position: THREE.Vector3, velocity: THREE.Vector3, dt: number): CollisionResult | null {
    const speed = velocity.length();
    if (speed < 0.1) return null;

    const dir = velocity.clone().normalize();
    const distanceToTravel = speed * dt + 0.05; // look ahead distance
    this.raycaster.set(position, dir);
    this.raycaster.far = distanceToTravel;

    // Gather test targets: depth mesh, world meshes, and registered objects
    const targets: THREE.Object3D[] = [...this.collisionObjects];

    // 1. WebXR real-time depth mesh if available
    const depthMesh = xb.depth?.depthMesh;
    if (depthMesh && depthMesh.visible) {
      targets.push(depthMesh);
    }

    // 2. World detected meshes if available
    if (xb.world?.meshes) {
      const meshes = (xb.world.meshes as unknown as { meshes?: THREE.Mesh[] }).meshes;
      if (Array.isArray(meshes)) {
        targets.push(...meshes);
      }
    }

    if (targets.length === 0) return null;

    const intersections = this.raycaster.intersectObjects(targets, true);
    if (intersections.length > 0) {
      const hit = intersections[0];
      const normal = hit.face?.normal?.clone() ?? hit.normal?.clone() ?? new THREE.Vector3(0, 1, 0);

      // Transform normal to world space if object has rotation
      if (hit.object) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        normal.applyMatrix3(normalMatrix).normalize();
      }

      // Check if it's a flat landing surface (table top, sofa cushion, shelf, floor)
      const isFloorOrTable = normal.y > 0.6;

      return {
        hit: true,
        point: hit.point,
        normal,
        isFloorOrTable,
      };
    }

    return null;
  }
}
