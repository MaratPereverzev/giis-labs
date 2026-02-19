export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ClipWindow {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

// Cohen-Sutherland region codes
const INSIDE = 0;
const LEFT = 1;
const RIGHT = 2;
const BOTTOM = 4;
const TOP = 8;

function computeOutcode(x: number, y: number, win: ClipWindow): number {
  let code = INSIDE;
  if (x < win.xMin) code |= LEFT;
  else if (x > win.xMax) code |= RIGHT;
  if (y < win.yMin) code |= BOTTOM;
  else if (y > win.yMax) code |= TOP;
  return code;
}

/**
 * Cohen-Sutherland line clipping algorithm.
 * Returns the clipped segment, or null if fully outside the window.
 */
export function cohenSutherlandClip(seg: Segment, win: ClipWindow): Segment | null {
  let { x1, y1, x2, y2 } = seg;
  let code1 = computeOutcode(x1, y1, win);
  let code2 = computeOutcode(x2, y2, win);

  while (true) {
    if (!(code1 | code2)) {
      // Both inside
      return { x1, y1, x2, y2 };
    }
    if (code1 & code2) {
      // Both in same outside region
      return null;
    }

    // Pick an outside point
    const codeOut = code1 !== INSIDE ? code1 : code2;
    let x = 0;
    let y = 0;

    if (codeOut & TOP) {
      x = x1 + ((x2 - x1) * (win.yMax - y1)) / (y2 - y1);
      y = win.yMax;
    } else if (codeOut & BOTTOM) {
      x = x1 + ((x2 - x1) * (win.yMin - y1)) / (y2 - y1);
      y = win.yMin;
    } else if (codeOut & RIGHT) {
      y = y1 + ((y2 - y1) * (win.xMax - x1)) / (x2 - x1);
      x = win.xMax;
    } else {
      // LEFT
      y = y1 + ((y2 - y1) * (win.xMin - x1)) / (x2 - x1);
      x = win.xMin;
    }

    if (codeOut === code1) {
      x1 = x;
      y1 = y;
      code1 = computeOutcode(x1, y1, win);
    } else {
      x2 = x;
      y2 = y;
      code2 = computeOutcode(x2, y2, win);
    }
  }
}

/**
 * Cyrus-Beck (parametric) line clipping algorithm against an axis-aligned rectangle.
 * Returns the clipped segment, or null if fully outside the window.
 */
export function cyrusBeckClip(seg: Segment, win: ClipWindow): Segment | null {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;

  // Window edges: normals pointing inward, and a point on each edge
  // Left, Right, Bottom, Top
  const edges = [
    { nx: 1, ny: 0, px: win.xMin, py: seg.y1 },   // left edge: normal points right
    { nx: -1, ny: 0, px: win.xMax, py: seg.y1 },  // right edge: normal points left
    { nx: 0, ny: 1, px: seg.x1, py: win.yMin },   // bottom edge: normal points up
    { nx: 0, ny: -1, px: seg.x1, py: win.yMax },  // top edge: normal points down
  ];

  let tEnter = 0;
  let tExit = 1;

  for (const edge of edges) {
    const dDotN = dx * edge.nx + dy * edge.ny;
    const wDotN = (edge.px - seg.x1) * edge.nx + (edge.py - seg.y1) * edge.ny;

    if (Math.abs(dDotN) < 1e-10) {
      // Line is parallel to this edge.
      // wDotN = (P_edge - P_start)·N; if > 0 then P_start is outside → discard.
      if (wDotN > 0) {
        return null;
      }
      continue;
    }

    const t = wDotN / dDotN;

    if (dDotN < 0) {
      // Ray moves away from inward normal → exiting
      tExit = Math.min(tExit, t);
    } else {
      // Ray moves toward inward normal → entering
      tEnter = Math.max(tEnter, t);
    }
  }

  if (tEnter > tExit) {
    return null;
  }

  return {
    x1: seg.x1 + tEnter * dx,
    y1: seg.y1 + tEnter * dy,
    x2: seg.x1 + tExit * dx,
    y2: seg.y1 + tExit * dy,
  };
}
