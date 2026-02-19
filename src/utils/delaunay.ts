import type { Point } from './polygonUtils';
import { convexHullJarvis } from './polygonUtils';

const EPS = 1e-10;

function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/** Канонический ключ ребра (независимо от порядка a,b) */
function edgeKey(a: Point, b: Point): string {
  const ka = pointKey(a);
  const kb = pointKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/** Векторное произведение (b - a) x (c - a) */
function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Сторона: точка p относительно направленного ребра (a -> b). >0 слева, <0 справа */
function sideOf(a: Point, b: Point, p: Point): number {
  return cross(a, b, p);
}

/** Центр и радиус описанной окружности треугольника (a,b,c). Если коллинеарны — null. */
function circumcircle(
  a: Point,
  b: Point,
  c: Point
): { center: Point; radius: number } | null {
  const d =
    2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < EPS) return null;
  const ux =
    ((a.x * a.x + a.y * a.y) * (b.y - c.y) +
      (b.x * b.x + b.y * b.y) * (c.y - a.y) +
      (c.x * c.x + c.y * c.y) * (a.y - b.y)) /
    d;
  const uy =
    ((a.x * a.x + a.y * a.y) * (c.x - b.x) +
      (b.x * b.x + b.y * b.y) * (a.x - c.x) +
      (c.x * c.x + c.y * c.y) * (b.x - a.x)) /
    d;
  const center = { x: ux, y: uy };
  const radius = Math.hypot(a.x - ux, a.y - uy);
  return { center, radius };
}

/** Строго внутри окружности (на границе не считается) */
function pointInCircle(p: Point, center: Point, radius: number): boolean {
  const d = Math.hypot(p.x - center.x, p.y - center.y);
  return d < radius - EPS;
}

/** Найти сопряжённую точку для ребра (a,b). knownThird — третья вершина известной области (или null для полуплоскости). */
function findConjugate(
  a: Point,
  b: Point,
  points: Point[],
  knownThird: Point | null
): Point | null {
  let best: Point | null = null;
  let bestRadius = Infinity;

  const kSide = knownThird !== null ? sideOf(a, b, knownThird) : 0;

  for (const p of points) {
    if (pointKey(p) === pointKey(a) || pointKey(p) === pointKey(b) || (knownThird && pointKey(p) === pointKey(knownThird)))
      continue;

    const pSide = sideOf(a, b, p);
    if (Math.abs(pSide) < EPS) continue; // p коллинеарна с a и b

    if (knownThird !== null && pSide * kSide >= 0) continue; // p на той же стороне, что и knownThird

    const cc = circumcircle(a, b, p);
    if (!cc) continue;

    const { center, radius } = cc;

    let empty = true;
    for (const q of points) {
      if (pointKey(q) === pointKey(a) || pointKey(q) === pointKey(b) || pointKey(q) === pointKey(p)) continue;
      if (pointInCircle(q, center, radius)) {
        empty = false;
        break;
      }
    }
    if (!empty) continue;

    if (radius < bestRadius) {
      bestRadius = radius;
      best = p;
    }
  }
  return best;
}

/** Шаг отладочного режима триангуляции Делоне */
export interface DelaunayStep {
  stepIndex: number;
  message: string;
  triangles: Point[][];
  liveEdges: Array<{ a: Point; b: Point; knownThird: Point | null }>;
  currentEdge: { a: Point; b: Point } | null;
  conjugatePoint: Point | null;
  newTriangle: Point[] | null;
  circumcenter: Point | null;
  circumRadius: number | null;
}

