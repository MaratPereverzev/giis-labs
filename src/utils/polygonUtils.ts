/** Точка на плоскости (целочисленная сетка как в лабе 1) */
export interface Point {
  x: number;
  y: number;
}

/** Вектор (для нормалей) */
export interface Vec2 {
  x: number;
  y: number;
}

/** Проверка полигона на выпуклость (по знаку векторного произведения последовательных рёбер) */
export function isConvex(vertices: Point[]): boolean {
  const n = vertices.length;
  if (n < 3) return false;
  let sign: number | null = null;
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const c = vertices[(i + 2) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === null) sign = s;
    else if (sign !== s) return false;
  }
  return true;
}

/** Внутренняя нормаль к ребру (направлена внутрь полигона). Ребро от vertices[i] до vertices[(i+1)%n]. */
export function getInnerNormals(vertices: Point[]): Vec2[] {
  const n = vertices.length;
  if (n < 3) return [];
  const normals: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Внешняя нормаль ребра (перпендикуляр): (-dy, dx) или (dy, -dx). Выбираем ту, что смотрит внутрь.
    const nx = -dy / len;
    const ny = dx / len;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const cx = vertices.reduce((s, p) => s + p.x, 0) / n;
    const cy = vertices.reduce((s, p) => s + p.y, 0) / n;
    const toCenterX = cx - midX;
    const toCenterY = cy - midY;
    const dot = nx * toCenterX + ny * toCenterY;
    if (dot > 0) normals.push({ x: nx, y: ny });
    else normals.push({ x: -nx, y: -ny });
  }
  return normals;
}

/** Полярный угол от точки from до точки p (в радианах, для сортировки) */
function polarAngle(from: Point, p: Point): number {
  return Math.atan2(p.y - from.y, p.x - from.x);
}

/** Нижняя левая точка (минимальная y, при равенстве минимальная x) */
function lowestLeft(points: Point[]): Point {
  let best = points[0];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.y < best.y || (p.y === best.y && p.x < best.x)) best = p;
  }
  return best;
}

/** Векторное произведение (b - a) x (c - a) */
function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Выпуклая оболочка — метод Грэхема (Graham scan) */
export function convexHullGraham(points: Point[]): Point[] {
  if (points.length < 3) return [...points];
  const start = lowestLeft(points);
  const sorted = points
    .filter((p) => p !== start)
    .slice()
    .sort((a, b) => {
      const angleA = polarAngle(start, a);
      const angleB = polarAngle(start, b);
      if (Math.abs(angleA - angleB) < 1e-10) {
        const distA = (a.x - start.x) ** 2 + (a.y - start.y) ** 2;
        const distB = (b.x - start.x) ** 2 + (b.y - start.y) ** 2;
        return distA - distB;
      }
      return angleA - angleB;
    });
  const stack: Point[] = [start];
  for (const p of sorted) {
    while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
      stack.pop();
    }
    stack.push(p);
  }
  return stack;
}

/** Выпуклая оболочка — метод Джарвиса (Jarvis march / gift wrapping) */
export function convexHullJarvis(points: Point[]): Point[] {
  if (points.length < 3) return [...points];
  const start = lowestLeft(points);
  const hull: Point[] = [start];
  let current = start;
  for (;;) {
    let next = points[0];
    for (const p of points) {
      if (p === current) continue;
      const c = cross(current, next, p);
      if (c > 0) next = p;
      else if (c === 0) {
        const dCur = (next.x - current.x) ** 2 + (next.y - current.y) ** 2;
        const dP = (p.x - current.x) ** 2 + (p.y - current.y) ** 2;
        if (dP > dCur) next = p;
      }
    }
    if (next === start) break;
    hull.push(next);
    current = next;
  }
  return hull;
}

/** Пересечение двух отрезков (a1-a2) и (b1-b2). Возвращает точку пересечения или null. */
export function segmentSegmentIntersection(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): Point | null {
  const dax = a2.x - a1.x;
  const day = a2.y - a1.y;
  const dbx = b2.x - b1.x;
  const dby = b2.y - b1.y;
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / denom;
  const u = ((b1.x - a1.x) * day - (b1.y - a1.y) * dax) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: Math.round(a1.x + t * dax),
      y: Math.round(a1.y + t * day),
    };
  }
  return null;
}

/** Точки пересечения отрезка (segStart, segEnd) со сторонами полигона */
export function segmentPolygonIntersections(
  segStart: Point,
  segEnd: Point,
  polygon: Point[]
): Point[] {
  const out: Point[] = [];
  const n = polygon.length;
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const p = segmentSegmentIntersection(segStart, segEnd, a, b);
    if (p) {
      const key = `${p.x},${p.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(p);
      }
    }
  }
  return out;
}

/** Принадлежность точки полигону (метод ray casting: луч вправо) */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  let inside = false;
  const x = point.x;
  const y = point.y;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Элемент глобальной таблицы рёбер (GET) для алгоритма AET */
interface ScanlineEdge {
  yMin: number;
  yMax: number;
  xAtYMin: number;
  dxPerScan: number;
}

/**
 * Заполнение полигона методом построчного сканирования со списком активных рёбер (AET)
 * и затравочным методом: на каждой сканирующей строке заполняются отрезки между парами
 * пересечений с рёбрами полигона (внутренность — между нечётным и чётным пересечением).
 * Возвращает массив координат пикселей (в сетке полигона) для заливки.
 */
export function fillPolygonScanlineAET(polygon: Point[]): Point[] {
  const n = polygon.length;
  if (n < 3) return [];

  const pixels: Point[] = [];
  const get: ScanlineEdge[] = [];

  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const y1 = Math.round(a.y);
    const y2 = Math.round(b.y);
    if (y1 === y2) continue; // горизонтальное ребро не участвует в AET
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);
    const xAtYMin = y1 < y2 ? a.x : b.x;
    const dxPerScan = (b.x - a.x) / (b.y - a.y);
    get.push({ yMin, yMax, xAtYMin, dxPerScan });
  }

  if (get.length === 0) return [];

  const yMinGlobal = Math.min(...get.map((e) => e.yMin));
  const yMaxGlobal = Math.max(...get.map((e) => e.yMax));

  // Активный список рёбер (AET): обновляем на каждой строке сканирования
  type AETEntry = { x: number; yMax: number; dxPerScan: number };
  let aet: AETEntry[] = [];

  for (let y = yMinGlobal; y <= yMaxGlobal; y++) {
    // Добавить в AET рёбра, у которых yMin === y
    for (const e of get) {
      if (e.yMin === y) {
        aet.push({
          x: e.xAtYMin,
          yMax: e.yMax,
          dxPerScan: e.dxPerScan,
        });
      }
    }

    // Удалить из AET рёбра, у которых yMax === y (уже обработали последнюю строку ребра)
    aet = aet.filter((e) => e.yMax > y);

    // Сортировать AET по x (текущая координата пересечения с текущей строкой)
    aet.sort((u, v) => u.x - v.x);

    // Затравочное заполнение: между парами пересечений (x1,x2), (x3,x4), ...
    for (let k = 0; k < aet.length - 1; k += 2) {
      const xStart = Math.ceil(aet[k].x);
      const xEnd = Math.floor(aet[k + 1].x);
      for (let x = xStart; x <= xEnd; x++) {
        pixels.push({ x, y });
      }
    }

    // Обновить x для следующей строки: x += dxPerScan
    for (const e of aet) {
      e.x += e.dxPerScan;
    }
  }

  return pixels;
}
