import * as THREE from 'three';

/**
 * Detects software WebGL (SwiftShader, llvmpipe, WARP) from the GPU renderer string,
 * never the user agent, per Three.js skill directives.
 */
export function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Generates a realistic Free Fire Bermuda terrain texture with weathered olive-earth,
 * dry grass patches, dirt footpaths, and gritty soil noise.
 */
export function createArenaGroundTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Realistic Bermuda olive-drab earth & dry grass base
  ctx.fillStyle = '#3a4d2c';
  ctx.fillRect(0, 0, 512, 512);

  // Organic dry grass & soil patches
  for (let i = 0; i < 160; i++) {
    const rx = (i * 97) % 512;
    const ry = (i * 173) % 512;
    const r = 14 + (i % 28);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(78, 94, 52, 0.42)'
        : i % 3 === 1
          ? 'rgba(92, 76, 50, 0.34)'
          : 'rgba(46, 64, 34, 0.45)';
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine tactical soil grit & grass blade speckles
  for (let i = 0; i < 1800; i++) {
    const gx = (i * 37) % 512;
    const gy = (i * 83) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 41, 22, 0.35)' : 'rgba(120, 113, 82, 0.25)';
    ctx.fillRect(gx, gy, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(32, 32);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a realistic weathered asphalt road texture with dashed yellow centerline
 * and worn concrete shoulder markings for the Bermuda road network.
 */
export function createAsphaltRoadTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark weathered tarmac
  ctx.fillStyle = '#26292e';
  ctx.fillRect(0, 0, 256, 256);

  // Asphalt aggregate noise
  for (let i = 0; i < 600; i++) {
    const x = (i * 53) % 256;
    const y = (i * 91) % 256;
    ctx.fillStyle = i % 2 === 0 ? '#1e2024' : '#32363d';
    ctx.fillRect(x, y, 2, 2);
  }

  // White shoulder edge lines
  ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
  ctx.fillRect(10, 0, 5, 256);
  ctx.fillRect(241, 0, 5, 256);

  // Dashed yellow Bermuda highway centerline
  ctx.fillStyle = '#eab308';
  ctx.fillRect(125, 16, 6, 88);
  ctx.fillRect(125, 144, 6, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 24);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a soft radial contact shadow texture so characters and props never look like they float.
 */
let cachedShadowTexture: THREE.CanvasTexture | null = null;
export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTexture) return cachedShadowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.30)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedShadowTexture = tex;
  return tex;
}

/**
 * Recursively disposes all geometries and materials inside an Object3D hierarchy.
 */
export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  });
}
