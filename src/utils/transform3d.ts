/**
 * 3D transformations in homogeneous coordinates (4×4 matrices).
 * Formulas from практикум: sections 1.6–1.7.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Vec4 = [number, number, number, number];

/** 4×4 matrix in row-major order: mat[row][col], row vector × matrix */
export type Mat4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
];

const IDENTITY: Mat4 = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

export function identity(): Mat4 {
  return IDENTITY.map((row) => [...row]) as Mat4;
}

/** Translation matrix (1.16). */
export function translation(dx: number, dy: number, dz: number): Mat4 {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [dx, dy, dz, 1],
  ];
}

/** Rotation around X axis, angle in radians (1.21). */
export function rotationX(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1],
  ];
}

/** Rotation around Y axis, angle in radians (1.23). */
export function rotationY(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, 0, s, 0],
    [0, 1, 0, 0],
    [-s, 0, c, 0],
    [0, 0, 0, 1],
  ];
}

/** Rotation around Z axis, angle in radians (1.18). */
export function rotationZ(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

/** Scaling matrix (1.25). */
export function scaling(sx: number, sy: number, sz: number): Mat4 {
  return [
    [sx, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sz, 0],
    [0, 0, 0, 1],
  ];
}

/** Reflection relative to XY plane (z -> -z). */
export function reflectionXY(): Mat4 {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, -1, 0],
    [0, 0, 0, 1],
  ];
}

/** Reflection relative to XZ plane (y -> -y). */
export function reflectionXZ(): Mat4 {
  return [
    [1, 0, 0, 0],
    [0, -1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

/** Reflection relative to YZ plane (x -> -x). */
export function reflectionYZ(): Mat4 {
  return [
    [-1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

/**
 * Perspective projection matrix (1.29). d = distance to projection plane.
 * Row-vector convention: v' = v * M, so w' = v[2]*M[2][3] + v[3]*M[3][3] = z/d.
 * After applying, divide by w to get NDC; then x'/w, y'/w are on the projection plane.
 */
export function perspective(d: number): Mat4 {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 1 / d],
    [0, 0, 0, 0],
  ];
}

/** Multiply two 4×4 matrices: A * B (row vector × A × B). */
export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const r: Mat4 = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[i][k] * b[k][j];
      r[i][j] = s;
    }
  }
  return r;
}

/** Convert Vec3 to homogeneous row vector [x, y, z, 1]. */
export function toVec4(v: Vec3): Vec4 {
  return [v.x, v.y, v.z, 1];
}

/** Transform homogeneous vector by matrix: v' = v * M (row vector). */
export function transformVec4(v: Vec4, m: Mat4): Vec4 {
  return [
    v[0] * m[0][0] + v[1] * m[1][0] + v[2] * m[2][0] + v[3] * m[3][0],
    v[0] * m[0][1] + v[1] * m[1][1] + v[2] * m[2][1] + v[3] * m[3][1],
    v[0] * m[0][2] + v[1] * m[1][2] + v[2] * m[2][2] + v[3] * m[3][2],
    v[0] * m[0][3] + v[1] * m[1][3] + v[2] * m[2][3] + v[3] * m[3][3],
  ];
}

/** Apply transformation matrix to a 3D point (returns homogeneous result). */
export function transformPoint(p: Vec3, m: Mat4): Vec4 {
  return transformVec4(toVec4(p), m);
}

/** Homogeneous to Cartesian: (x, y, z, w) -> { x: x/w, y: y/w, z: z/w }. */
export function homogeneousToCartesian(v: Vec4): Vec3 {
  const w = v[3];
  if (Math.abs(w) < 1e-10) return { x: v[0], y: v[1], z: v[2] };
  return {
    x: v[0] / w,
    y: v[1] / w,
    z: v[2] / w,
  };
}

/** Apply full transformation to a point and return Cartesian 3D. */
export function applyTransform(p: Vec3, m: Mat4): Vec3 {
  const v = transformPoint(p, m);
  return homogeneousToCartesian(v);
}

/** Apply transformation to all vertices. */
export function transformVertices(vertices: Vec3[], m: Mat4): Vec3[] {
  return vertices.map((p) => applyTransform(p, m));
}

/**
 * Project 3D point to 2D screen coordinates.
 * perspectiveDist: distance to projection plane (for perspective); if 0 or omitted, orthographic (drop z).
 */
export function projectTo2D(
  p: Vec3,
  perspectiveDist: number
): { x: number; y: number; z: number } {
  if (perspectiveDist > 0) {
    const factor = perspectiveDist / (p.z + perspectiveDist);
    return {
      x: p.x * factor,
      y: p.y * factor,
      z: p.z,
    };
  }
  return { x: p.x, y: p.y, z: p.z };
}
