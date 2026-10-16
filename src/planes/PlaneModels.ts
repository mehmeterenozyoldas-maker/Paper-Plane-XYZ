import * as THREE from 'three';
import type { AeroProfile, PlaneType } from '../types';
import { PaperTextureGenerator } from './PaperTextureGenerator';

export const AERO_PROFILES: Record<PlaneType, AeroProfile> = {
  dart: {
    name: 'Classic Dart',
    type: 'dart',
    mass: 0.0048,
    wingArea: 0.019,
    wingspan: 0.16,
    aspectRatio: 1.35,
    zeroLiftDrag: 0.036,
    inducedDragFactor: 0.075,
    liftSlope: 3.7,
    maxLift: 0.98,
    stallAngleRad: THREE.MathUtils.degToRad(16),
    pitchStability: 6.2,
    rollStability: 3.2,
    color: 0x0284c7, // Sky Blue
    description: 'Sharp delta wing with low parasitic drag. Excellent high-speed straight penetration.',
  },
  glider: {
    name: 'Nakamura Glider',
    type: 'glider',
    mass: 0.0050,
    wingArea: 0.033,
    wingspan: 0.28,
    aspectRatio: 2.38,
    zeroLiftDrag: 0.052,
    inducedDragFactor: 0.042,
    liftSlope: 4.9,
    maxLift: 1.38,
    stallAngleRad: THREE.MathUtils.degToRad(19),
    pitchStability: 8.8,
    rollStability: 5.8,
    color: 0x059669, // Emerald
    description: 'Broad wingspan with folded nose lock and winglets. Maximum float and glide ratio.',
  },
  concorde: {
    name: 'Concorde Canard',
    type: 'concorde',
    mass: 0.0054,
    wingArea: 0.025,
    wingspan: 0.21,
    aspectRatio: 1.76,
    zeroLiftDrag: 0.044,
    inducedDragFactor: 0.058,
    liftSlope: 4.3,
    maxLift: 1.18,
    stallAngleRad: THREE.MathUtils.degToRad(21),
    pitchStability: 7.4,
    rollStability: 4.4,
    color: 0xd97706, // Amber
    description: 'Swept ogival delta with forward canard foils. High stability across speed ranges.',
  },
};

/**
 * Creates an authentic, realistic folded paper airplane 3D mesh with procedural paper pulp fiber textures,
 * crease embossing, aerodynamic decals, and true 3D fold geometry with thickness.
 */
export function createPaperPlaneMesh(type: PlaneType): THREE.Group {
  const planeGroup = new THREE.Group();
  planeGroup.name = `PaperPlane_${type}`;

  const profile = AERO_PROFILES[type];
  const { map, bump } = PaperTextureGenerator.getPaperTextures(type, profile.color);

  // High-fidelity physical paper material
  const paperMaterial = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 0.0028,
    roughness: 0.82,
    metalness: 0.03,
    side: THREE.DoubleSide,
    shadowSide: THREE.DoubleSide,
  });

  // Darker crease line material for embossed fold lines
  const creaseLineMat = new THREE.LineBasicMaterial({
    color: 0x64748b,
    linewidth: 2,
    transparent: true,
    opacity: 0.75,
  });

  if (type === 'dart') {
    buildRealisticDart(planeGroup, paperMaterial, creaseLineMat);
  } else if (type === 'glider') {
    buildRealisticGlider(planeGroup, paperMaterial, creaseLineMat);
  } else {
    buildRealisticConcorde(planeGroup, paperMaterial, creaseLineMat);
  }

  // Add subtle Center of Gravity (CG) 3D marker beneath fuselage
  const cgGroup = new THREE.Group();
  const cgSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.0035, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.5 })
  );
  cgGroup.position.set(0, -0.012, 0.01);
  cgGroup.add(cgSphere);
  planeGroup.add(cgGroup);

  return planeGroup;
}

/**
 * Builds the Classic Dart with folded fuselage keel walls, dihedral delta wings, and nose tuck fold.
 */
