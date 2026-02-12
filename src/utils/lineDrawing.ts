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

// Вспомогательные функции для Wu алгоритма
function fpart(x: number): number {
  return x - Math.floor(x);
}

function rfpart(x: number): number {
  return 1.0 - fpart(x);
}

// Wu algorithm with anti-aliasing (Xiaolin Wu)
// Правильная реализация с учётом расстояния от линии до центра пикселя
export function drawLineWu(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Array<Point & { intensity: number }> {
  const points: Array<Point & { intensity: number }> = [];
  const pixelMap = new Map<string, number>();

  let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

  // Если линия более вертикальная, то транспонируем координаты
  if (steep) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
  }

  // Убедимся, что x0 < x1
  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const gradient = dx === 0 ? 1.0 : dy / dx;

  // ===== ПЕРВАЯ КОНЕЧНАЯ ТОЧКА =====
  let xend = Math.round(x0);
  let yend = y0 + gradient * (xend - x0);
  let xgap = rfpart(x0 + 0.5); // расстояние от x начальной координаты до ближайшего пикселя
  const xpxl1 = xend;
  let ypxl1 = Math.floor(yend);

  // Рисуем два вертикальных пикселя в первой конечной точке
  plotWuPixel(pixelMap, xpxl1, ypxl1, steep, rfpart(yend) * xgap);
  plotWuPixel(pixelMap, xpxl1, ypxl1 + 1, steep, fpart(yend) * xgap);

  let intery = yend + gradient; // y-координата на следующей вертикали

  // ===== ВТОРАЯ КОНЕЧНАЯ ТОЧКА =====
  xend = Math.round(x1);
  yend = y1 + gradient * (xend - x1);
  xgap = fpart(x1 + 0.5);
  const xpxl2 = xend;
  let ypxl2 = Math.floor(yend);

  // Рисуем два вертикальных пикселя во второй конечной точке
  plotWuPixel(pixelMap, xpxl2, ypxl2, steep, rfpart(yend) * xgap);
  plotWuPixel(pixelMap, xpxl2, ypxl2 + 1, steep, fpart(yend) * xgap);

  // ===== ОСНОВНОЙ ЦИКЛ МЕЖДУ КОНЕЧНЫМИ ТОЧКАМИ =====
  for (let x = xpxl1 + 1; x < xpxl2; x++) {
    const y = Math.floor(intery);

    // Рисуем два вертикальных пикселя
    // Верхний пиксель получает интенсивность (1 - fractional_part)
    plotWuPixel(pixelMap, x, y, steep, rfpart(intery));
    // Нижний пиксель получает интенсивность fractional_part
    plotWuPixel(pixelMap, x, y + 1, steep, fpart(intery));

    intery += gradient;
  }

  // Преобразуем карту в массив точек
  pixelMap.forEach((intensity, key) => {
    const [x, y] = key.split(',').map(Number);
    points.push({ x, y, intensity });
  });

  return points;
}

function plotWuPixel(
  pixelMap: Map<string, number>,
  x: number,
  y: number,
  steep: boolean,
  intensity: number
): void {
  // Пропускаем пиксели с очень малой интенсивностью
  if (intensity < 0.15) return;

  // Если линия была транспонирована, то транспонируем координаты обратно
  const px = steep ? y : x;
  const py = steep ? x : y;
  const key = `${px},${py}`;

  // Сохраняем максимальную интенсивность для каждого пикселя
  const current = pixelMap.get(key) || 0;
  pixelMap.set(key, Math.max(current, intensity));
}
