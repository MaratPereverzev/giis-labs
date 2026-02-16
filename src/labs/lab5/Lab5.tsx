import { useState, useEffect, useCallback } from 'react';
import {
  isConvex,
  convexHullGraham,
  convexHullJarvis,
  segmentPolygonIntersections,
  pointInPolygon,
  type Point,
} from '../../utils/polygonUtils';
import { drawLineBresenham } from '../../utils/lineDrawing';
import './Lab5.css';

export type ConvexHullMethod = 'graham' | 'jarvis';

export interface Lab5Overlay {
  polygon: Point[];
  hull: Point[] | null;
  showNormals: boolean;
  testPoint: Point | null;
  pointInside: boolean | null;
  lineSegment: [Point, Point] | null;
  intersections: Point[];
}

interface Lab5Props {
  controlPoints: Point[];
  setControlPoints: (points: Point[]) => void;
  onCurveApply: (points: Point[], title: string) => void;
  setLab5Overlay: (data: Lab5Overlay) => void;
}

type Mode = 'polygon' | 'line' | 'point' | null;

export function Lab5({
  controlPoints,
  setControlPoints,
  onCurveApply,
  setLab5Overlay,
}: Lab5Props) {
  const [polygon, setPolygon] = useState<Point[]>([]);
  const [hull, setHull] = useState<Point[] | null>(null);
  const [showNormals, setShowNormals] = useState(false);
  const [hullMethod, setHullMethod] = useState<ConvexHullMethod>('graham');
  const [mode, setMode] = useState<Mode>(null);
  const [lineSegment, setLineSegment] = useState<[Point, Point] | null>(null);
  const [testPoint, setTestPoint] = useState<Point | null>(null);
  const [pointInside, setPointInside] = useState<boolean | null>(null);
  const [intersections, setIntersections] = useState<Point[]>([]);

  const convex = polygon.length >= 3 ? isConvex(polygon) : null;

  // Синхронизация overlay с App для отрисовки полигона, оболочки, нормалей и т.д.
  useEffect(() => {
    setLab5Overlay({
      polygon,
      hull,
      showNormals,
      testPoint,
      pointInside,
      lineSegment,
      intersections,
    });
  }, [
    polygon,
    hull,
    showNormals,
    testPoint,
    pointInside,
    lineSegment,
    intersections,
    setLab5Overlay,
  ]);

  // Обработка кликов: в режиме полигона/линии/точки забираем controlPoints и очищаем
  useEffect(() => {
    if (mode === null || controlPoints.length === 0) return;

    if (mode === 'polygon') {
      const newPoint = controlPoints[controlPoints.length - 1];
      setPolygon((prev) => [...prev, newPoint]);
      setControlPoints([]);
      setHull(null);
    } else if (mode === 'line' && controlPoints.length >= 2) {
      const p1 = controlPoints[0];
      const p2 = controlPoints[1];
      setLineSegment([p1, p2]);
      const pts = drawLineBresenham(p1.x, p1.y, p2.x, p2.y);
      onCurveApply(pts, 'Отрезок');
      if (polygon.length >= 3) {
        const ints = segmentPolygonIntersections(p1, p2, polygon);
        setIntersections(ints);
      } else {
        setIntersections([]);
      }
      setControlPoints([]);
    } else if (mode === 'point' && controlPoints.length >= 1) {
      const pt = controlPoints[0];
      setTestPoint(pt);
      setPointInside(polygon.length >= 3 ? pointInPolygon(pt, polygon) : null);
      setControlPoints([]);
    }
  }, [
    mode,
    controlPoints,
    polygon,
    setControlPoints,
    onCurveApply,
  ]);

  const handleBuildHull = useCallback(() => {
    if (polygon.length < 3) {
      alert('Добавьте минимум 3 точки в полигон');
      return;
    }
    const h = hullMethod === 'graham' ? convexHullGraham(polygon) : convexHullJarvis(polygon);
    setHull(h);
  }, [polygon, hullMethod]);

  const handleCheckConvexity = useCallback(() => {
    if (polygon.length < 3) {
      alert('Добавьте минимум 3 точки в полигон');
      return;
    }
    alert(isConvex(polygon) ? 'Полигон выпуклый' : 'Полигон невыпуклый');
  }, [polygon]);

  const handleClearPolygon = useCallback(() => {
    setPolygon([]);
    setHull(null);
    setLineSegment(null);
    setTestPoint(null);
    setPointInside(null);
    setIntersections([]);
    setControlPoints([]);
  }, [setControlPoints]);

  return (
    <div className="lab5-panel">
      <h3>Предварительная обработка полигонов</h3>

      {/* Панель инструментов «Построение полигонов» */}
      <div className="lab5-toolbar">
        <span className="lab5-toolbar-title">Построение полигонов</span>

        <div className="control-group">
          <label>Метод выпуклой оболочки:</label>
          <div className="method-buttons">
            <button
              className={`method-btn ${hullMethod === 'graham' ? 'active' : ''}`}
              onClick={() => setHullMethod('graham')}
            >
              Грэхем
            </button>
            <button
              className={`method-btn ${hullMethod === 'jarvis' ? 'active' : ''}`}
              onClick={() => setHullMethod('jarvis')}
            >
              Джарвис
            </button>
          </div>
        </div>

        <div className="control-group lab5-mode-buttons">
          <label>Режим:</label>
          <div className="method-buttons">
            <button
              className={`method-btn ${mode === 'polygon' ? 'active' : ''}`}
              onClick={() => setMode('polygon')}
            >
              Добавить полигон
            </button>
            <button
              className={`method-btn ${mode === 'line' ? 'active' : ''}`}
              onClick={() => setMode('line')}
            >
              Отрезок (2 точки)
            </button>
            <button
              className={`method-btn ${mode === 'point' ? 'active' : ''}`}
              onClick={() => setMode('point')}
            >
              Точка в полигоне
            </button>
          </div>
        </div>

        <button className="apply-btn" onClick={handleBuildHull}>
          Построить выпуклую оболочку
        </button>

        <button className="small-btn" onClick={handleCheckConvexity}>
          Проверить выпуклость
        </button>

        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showNormals}
              onChange={(e) => setShowNormals(e.target.checked)}
            />
            Показать внутренние нормали
          </label>
        </div>

        <button className="small-btn danger" onClick={handleClearPolygon}>
          Очистить всё
        </button>
      </div>

      {/* Линия первого порядка (лаба 1): рисуем отрезок по 2 точкам */}
      <div className="lab5-section">
        <h4>Линия первого порядка</h4>
        <p className="lab5-hint">
          Режим «Отрезок (2 точки)» рисует отрезок алгоритмом Брезенхема и находит точки пересечения со сторонами полигона.
        </p>
      </div>

      {/* Статус */}
      <div className="lab5-status">
        <p><strong>Вершин полигона:</strong> {polygon.length}</p>
        {convex !== null && (
          <p><strong>Выпуклость:</strong> {convex ? 'выпуклый' : 'невыпуклый'}</p>
        )}
        {hull !== null && <p><strong>Оболочка:</strong> {hull.length} вершин ({hullMethod === 'graham' ? 'Грэхем' : 'Джарвис'})</p>}
        {testPoint !== null && pointInside !== null && (
          <p><strong>Точка ({testPoint.x}, {testPoint.y}):</strong> {pointInside ? 'внутри' : 'снаружи'}</p>
        )}
        {intersections.length > 0 && (
          <p><strong>Пересечений с отрезком:</strong> {intersections.length}</p>
        )}
      </div>
    </div>
  );
}

export default Lab5;