function buildRealisticDart(
  group: THREE.Group,
  material: THREE.Material,
  creaseMat: THREE.Material
) {
  const noseZ = 0.18;
  const tailZ = -0.15;
  const wingHalfSpan = 0.085;
  const dihedralY = 0.022; // upward wing dihedral
  const keelDepth = -0.032;

  // Vertices with UVs: Left Wing, Right Wing, and Keel Fuselage
  // Formatted as: pos(x,y,z), uv(u,v), normal(x,y,z)
  const vertices: number[] = [];
  const uvs: number[] = [];

  function addTri(
    p1: [number, number, number], uv1: [number, number],
    p2: [number, number, number], uv2: [number, number],
    p3: [number, number, number], uv3: [number, number]
  ) {
    vertices.push(...p1, ...p2, ...p3);
    uvs.push(...uv1, ...uv2, ...uv3);
  }

  // --- Left Delta Wing ---
  // Mid-chord camber point to give subtle curve
  const midZ = (noseZ + tailZ) * 0.5;
  const midSpan = wingHalfSpan * 0.55;
  const midY = dihedralY * 0.45;

  addTri(
    [0, 0, noseZ], [0.5, 0.95],
    [-wingHalfSpan, dihedralY, tailZ], [0.15, 0.15],
    [-midSpan, midY, midZ], [0.3, 0.55]
  );
  addTri(
    [0, 0, noseZ], [0.5, 0.95],
    [-midSpan, midY, midZ], [0.3, 0.55],
    [0, 0, tailZ], [0.5, 0.15]
  );
  addTri(
    [-midSpan, midY, midZ], [0.3, 0.55],
    [-wingHalfSpan, dihedralY, tailZ], [0.15, 0.15],
    [0, 0, tailZ], [0.5, 0.15]
  );

  // --- Right Delta Wing ---
  addTri(
    [0, 0, noseZ], [0.5, 0.95],
    [midSpan, midY, midZ], [0.7, 0.55],
    [wingHalfSpan, dihedralY, tailZ], [0.85, 0.15]
  );
  addTri(
    [0, 0, noseZ], [0.5, 0.95],
    [0, 0, tailZ], [0.5, 0.15],
    [midSpan, midY, midZ], [0.7, 0.55]
  );
  addTri(
    [midSpan, midY, midZ], [0.7, 0.55],
    [0, 0, tailZ], [0.5, 0.15],
    [wingHalfSpan, dihedralY, tailZ], [0.85, 0.15]
  );

  // --- 3D Keel Fuselage (Double paper wall with finger-grip gap) ---
  const keelHalfWidth = 0.002;
  // Left keel wall
  addTri(
    [0, 0, noseZ], [0.5, 0.95],
    [-keelHalfWidth, 0, tailZ], [0.49, 0.15],
    [-keelHalfWidth, keelDepth, -0.02], [0.49, 0.5]
  );
  // Right keel wall
  addTri(
    [0, 0, noseZ], [0.5, 0.95],
    [keelHalfWidth, keelDepth, -0.02], [0.51, 0.5],
    [keelHalfWidth, 0, tailZ], [0.51, 0.15]
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Crease fold outline lines
  const creasePoints = [
    // Spine
    new THREE.Vector3(0, 0, noseZ),
    new THREE.Vector3(0, 0, tailZ),
    // Keel bottom
    new THREE.Vector3(0, keelDepth, -0.02),
    new THREE.Vector3(0, 0, noseZ),
    // Left Wing Leading Edge
    new THREE.Vector3(-wingHalfSpan, dihedralY, tailZ),
    new THREE.Vector3(0, 0, tailZ),
    // Right Wing Leading Edge
    new THREE.Vector3(wingHalfSpan, dihedralY, tailZ),
    new THREE.Vector3(0, 0, noseZ),
  ];
  const creaseGeo = new THREE.BufferGeometry().setFromPoints(creasePoints);
  group.add(new THREE.Line(creaseGeo, creaseMat));
}

/**
 * Builds the Nakamura Lock Glider with broad wings, folded nose lock ballast, and angled winglets.
 */
function buildRealisticGlider(
  group: THREE.Group,
  material: THREE.Material,
  creaseMat: THREE.Material
) {
  const noseZ = 0.13;
  const tailZ = -0.11;
  const wingSpan = 0.145; // halfspan
  const dihedralY = 0.018;
  const wingletH = 0.038;
  const keelDepth = -0.026;

  const vertices: number[] = [];
  const uvs: number[] = [];

  function addTri(
    p1: [number, number, number], uv1: [number, number],
    p2: [number, number, number], uv2: [number, number],
    p3: [number, number, number], uv3: [number, number]
  ) {
    vertices.push(...p1, ...p2, ...p3);
    uvs.push(...uv1, ...uv2, ...uv3);
  }

  // --- Left Main Wing ---
  addTri(
    [0, 0.005, noseZ], [0.5, 0.9],
    [-wingSpan, dihedralY, tailZ], [0.08, 0.2],
    [0, 0.005, tailZ], [0.5, 0.2]
  );
  addTri(
    [0, 0.005, noseZ], [0.5, 0.9],
    [-wingSpan * 0.65, dihedralY * 0.8, -0.01], [0.22, 0.55],
    [-wingSpan, dihedralY, tailZ], [0.08, 0.2]
  );

  // --- Right Main Wing ---
  addTri(
    [0, 0.005, noseZ], [0.5, 0.9],
    [0, 0.005, tailZ], [0.5, 0.2],
    [wingSpan, dihedralY, tailZ], [0.92, 0.2]
  );
  addTri(
    [0, 0.005, noseZ], [0.5, 0.9],
    [wingSpan, dihedralY, tailZ], [0.92, 0.2],
    [wingSpan * 0.65, dihedralY * 0.8, -0.01], [0.78, 0.55]
  );

  // --- Left Upward Winglet (Angled Stabilizer Fold) ---
  addTri(
    [-wingSpan, dihedralY, tailZ], [0.08, 0.2],
    [-wingSpan - 0.005, dihedralY + wingletH, tailZ], [0.03, 0.2],
    [-wingSpan * 0.85, dihedralY + wingletH * 0.6, 0.02], [0.12, 0.6]
  );
  addTri(
    [-wingSpan, dihedralY, tailZ], [0.08, 0.2],
    [-wingSpan * 0.85, dihedralY + wingletH * 0.6, 0.02], [0.12, 0.6],
    [-wingSpan * 0.85, dihedralY, 0.02], [0.15, 0.6]
  );

  // --- Right Upward Winglet ---
  addTri(
    [wingSpan, dihedralY, tailZ], [0.92, 0.2],
    [wingSpan * 0.85, dihedralY + wingletH * 0.6, 0.02], [0.88, 0.6],
    [wingSpan + 0.005, dihedralY + wingletH, tailZ], [0.97, 0.2]
  );
  addTri(
    [wingSpan, dihedralY, tailZ], [0.92, 0.2],
    [wingSpan * 0.85, dihedralY, 0.02], [0.85, 0.6],
    [wingSpan * 0.85, dihedralY + wingletH * 0.6, 0.02], [0.88, 0.6]
  );

  // --- Nakamura Lock Front Ballast Fold (Tucked triangular paper tab) ---
  const lockLen = 0.055;
  addTri(
    [0, -0.004, noseZ + 0.012], [0.5, 0.98],
    [-0.035, -0.002, noseZ - lockLen], [0.42, 0.72],
    [0.035, -0.002, noseZ - lockLen], [0.58, 0.72]
  );

  // Keel bottom
  addTri(
    [0, 0.005, noseZ], [0.5, 0.9],
    [0, 0.005, tailZ], [0.5, 0.2],
    [0, keelDepth, -0.02], [0.5, 0.5]
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Winglet crease guides
  const creasePoints = [
    new THREE.Vector3(-wingSpan, dihedralY, tailZ),
    new THREE.Vector3(-wingSpan * 0.85, dihedralY, 0.02),
    new THREE.Vector3(0, 0.005, noseZ),
    new THREE.Vector3(wingSpan * 0.85, dihedralY, 0.02),
    new THREE.Vector3(wingSpan, dihedralY, tailZ),
  ];
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(creasePoints), creaseMat));
}

