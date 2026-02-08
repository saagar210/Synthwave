// Minimal matrix utilities to avoid gl-matrix dependency
export function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

export function lookAt(eye: [number, number, number], center: [number, number, number], up: [number, number, number]): Float32Array {
  const zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
  let len = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz);
  const z0 = zx * len, z1 = zy * len, z2 = zz * len;

  const x0_ = up[1] * z2 - up[2] * z1;
  const x1_ = up[2] * z0 - up[0] * z2;
  const x2_ = up[0] * z1 - up[1] * z0;
  len = Math.sqrt(x0_ * x0_ + x1_ * x1_ + x2_ * x2_);
  const x0 = len ? x0_ / len : 0, x1 = len ? x1_ / len : 0, x2 = len ? x2_ / len : 0;

  const y0 = z1 * x2 - z2 * x1;
  const y1 = z2 * x0 - z0 * x2;
  const y2 = z0 * x1 - z1 * x0;

  return new Float32Array([
    x0, y0, z0, 0,
    x1, y1, z1, 0,
    x2, y2, z2, 0,
    -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]),
    -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]),
    -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]),
    1,
  ]);
}

export function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] =
        a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
  }
  return out;
}
