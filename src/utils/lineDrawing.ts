// Точка на пиксельной сетке
export interface Point {
  x: number;
  y: number;
}

// Информация для пошагового режима отладки
export interface StepInfo extends Point {
  // целочисленное значение ошибки/решения (Δi или аналог)
  deltaI: number;
  // тип шага: горизонтальный (H), вертикальный (V) или диагональный (D)
  stepType: 'H' | 'V' | 'D';
}

// DDA (Digital Differential Analyzer) — возвращает пиксели с округлением
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

// DDA debug-версия: возвращает шаги с информацией о Δi
export function drawLineDDADebug(x0: number, y0: number, x1: number, y1: number): StepInfo[] {
  const steps: StepInfo[] = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const numSteps = Math.max(Math.abs(dx), Math.abs(dy));

  if (numSteps === 0) {
    steps.push({ x: x0, y: y0, deltaI: 0, stepType: 'H' });
    return steps;
  }

  const xInc = dx / numSteps;
  const yInc = dy / numSteps;
  let x = x0;
  let y = y0;

  for (let i = 0; i <= numSteps; i++) {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    const deltaI = Math.abs((x - roundedX) + (y - roundedY));
    let stepType: 'H' | 'V' | 'D' = 'H';
    if (Math.abs(yInc) > Math.abs(xInc)) stepType = Math.abs(yInc) > 0.5 ? 'V' : 'D';
    else if (Math.abs(xInc) > 0.5) stepType = 'D';

    steps.push({ x: roundedX, y: roundedY, deltaI, stepType });
    x += xInc;
    y += yInc;
  }

  return steps;
}

// Bresenham — целочисленная растеризация
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

// Bresenham debug-версия: возвращает шаги с решением Δi
export function drawLineBresenhamDebug(x0: number, y0: number, x1: number, y1: number): StepInfo[] {
  const steps: StepInfo[] = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;

  let err = dx - dy;

  while (true) {
    let stepType: 'H' | 'V' | 'D' = 'D';
    if (dx === 0) stepType = 'V';
    else if (dy === 0) stepType = 'H';

    steps.push({ x, y, deltaI: err, stepType });

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

  return steps;
}

// Wu (anti-aliasing) — производит пиксели с интенсивностью [0..1]
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