/**
 * Builds the Concorde Canard with ogival double-delta wings and forward stabilators.
 */
function buildRealisticConcorde(
  group: THREE.Group,
  material: THREE.Material,
  creaseMat: THREE.Material
) {
  const noseZ = 0.17;
  const tailZ = -0.14;
  const wingSpan = 0.115;
  const keelDepth = -0.034;

  const vertices: number[] = [];
  const uvs: number[] = [];

  function addTri(
    p1: [number, number, number], uv1: [number, number],
    p2: [number, number, number], uv2: [number, number],
    p3: [number, number, number], uv3: [number, number]
  ) {
    vertices.push(...p1, ...p2, ...p3);
    uvs.push(...uv1, ...uv2, ...uv3);
  }

  // --- Forward Canard Stabilators ---
  const canardSpan = 0.048;
  const canardZ = 0.085;
  // Left canard
  addTri(
    [0, 0.002, 0.14], [0.5, 0.92],
    [-canardSpan, 0.012, canardZ], [0.35, 0.78],
    [0, 0.002, canardZ], [0.5, 0.78]
  );
  // Right canard
  addTri(
    [0, 0.002, 0.14], [0.5, 0.92],
    [0, 0.002, canardZ], [0.5, 0.78],
    [canardSpan, 0.012, canardZ], [0.65, 0.78]
  );

  // --- Ogival Swept Double-Delta Wings ---
  const breakZ = 0.02;
  const breakSpan = wingSpan * 0.45;
  const breakY = 0.008;

  // Left Inner & Outer ogive delta
  addTri(
    [0, 0, canardZ], [0.5, 0.78],
    [-breakSpan, breakY, breakZ], [0.32, 0.5],
    [0, 0, tailZ], [0.5, 0.15]
  );
  addTri(
    [-breakSpan, breakY, breakZ], [0.32, 0.5],
    [-wingSpan, 0.018, tailZ], [0.12, 0.15],
    [0, 0, tailZ], [0.5, 0.15]
  );

  // Right Inner & Outer ogive delta
  addTri(
    [0, 0, canardZ], [0.5, 0.78],
    [0, 0, tailZ], [0.5, 0.15],
    [breakSpan, breakY, breakZ], [0.68, 0.5]
  );
  addTri(
    [breakSpan, breakY, breakZ], [0.68, 0.5],
    [0, 0, tailZ], [0.5, 0.15],
    [wingSpan, 0.018, tailZ], [0.88, 0.15]
  );

  // High Slender Keel Fuselage
  addTri(
    [0, 0, noseZ], [0.5, 0.98],
    [-0.002, 0, tailZ], [0.49, 0.15],
    [-0.002, keelDepth, -0.03], [0.49, 0.45]
  );
  addTri(
    [0, 0, noseZ], [0.5, 0.98],
    [0.002, keelDepth, -0.03], [0.51, 0.45],
    [0.002, 0, tailZ], [0.51, 0.15]
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Ogive boundary crease lines
  const creasePoints = [
    new THREE.Vector3(0, 0, noseZ),
    new THREE.Vector3(0, 0, tailZ),
    new THREE.Vector3(0, keelDepth, -0.03),
    new THREE.Vector3(0, 0, noseZ),
    new THREE.Vector3(-canardSpan, 0.012, canardZ),
    new THREE.Vector3(0, 0.002, canardZ),
    new THREE.Vector3(canardSpan, 0.012, canardZ),
    new THREE.Vector3(0, 0, noseZ),
  ];
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(creasePoints), creaseMat));
}