/** Инкрементальная триангуляция Делоне по методичке: первое ребро оболочки (Джарвис), живые рёбра, сопряжённая точка. */
export function delaunayTriangulation(points: Point[]): Point[][] {
  if (points.length < 3) return [];

  const hull = convexHullJarvis(points);
  if (hull.length < 3) return []; // коллинеарны

  const triangles: Point[][] = [];
  const liveEdges = new Map<string, { a: Point; b: Point; knownThird: Point | null }>();

  const start = hull[0];
  const next = hull[1];
  liveEdges.set(edgeKey(start, next), { a: start, b: next, knownThird: null });

  while (liveEdges.size > 0) {
    const key = liveEdges.keys().next().value as string;
    const { a, b, knownThird } = liveEdges.get(key)!;
    liveEdges.delete(key);

    const p = findConjugate(a, b, points, knownThird);
    if (!p) continue; // граничное ребро — просто убираем

    const tri = [a, b, p];
    triangles.push(tri);

    const toggle = (x: Point, y: Point, third: Point) => {
      const k = edgeKey(x, y);
      if (liveEdges.has(k)) liveEdges.delete(k);
      else liveEdges.set(k, { a: x, b: y, knownThird: third });
    };
    toggle(a, p, b);
    toggle(p, b, a);
  }

  return triangles;
}

/** Триангуляция Делоне с пошаговым выводом для отладки. */
export function delaunayTriangulationSteps(points: Point[]): DelaunayStep[] {
  const steps: DelaunayStep[] = [];
  if (points.length < 3) return steps;

  const hull = convexHullJarvis(points);
  if (hull.length < 3) return steps;

  const triangles: Point[][] = [];
  const liveEdges = new Map<string, { a: Point; b: Point; knownThird: Point | null }>();

  const start = hull[0];
  const next = hull[1];
  liveEdges.set(edgeKey(start, next), { a: start, b: next, knownThird: null });

  steps.push({
    stepIndex: 0,
    message: 'Инициализация: первое ребро выпуклой оболочки',
    triangles: [],
    liveEdges: [{ a: start, b: next, knownThird: null }],
    currentEdge: { a: start, b: next },
    conjugatePoint: null,
    newTriangle: null,
    circumcenter: null,
    circumRadius: null,
  });

  let stepIndex = 1;
  while (liveEdges.size > 0) {
    const key = liveEdges.keys().next().value as string;
    const { a, b, knownThird } = liveEdges.get(key)!;
    liveEdges.delete(key);

    const p = findConjugate(a, b, points, knownThird);
    const liveEdgesArr = Array.from(liveEdges.values());

    if (!p) {
      steps.push({
        stepIndex: stepIndex++,
        message: `Граничное ребро (${a.x},${a.y})–(${b.x},${b.y}): сопряжённая точка не найдена, пропуск`,
        triangles: [...triangles],
        liveEdges: liveEdgesArr,
        currentEdge: { a, b },
        conjugatePoint: null,
        newTriangle: null,
        circumcenter: null,
        circumRadius: null,
      });
      continue;
    }

    const cc = circumcircle(a, b, p);
    const tri = [a, b, p];
    triangles.push(tri);

    const toggle = (x: Point, y: Point, third: Point) => {
      const k = edgeKey(x, y);
      if (liveEdges.has(k)) liveEdges.delete(k);
      else liveEdges.set(k, { a: x, b: y, knownThird: third });
    };
    toggle(a, p, b);
    toggle(p, b, a);

    steps.push({
      stepIndex: stepIndex++,
      message: `Добавлен треугольник (${a.x},${a.y})–(${b.x},${b.y})–(${p.x},${p.y}); сопряжённая точка (${p.x},${p.y})`,
      triangles: [...triangles],
      liveEdges: Array.from(liveEdges.values()),
      currentEdge: { a, b },
      conjugatePoint: p,
      newTriangle: tri,
      circumcenter: cc ? cc.center : null,
      circumRadius: cc ? cc.radius : null,
    });
  }

  steps.push({
    stepIndex: stepIndex,
    message: `Готово: триангуляция из ${triangles.length} треугольников`,
    triangles: [...triangles],
    liveEdges: [],
    currentEdge: null,
    conjugatePoint: null,
    newTriangle: null,
    circumcenter: null,
    circumRadius: null,
  });

  return steps;
}

/** Центр описанной окружности (для Вороного). */
function circumcenter(a: Point, b: Point, c: Point): Point | null {
  const cc = circumcircle(a, b, c);
  return cc ? cc.center : null;
}

