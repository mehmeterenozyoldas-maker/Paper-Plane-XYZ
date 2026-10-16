import * as THREE from 'three';
import type { PlaneType } from '../types';

/**
 * Generates photorealistic procedural paper textures:
 * - Micro cellulose fibers and paper pulp grain
 * - Fold crease shading and embossing
 * - Aerodynamic guide markings, dihedral angles, and racing liveries
 * - Roughness & normal bump maps
 */
export class PaperTextureGenerator {
  private static cachedTextures = new Map<string, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture }>();

  static getPaperTextures(type: PlaneType, accentColor: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
    const key = `${type}_${accentColor}`;
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key)!;
    }

    const size = 1024;

    // 1. Diffuse / Color Map Canvas
    const diffuseCanvas = document.createElement('canvas');
    diffuseCanvas.width = size;
    diffuseCanvas.height = size;
    const ctx = diffuseCanvas.getContext('2d')!;

    // 2. Bump / Normal Map Canvas
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bumpCtx = bumpCanvas.getContext('2d')!;

    // Base paper background: Warm natural white paper
    ctx.fillStyle = '#fdfbf7';
    ctx.fillRect(0, 0, size, size);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, size, size);

    // Generate procedural paper pulp fiber noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const bumpData = bumpCtx.getImageData(0, 0, size, size);
    const data = imgData.data;
    const bData = bumpData.data;

    for (let i = 0; i < data.length; i += 4) {
      // High frequency grain + medium cellulose flecks
      const grain = (Math.random() - 0.5) * 14;
      const fiber = (Math.random() < 0.03 ? (Math.random() - 0.5) * 28 : 0);
      const totalNoise = grain + fiber;

      data[i] = Math.min(255, Math.max(220, data[i] + totalNoise));     // R
      data[i + 1] = Math.min(255, Math.max(215, data[i + 1] + totalNoise)); // G
      data[i + 2] = Math.min(255, Math.max(205, data[i + 2] + totalNoise)); // B

      const bVal = 128 + (grain * 1.5) + fiber * 2.0;
      bData[i] = bVal;
      bData[i + 1] = bVal;
      bData[i + 2] = bVal;
    }
    ctx.putImageData(imgData, 0, 0);
    bumpCtx.putImageData(bumpData, 0, 0);

    // Draw Subtle Origami Crease Guides & Aerodynamic Livery
    const hexColor = `#${new THREE.Color(accentColor).getHexString()}`;

    // Crease Centerline
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    bumpCtx.strokeStyle = '#404040';
    bumpCtx.lineWidth = 4;
    bumpCtx.beginPath();
    bumpCtx.moveTo(size / 2, 0);
    bumpCtx.lineTo(size / 2, size);
    bumpCtx.stroke();

    // Model-specific aerodynamic markings and decals
    if (type === 'dart') {
      // Racing delta stripes
      ctx.fillStyle = hexColor;
      ctx.beginPath();
      ctx.moveTo(size / 2, 80);
      ctx.lineTo(size / 2 - 280, size - 80);
      ctx.lineTo(size / 2 - 190, size - 80);
      ctx.lineTo(size / 2, 240);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size / 2, 80);
      ctx.lineTo(size / 2 + 280, size - 80);
      ctx.lineTo(size / 2 + 190, size - 80);
      ctx.lineTo(size / 2, 240);
      ctx.closePath();
      ctx.fill();

      // Wing markings
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.fillText('DART // AERODYNAMIC', size / 2, size - 140);
      ctx.font = '22px monospace';
      ctx.fillText('CD0: 0.036 • HIGH SPEED DELTA', size / 2, size - 100);

    } else if (type === 'glider') {
      // Geometric Nakamura Lock markings
      ctx.fillStyle = hexColor;
      // Leading edge wing chevron
      ctx.beginPath();
      ctx.moveTo(size / 2, 140);
      ctx.lineTo(size * 0.08, 420);
      ctx.lineTo(size * 0.14, 420);
      ctx.lineTo(size / 2, 210);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(size / 2, 140);
      ctx.lineTo(size * 0.92, 420);
      ctx.lineTo(size * 0.86, 420);
      ctx.lineTo(size / 2, 210);
      ctx.closePath();
      ctx.fill();

      // Winglet fold indicators
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 3;
      ctx.strokeRect(size * 0.06, size * 0.55, size * 0.88, 180);
      ctx.setLineDash([]);

      ctx.font = 'bold 38px monospace';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText('NAKAMURA LOCK GLIDER', size / 2, size - 160);
      ctx.font = '24px monospace';
      ctx.fillStyle = '#059669';
      ctx.fillText('MAX LIFT COEFFICIENT CL: 1.38', size / 2, size - 110);

    } else {
      // Concorde Canard technical livery
      ctx.fillStyle = hexColor;
      // Front canard arrow
      ctx.beginPath();
      ctx.moveTo(size / 2, 40);
      ctx.lineTo(size / 2 - 140, 200);
      ctx.lineTo(size / 2, 160);
      ctx.lineTo(size / 2 + 140, 200);
      ctx.closePath();
      ctx.fill();

      // Swept ogive delta wing borders
      ctx.strokeStyle = hexColor;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(size / 2, 240);
      ctx.lineTo(size * 0.05, size - 120);
      ctx.lineTo(size * 0.15, size - 120);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(size / 2, 240);
      ctx.lineTo(size * 0.95, size - 120);
      ctx.lineTo(size * 0.85, size - 120);
      ctx.stroke();

      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText('CONCORDE CANARD // OGIVE', size / 2, size - 150);
      ctx.font = '22px monospace';
      ctx.fillStyle = '#d97706';
      ctx.fillText('CANARD STABILATOR SYSTEM', size / 2, size - 110);
    }

    // Center of Gravity Target Crosshair decal
    const cgX = size / 2;
    const cgY = size * 0.52;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cgX, cgY, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cgX - 34, cgY);
    ctx.lineTo(cgX + 34, cgY);
    ctx.moveTo(cgX, cgY - 34);
    ctx.lineTo(cgX, cgY + 34);
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('CG', cgX + 36, cgY + 6);

    // Create Three.js textures
    const map = new THREE.CanvasTexture(diffuseCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.generateMipmaps = true;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;

    const bump = new THREE.CanvasTexture(bumpCanvas);
    bump.generateMipmaps = true;
    bump.minFilter = THREE.LinearMipmapLinearFilter;
    bump.magFilter = THREE.LinearFilter;

    const result = { map, bump };
    this.cachedTextures.set(key, result);
    return result;
  }
}
