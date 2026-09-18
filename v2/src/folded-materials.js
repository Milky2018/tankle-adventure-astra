import * as T from 'three';

let cached;
// Seamless, authored material fields. Colour stays quiet; grazing light reveals
// water ripples, rolled sheet seams and fine mineral grain.
export function cityMaterials() {
  if (cached) return cached;
  const size = 512,
    tau = Math.PI * 2;
  function texture(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'),
      image = ctx.createImageData(size, size);
    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x,
          u = (x / size) * tau,
          v = (y / size) * tau;
        const grain =
          ((Math.imul(x + 17, 374761393) ^ Math.imul(y + 29, 668265263)) >>> 0) / 4294967295 - 0.5;
        const cloud = Math.sin(u * 3 + Math.sin(v * 2)) * Math.cos(v * 3 - u);
        let shade, height;
        if (kind === 'water') {
          const swell =
            Math.sin(u * 3 + v * 2) +
            0.45 * Math.sin(u * 7 - v * 5) +
            0.18 * Math.cos(u * 13 + v * 9);
          height = swell * 0.22;
          shade = 211 + swell * 5;
        } else if (kind === 'panel') {
          const seam = Math.min(x % 256, 255 - (x % 256), y % 256, 255 - (y % 256));
          const rivet = Math.hypot(((x + 8) % 256) - 16, ((y + 8) % 256) - 16) < 3;
          height = seam < 2 ? -0.12 : rivet ? 0.12 : grain * 0.008;
          shade =
            215 + cloud * 4 + grain * 5 - (seam < 2 ? 35 : seam < 5 ? 9 : 0) - (rivet ? 26 : 0);
        } else {
          height = grain * 0.025 + cloud * 0.03;
          shade = 214 + cloud * 7 + grain * 9;
        }
        heights[i] = height;
        image.data.set(
          [shade, shade + (kind === 'water' ? 6 : 1), shade + (kind === 'water' ? 9 : -3), 255],
          i * 4,
        );
      }
    ctx.putImageData(image, 0, 0);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    const normals = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const strength = kind === 'water' ? 12 : 1.5;
        const dx =
          (heights[y * size + ((x + 1) % size)] - heights[y * size + ((x + size - 1) % size)]) *
          strength;
        const dy =
          (heights[((y + 1) % size) * size + x] - heights[((y + size - 1) % size) * size + x]) *
          strength;
        const length = Math.hypot(dx, dy, 1);
        normals.set(
          [128 - (dx / length) * 127, 128 + (dy / length) * 127, 128 + 127 / length, 255],
          (y * size + x) * 4,
        );
      }
    const normalMap = new T.DataTexture(normals, size, size, T.RGBAFormat);
    normalMap.flipY = true;
    normalMap.generateMipmaps = true;
    for (const t of [map, normalMap]) {
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.minFilter = T.LinearMipmapLinearFilter;
      t.magFilter = T.LinearFilter;
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
    return { map, normalMap };
  }
  cached = { water: texture('water'), concrete: texture('concrete'), panel: texture('panel') };
  return cached;
}