/** Ребро треугольника по индексам вершин (0,1), (1,2), (2,0). */
function triangleEdges(tri: Point[]): [Point, Point][] {
  return [
    [tri[0], tri[1]],
    [tri[1], tri[2]],
    [tri[2], tri[0]],
  ];
}

/** Обрезка отрезка/луча по bbox. Возвращает конечный отрезок для отрисовки. */
function clipSegmentToBox(
  start: Point,
  end: Point,
  isRay: boolean,
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
): { start: Point; end: Point } | null {
  let t0 = 0;
  let t1 = isRay ? 1000 : 1;
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const clip = (
    p: number,
    q: number
  ): boolean => {
    if (Math.abs(p) < EPS) {
      if (q < 0) return false;
      return true;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
    return true;
  };

  if (
    !clip(-dx, start.x - bbox.minX) ||
    !clip(dx, bbox.maxX - start.x) ||
    !clip(-dy, start.y - bbox.minY) ||
    !clip(dy, bbox.maxY - start.y)
  )
    return null;

  if (t0 > t1) return null;

  return {
    start: { x: start.x + t0 * dx, y: start.y + t0 * dy },
    end: { x: start.x + t1 * dx, y: start.y + t1 * dy },
  };
}

export interface VoronoiEdge {
  start: Point;
  end: Point;
}

/** Диаграмма Вороного из триангуляции Делоне (двойственный граф). Рёбра обрезаны по bbox. */
export function voronoiFromDelaunay(
  triangles: Point[][],
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
): VoronoiEdge[] {
  const edges: VoronoiEdge[] = [];
  const segmentKey = (s: Point, e: Point) => {
    const ks = pointKey(s);
    const ke = pointKey(e);
    return ks < ke ? `${ks}-${ke}` : `${ke}-${ks}`;
  };

  // edgeKey -> индексы треугольников, содержащих это ребро
  const edgeToTriangles = new Map<string, number[]>();
  for (let i = 0; i < triangles.length; i++) {
    for (const [a, b] of triangleEdges(triangles[i])) {
      const k = edgeKey(a, b);
      if (!edgeToTriangles.has(k)) edgeToTriangles.set(k, []);
      edgeToTriangles.get(k)!.push(i);
    }
  }

  const seenSegments = new Set<string>();

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    const center = circumcenter(tri[0], tri[1], tri[2]);
    if (!center) continue;

    for (const [ea, eb] of triangleEdges(tri)) {
      const k = edgeKey(ea, eb);
      const tris = edgeToTriangles.get(k)!;
      if (tris.length === 2) {
        const j = tris[0] === i ? tris[1] : tris[0];
        const other = triangles[j];
        const otherCenter = circumcenter(other[0], other[1], other[2]);
        if (!otherCenter) continue;
        const segKey = segmentKey(center, otherCenter);
        if (seenSegments.has(segKey)) continue;
        seenSegments.add(segKey);
        const seg = clipSegmentToBox(center, otherCenter, false, bbox);
        if (seg) edges.push(seg);
      } else {
        // ребро оболочки — луч Вороного
        const mid = { x: (ea.x + eb.x) / 2, y: (ea.y + eb.y) / 2 };
        const dx = eb.x - ea.x;
        const dy = eb.y - ea.y;
        const perpX = -dy;
        const perpY = dx;
        // Третья вершина треугольника (не ea и не eb) — она на стороне интерьера
        const p_third = tri.find(
          (v) => pointKey(v) !== pointKey(ea) && pointKey(v) !== pointKey(eb)
        )!;
        const inX = p_third.x - mid.x;
        const inY = p_third.y - mid.y;
        let rx = perpX;
        let ry = perpY;
        // Убедиться, что луч идёт наружу (противоположно от p_third)
        if (rx * inX + ry * inY > 0) {
          rx = -rx;
          ry = -ry;
        }
        const rayEnd = { x: center.x + rx * 500, y: center.y + ry * 500 };
        const seg = clipSegmentToBox(center, rayEnd, true, bbox);
        if (seg) edges.push(seg);
      }
    }
  }

  return edges;
}

