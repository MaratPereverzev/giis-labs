export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Face {
  vertexIndices: number[];
  /** Outward-pointing unit normal */
  normal: Vec3;
  label: string;
}

export interface ProjectedFace {
  /** Projected 2D points (grid coordinates) */
  points: Point2D[];
  visible: boolean;
  label: string;
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Build a unit cube centered at the origin.
 * Vertices span [-0.5, 0.5] on each axis.
 */
export function buildUnitCube(): { vertices: Vec3[]; faces: Face[] } {
  const h = 0.5;
  const vertices: Vec3[] = [
    { x: -h, y: -h, z: -h }, // 0 back-bottom-left
    { x:  h, y: -h, z: -h }, // 1 back-bottom-right
    { x:  h, y:  h, z: -h }, // 2 back-top-right
    { x: -h, y:  h, z: -h }, // 3 back-top-left
    { x: -h, y: -h, z:  h }, // 4 front-bottom-left
    { x:  h, y: -h, z:  h }, // 5 front-bottom-right
    { x:  h, y:  h, z:  h }, // 6 front-top-right
    { x: -h, y:  h, z:  h }, // 7 front-top-left
  ];

  const faces: Face[] = [
    { vertexIndices: [4, 5, 6, 7], normal: { x:  0, y:  0, z:  1 }, label: 'Перед (Z+)' },
    { vertexIndices: [1, 0, 3, 2], normal: { x:  0, y:  0, z: -1 }, label: 'Зад (Z-)' },
    { vertexIndices: [0, 4, 7, 3], normal: { x: -1, y:  0, z:  0 }, label: 'Лево (X-)' },
    { vertexIndices: [5, 1, 2, 6], normal: { x:  1, y:  0, z:  0 }, label: 'Право (X+)' },
    { vertexIndices: [3, 7, 6, 2], normal: { x:  0, y:  1, z:  0 }, label: 'Верх (Y+)' },
    { vertexIndices: [0, 1, 5, 4], normal: { x:  0, y: -1, z:  0 }, label: 'Низ (Y-)' },
  ];

  return { vertices, faces };
}

/**
 * Apply rotation around the X, Y, and Z axes to the cube vertices.
 */
export function rotateCube(
  vertices: Vec3[],
  rotX: number,
  rotY: number,
  rotZ: number
): Vec3[] {
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

  return vertices.map((v) => {
    // Rotate X
    let rx = v.x;
    let ry = v.y * cx - v.z * sx;
    let rz = v.y * sx + v.z * cx;

    // Rotate Y
    const rx2 = rx * cy + rz * sy;
    const ry2 = ry;
    const rz2 = -rx * sy + rz * cy;

    // Rotate Z
    const rx3 = rx2 * cz - ry2 * sz;
    const ry3 = rx2 * sz + ry2 * cz;
    const rz3 = rz2;

    return { x: rx3, y: ry3, z: rz3 };
  });
}

/**
 * Roberts algorithm: determine face visibility from observer's position.
 * Projects visible (and optionally invisible) faces onto a 2D canvas grid.
 *
 * @param vertices  3D cube vertices (possibly already rotated)
 * @param faces     Face definitions with outward normals
 * @param observer  Observer (eye) position in 3D space
 * @param canvasCX  Canvas center X in grid cells
 * @param canvasCY  Canvas center Y in grid cells
 * @param scale     Pixels-per-unit scale for projection
 */
export function applyRobertsAlgorithm(
  vertices: Vec3[],
  faces: Face[],
  observer: Vec3,
  canvasCX: number,
  canvasCY: number,
  scaleVal: number
): ProjectedFace[] {
  return faces.map((face) => {
    // Compute face centroid
    const centroid = face.vertexIndices.reduce(
      (acc, idx) => add(acc, scale(vertices[idx], 1 / face.vertexIndices.length)),
      { x: 0, y: 0, z: 0 }
    );

    // Vector from centroid to observer
    const toObserver = sub(observer, centroid);

    // Compute outward normal from the (already-rotated) vertex positions so
    // that visibility is correct regardless of the current rotation angle.
    const v0 = vertices[face.vertexIndices[0]];
    const v1 = vertices[face.vertexIndices[1]];
    const v3 = vertices[face.vertexIndices[3]];
    const faceNormal = cross(sub(v1, v0), sub(v3, v0));

    // Face is visible if its outward normal points toward the observer
    const visible = dot(faceNormal, toObserver) > 0;

    // Perspective projection: observer at z = +d, projection plane at z = 0.
    // Points closer to the observer (larger z) appear bigger.
    const project = (v: Vec3): Point2D => {
      const d = 3;
      const perspective = d / (d - v.z);
      return {
        x: canvasCX + v.x * scaleVal * perspective,
        y: canvasCY - v.y * scaleVal * perspective,
      };
    };

    const points = face.vertexIndices.map((idx) => project(vertices[idx]));

    return { points, visible, label: face.label };
  });
}
