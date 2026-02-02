// Point on pixel grid
export interface Point {
  x: number;
  y: number;
}

// DDA (Digital Differential Analyzer) - returns rounded pixel coordinates
export function drawLineDDA(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  if (steps === 0) {
    points.push({ x: x0, y: y0 });
    return points;
  }

  const xInc = dx / steps;
  const yInc = dy / steps;
  let x = x0;
  let y = y0;

  for (let i = 0; i <= steps; i++) {
    points.push({ x: Math.round(x), y: Math.round(y) });
    x += xInc;
    y += yInc;
  }

  return points;
}

// Bresenham - integer rasterization
export function drawLineBresenham(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;

  let err = dx - dy;

  while (true) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

// Wu (anti-aliasing) - produces pixels with intensity [0..1]
export function drawLineWu(x0: number, y0: number, x1: number, y1: number): Array<Point & { intensity: number }> {
  const points: Array<Point & { intensity: number }> = [];
  let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

  if (steep) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
  }
  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const gradient = dx === 0 ? 0 : dy / dx;

  for (let x = Math.round(x0); x <= Math.round(x1); x++) {
    const y = y0 + gradient * (x - x0);
    plotWuPoint(points, x, y, steep);
  }

  return points;
}

function fpart(x: number): number {
  return x - Math.floor(x);
}

function rfpart(x: number): number {
  return 1 - fpart(x);
}

// Plot two neighboring pixels with computed intensity
function plotWuPoint(
  points: Array<Point & { intensity: number }>,
  x: number,
  y: number,
  steep: boolean
) {
  const xi = Math.round(x);
  const yFloor = Math.floor(y);
  const yFrac = fpart(y);

  const p1: Point & { intensity: number } = steep
    ? { x: yFloor, y: xi, intensity: rfpart(yFrac) }
    : { x: xi, y: yFloor, intensity: rfpart(yFrac) };

  const p2: Point & { intensity: number } = steep
    ? { x: yFloor + 1, y: xi, intensity: fpart(yFrac) }
    : { x: xi, y: yFloor + 1, intensity: fpart(yFrac) };

  points.push(p1);
  if (yFrac > 1e-3) points.push(p2);
}
