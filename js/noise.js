/**
 * Pseudo-random 3D noise — hash-based gradient generator.
 * Returns a value in [-1, 1] for any (x, y, z) coordinate.
 */
export function pseudoNoise3D(x, y, z) {
  const dot = x * 12.9898 + y * 78.233 + z * 37.719;
  const s = Math.sin(dot) * 43758.5453;
  return (s - Math.floor(s)) * 2.0 - 1.0;
}

/**
 * Smooth 3D noise via trilinear interpolation of pseudoNoise3D corners.
 * Uses smoothstep for interpolation weights.
 */
export function smoothNoise3D(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = pseudoNoise3D(ix, iy, iz);
  const n100 = pseudoNoise3D(ix + 1, iy, iz);
  const n010 = pseudoNoise3D(ix, iy + 1, iz);
  const n110 = pseudoNoise3D(ix + 1, iy + 1, iz);
  const n001 = pseudoNoise3D(ix, iy, iz + 1);
  const n101 = pseudoNoise3D(ix + 1, iy, iz + 1);
  const n011 = pseudoNoise3D(ix, iy + 1, iz + 1);
  const n111 = pseudoNoise3D(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;

  return nxy0 + (nxy1 - nxy0) * uz;
}