/** Шаг отладочного режима диаграммы Вороного */
export interface VoronoiStep {
  stepIndex: number;
  message: string;
  triangles: Point[][];
  voronoiEdges: VoronoiEdge[];
  edgesSoFar: number;
}

/** Диаграмма Вороного пошагово: сначала все треугольники Делоне, затем по одному ребру Вороного. */
export function voronoiFromDelaunaySteps(
  triangles: Point[][],
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
): VoronoiStep[] {
  const steps: VoronoiStep[] = [];
  steps.push({
    stepIndex: 0,
    message: 'Исходная триангуляция Делоне',
    triangles: [...triangles],
    voronoiEdges: [],
    edgesSoFar: 0,
  });

  const edges: VoronoiEdge[] = [];
  const segmentKey = (s: Point, e: Point) => {
    const ks = pointKey(s);
    const ke = pointKey(e);
    return ks < ke ? `${ks}-${ke}` : `${ke}-${ks}`;
  };

  const edgeToTriangles = new Map<string, number[]>();
  for (let i = 0; i < triangles.length; i++) {
    for (const [a, b] of triangleEdges(triangles[i])) {
      const k = edgeKey(a, b);
      if (!edgeToTriangles.has(k)) edgeToTriangles.set(k, []);
      edgeToTriangles.get(k)!.push(i);
    }
  }

  const seenSegments = new Set<string>();
  let stepIndex = 1;

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    const center = circumcenter(tri[0], tri[1], tri[2]);
    if (!center) continue;

    for (const [ea, eb] of triangleEdges(tri)) {
      const k = edgeKey(ea, eb);
      const tris = edgeToTriangles.get(k)!;
      if (tris.length === 2) {
        const j = tris[0] === i ? tris[1] : tris[0];
        const other = triangles[j];
        const otherCenter = circumcenter(other[0], other[1], other[2]);
        if (!otherCenter) continue;
        const segKey = segmentKey(center, otherCenter);
        if (seenSegments.has(segKey)) continue;
        seenSegments.add(segKey);
        const seg = clipSegmentToBox(center, otherCenter, false, bbox);
        if (seg) {
          edges.push(seg);
          steps.push({
            stepIndex: stepIndex++,
            message: `Ребро Вороного между центрами окружностей треугольников ${i + 1} и ${j + 1}`,
            triangles: [...triangles],
            voronoiEdges: [...edges],
            edgesSoFar: edges.length,
          });
        }
      } else {
        const mid = { x: (ea.x + eb.x) / 2, y: (ea.y + eb.y) / 2 };
        const dx = eb.x - ea.x;
        const dy = eb.y - ea.y;
        const perpX = -dy;
        const perpY = dx;
        const p_third = tri.find(
          (v) => pointKey(v) !== pointKey(ea) && pointKey(v) !== pointKey(eb)
        )!;
        const inX = p_third.x - mid.x;
        const inY = p_third.y - mid.y;
        let rx = perpX;
        let ry = perpY;
        if (rx * inX + ry * inY > 0) {
          rx = -rx;
          ry = -ry;
        }
        const rayEnd = { x: center.x + rx * 500, y: center.y + ry * 500 };
        const seg = clipSegmentToBox(center, rayEnd, true, bbox);
        if (seg) {
          edges.push(seg);
          steps.push({
            stepIndex: stepIndex++,
            message: `Граничный луч Вороного от треугольника ${i + 1}`,
            triangles: [...triangles],
            voronoiEdges: [...edges],
            edgesSoFar: edges.length,
          });
        }
      }
    }
  }

  steps.push({
    stepIndex: stepIndex,
    message: `Готово: диаграмма Вороного, ${edges.length} рёбер`,
    triangles: [...triangles],
    voronoiEdges: [...edges],
    edgesSoFar: edges.length,
  });

  return steps;
}
