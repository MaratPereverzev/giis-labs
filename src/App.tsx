import { useState, useCallback, useRef, useEffect } from 'react';
import Lab1 from './labs/lab1/Lab1';
import Lab2 from './labs/lab2/Lab2';
import Lab3 from './labs/lab3/Lab3';
import Lab4 from './labs/lab4/Lab4';
import Lab5, { type Lab5Overlay } from './labs/lab5/Lab5';
import Lab6, { type Lab6Overlay } from './labs/lab6/Lab6';
import Lab7, { type Lab7Overlay } from './labs/lab7/Lab7';
import type { Point } from './utils/lineDrawing';
import { getInnerNormals, fillPolygonScanlineAET } from './utils/polygonUtils';
import './App.css';

type Lab = 'none' | 'lab1' | 'lab2' | 'lab3' | 'lab4' | 'lab5' | 'lab6' | 'lab7';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIXEL_SIZE = 10;

interface DrawnCurve {
  points: Array<Point & { color?: string }>;
  title: string;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeLab, setActiveLab] = useState<Lab>('none');
  const [controlPoints, setControlPoints] = useState<Point[]>([]);
  const [drawnCurves, setDrawnCurves] = useState<DrawnCurve[]>([]);
  const [lab5Overlay, setLab5Overlay] = useState<Lab5Overlay | null>(null);
  const [lab6Overlay, setLab6Overlay] = useState<Lab6Overlay | null>(null);
  const [lab7Overlay, setLab7Overlay] = useState<Lab7Overlay | null>(null);

  // Очистить точки и overlay при смене лабораторной работы
  useEffect(() => {
    setControlPoints([]);
    setDrawnCurves([]);
    if (activeLab !== 'lab5') setLab5Overlay(null);
    if (activeLab !== 'lab6') setLab6Overlay(null);
    if (activeLab !== 'lab7') setLab7Overlay(null);
  }, [activeLab]);

  // Отрисовка холста (для лабы 4 рисует сам Lab4 на этом же холсте)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (activeLab === 'lab4') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Функция для рисования пикселя (внутри useEffect чтобы не создавать зависимости)
    const drawPixelFn = (x: number, y: number, color: string = '#000000') => {
      ctx.fillStyle = color;
      ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    };

    // Фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Сетка
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += PIXEL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += PIXEL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Отрисовка уже нарисованных кривых (пиксели)
    if (drawnCurves.length > 0) {
      const curve = drawnCurves[drawnCurves.length - 1];
      curve.points.forEach((point: any) => {
        const color = point.color || '#000000';
        drawPixelFn(point.x, point.y, color);
      });
    }

    // Отрисовка контрольных точек (без номеров), кроме lab6/lab7 — там точки рисуются в своих блоках
    if (activeLab !== 'lab6' && activeLab !== 'lab7') {
      controlPoints.forEach((point) => {
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        ctx.arc(point.x * PIXEL_SIZE + PIXEL_SIZE / 2,
                point.y * PIXEL_SIZE + PIXEL_SIZE / 2,
                4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Лаба 5: полигон, выпуклая оболочка, нормали, заливка, точка, пересечения
    if (activeLab === 'lab5' && lab5Overlay) {
      const { polygon, hull, showNormals, fillPolygon, testPoint, pointInside, intersections } = lab5Overlay;
      const toX = (x: number) => x * PIXEL_SIZE + PIXEL_SIZE / 2;
      const toY = (y: number) => y * PIXEL_SIZE + PIXEL_SIZE / 2;

      if (fillPolygon && polygon.length >= 3) {
        const fillPixels = fillPolygonScanlineAET(polygon);
        ctx.fillStyle = 'rgba(41, 128, 185, 0.35)';
        fillPixels.forEach((p) => {
          ctx.fillRect(p.x * PIXEL_SIZE, p.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        });
      }

      if (polygon.length >= 2) {
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toX(polygon[0].x), toY(polygon[0].y));
        for (let i = 1; i < polygon.length; i++) {
          ctx.lineTo(toX(polygon[i].x), toY(polygon[i].y));
        }
        ctx.closePath();
        ctx.stroke();
      }

      if (hull && hull.length >= 2) {
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(toX(hull[0].x), toY(hull[0].y));
        for (let i = 1; i < hull.length; i++) {
          ctx.lineTo(toX(hull[i].x), toY(hull[i].y));
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (showNormals && polygon.length >= 3) {
        const normals = getInnerNormals(polygon);
        const len = 15;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1;
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i];
          const b = polygon[(i + 1) % polygon.length];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const n = normals[i];
          ctx.beginPath();
          ctx.moveTo(toX(mx), toY(my));
          ctx.lineTo(toX(mx + n.x * len), toY(my + n.y * len));
          ctx.stroke();
        }
      }

      if (testPoint !== null) {
        ctx.fillStyle = pointInside === true ? '#27ae60' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(toX(testPoint.x), toY(testPoint.y), 5, 0, Math.PI * 2);
        ctx.fill();
      }

      intersections.forEach((p) => {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(toX(p.x), toY(p.y), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Лаба 6: точки, триангуляция Делоне, диаграмма Вороного, отладочные шаги
    if (activeLab === 'lab6' && lab6Overlay) {
      const toX = (x: number) => x * PIXEL_SIZE + PIXEL_SIZE / 2;
      const toY = (y: number) => y * PIXEL_SIZE + PIXEL_SIZE / 2;
      const { points: lab6Points, triangles: lab6Triangles, voronoiEdges: lab6Voronoi, debug } = lab6Overlay;

      // Заливка областей Вороного ближайшей точкой (только для режима Вороного)
      if (lab6Overlay.kind === 'voronoi' && lab6Points.length > 0) {
        const palette = lab6Points.map(
          (_, i) => `hsl(${Math.round((i / lab6Points.length) * 360)}, 65%, 75%)`
        );
        const cols = CANVAS_WIDTH / PIXEL_SIZE;
        const rows = CANVAS_HEIGHT / PIXEL_SIZE;
        for (let cy = 0; cy < rows; cy++) {
          for (let cx = 0; cx < cols; cx++) {
            let minD = Infinity;
            let minIdx = 0;
            for (let pi = 0; pi < lab6Points.length; pi++) {
              const d = Math.hypot(cx - lab6Points[pi].x, cy - lab6Points[pi].y);
              if (d < minD) { minD = d; minIdx = pi; }
            }
            ctx.fillStyle = palette[minIdx];
            ctx.fillRect(cx * PIXEL_SIZE, cy * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
          }
        }
        // Перерисовать сетку поверх заливки
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= CANVAS_WIDTH; x += PIXEL_SIZE) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += PIXEL_SIZE) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }
      }

      if (lab6Triangles.length > 0) {
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        for (const tri of lab6Triangles) {
          ctx.beginPath();
          ctx.moveTo(toX(tri[0].x), toY(tri[0].y));
          ctx.lineTo(toX(tri[1].x), toY(tri[1].y));
          ctx.lineTo(toX(tri[2].x), toY(tri[2].y));
          ctx.closePath();
          ctx.stroke();
        }
      }

      if (lab6Voronoi.length > 0) {
        ctx.strokeStyle = '#8e44ad';
        ctx.lineWidth = 2;
        for (const e of lab6Voronoi) {
          ctx.beginPath();
          ctx.moveTo(toX(e.start.x), toY(e.start.y));
          ctx.lineTo(toX(e.end.x), toY(e.end.y));
          ctx.stroke();
        }
      }

      if (debug?.stepMode && debug.kind === 'delaunay' && debug.delaunaySteps[debug.currentStepIndex]) {
        const step = debug.delaunaySteps[debug.currentStepIndex] as import('./utils/delaunay').DelaunayStep;
        if (step.circumcenter && step.circumRadius != null) {
          ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(toX(step.circumcenter.x), toY(step.circumcenter.y), step.circumRadius * PIXEL_SIZE, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (step.currentEdge) {
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(toX(step.currentEdge.a.x), toY(step.currentEdge.a.y));
          ctx.lineTo(toX(step.currentEdge.b.x), toY(step.currentEdge.b.y));
          ctx.stroke();
        }
        if (step.conjugatePoint) {
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.arc(toX(step.conjugatePoint.x), toY(step.conjugatePoint.y), 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      lab6Points.forEach((p) => {
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        ctx.arc(toX(p.x), toY(p.y), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Лаба 7: 2D отсечение и 3D алгоритм Робертса
    if (activeLab === 'lab7' && lab7Overlay) {
      const toX = (x: number) => x * PIXEL_SIZE + PIXEL_SIZE / 2;
      const toY = (y: number) => y * PIXEL_SIZE + PIXEL_SIZE / 2;

      if (lab7Overlay.mode === '2d') {
        const { inputSegments, clippingWindow, clippedSegments, pendingPoint, drawMode } = lab7Overlay;

        // Draw clipping window rectangle
        if (clippingWindow) {
          ctx.strokeStyle = '#e67e22';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(
            toX(clippingWindow.x1) - PIXEL_SIZE / 2,
            toY(clippingWindow.y1) - PIXEL_SIZE / 2,
            (clippingWindow.x2 - clippingWindow.x1) * PIXEL_SIZE,
            (clippingWindow.y2 - clippingWindow.y1) * PIXEL_SIZE,
          );
          ctx.setLineDash([]);
        }

        // Draw input segments (original, grey dashed)
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        for (const seg of inputSegments) {
          ctx.beginPath();
          ctx.moveTo(toX(seg.start.x), toY(seg.start.y));
          ctx.lineTo(toX(seg.end.x), toY(seg.end.y));
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // Draw clipped (visible) portions in green
        if (clippedSegments.length > 0) {
          ctx.strokeStyle = '#27ae60';
          ctx.lineWidth = 3;
          for (const seg of clippedSegments) {
            ctx.beginPath();
            ctx.moveTo(toX(seg.start.x), toY(seg.start.y));
            ctx.lineTo(toX(seg.end.x), toY(seg.end.y));
            ctx.stroke();
          }
        }

        // Draw control points (segment endpoints)
        if (drawMode === 'segment') {
          for (let i = 0; i < controlPoints.length; i++) {
            const p = controlPoints[i];
            ctx.fillStyle = i % 2 === 0 ? '#2980b9' : '#8e44ad';
            ctx.beginPath();
            ctx.arc(toX(p.x), toY(p.y), 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw pending first-click indicator
        if (pendingPoint) {
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(toX(pendingPoint.x), toY(pendingPoint.y), 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw window corner indicators
        if (drawMode === 'window' && controlPoints.length >= 1) {
          controlPoints.slice(0, 2).forEach((p) => {
            ctx.fillStyle = '#e67e22';
            ctx.beginPath();
            ctx.arc(toX(p.x), toY(p.y), 5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      if (lab7Overlay.mode === '3d' && lab7Overlay.cube3d) {
        const { projectedFaces, showHidden } = lab7Overlay.cube3d;
        const toCX = (gx: number) => gx * PIXEL_SIZE + PIXEL_SIZE / 2;
        const toCY = (gy: number) => gy * PIXEL_SIZE + PIXEL_SIZE / 2;

        const tracePath = (points: { x: number; y: number }[]) => {
          ctx.beginPath();
          ctx.moveTo(toCX(points[0].x), toCY(points[0].y));
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(toCX(points[i].x), toCY(points[i].y));
          }
          ctx.closePath();
        };

        // 1. Fill visible faces (light blue tint) — drawn first so strokes go on top
        for (const face of projectedFaces) {
          if (!face.visible) continue;
          tracePath(face.points);
          ctx.fillStyle = 'rgba(52, 152, 219, 0.18)';
          ctx.fill();
        }

        // 2. Hidden face edges — dashed grey, drawn under solid outlines
        if (showHidden) {
          ctx.strokeStyle = '#aab7c0';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          for (const face of projectedFaces) {
            if (face.visible) continue;
            tracePath(face.points);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        // 3. Visible face outlines — solid blue on top
        ctx.strokeStyle = '#2471a3';
        ctx.lineWidth = 2.5;
        for (const face of projectedFaces) {
          if (!face.visible) continue;
          tracePath(face.points);
          ctx.stroke();
        }

        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }
    }
  }, [controlPoints, drawnCurves, activeLab, lab5Overlay, lab6Overlay, lab7Overlay]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeLab === 'lab4') return;
    if (activeLab === 'lab7' && lab7Overlay?.mode === '3d') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const x = Math.round(canvasX / PIXEL_SIZE - 0.5);
    const y = Math.round(canvasY / PIXEL_SIZE - 0.5);

    if (x >= 0 && x < CANVAS_WIDTH / PIXEL_SIZE && y >= 0 && y < CANVAS_HEIGHT / PIXEL_SIZE) {
      // In Lab7 window mode keep only the last 2 points (re-define the window)
      if (activeLab === 'lab7' && lab7Overlay?.drawMode === 'window') {
        const existing = controlPoints.length >= 2 ? [] : controlPoints;
        setControlPoints([...existing, { x, y }]);
      } else {
        setControlPoints([...controlPoints, { x, y }]);
      }
    }
  };

  const handleClearPoints = () => {
    setControlPoints([]);
  };

  const handleCurveApply = useCallback((points: Point[], title: string) => {
    // Заменяем кривую (не накапливаем)
    setDrawnCurves([{ points, title }]);
    // Очищаем контрольные точки после рисования
    setControlPoints([]);
  }, []);

  return (
    <div className="app">
      <div className="sidebar-left">
        <h2>Лабораторные работы</h2>
        <div className="lab-selector">
          <button
            className={`lab-btn ${activeLab === 'lab1' ? 'active' : ''}`}
            onClick={() => setActiveLab('lab1')}
          >
            Лабораторная 1
            <span className="desc">Линии</span>
          </button>
          <button
            className={`lab-btn ${activeLab === 'lab2' ? 'active' : ''}`}
            onClick={() => setActiveLab('lab2')}
          >
            Лабораторная 2
            <span className="desc">Кривые 2-го порядка</span>
          </button>
          <button
            className={`lab-btn ${activeLab === 'lab3' ? 'active' : ''}`}
            onClick={() => setActiveLab('lab3')}
          >
            Лабораторная 3
            <span className="desc">Интерполяция</span>
          </button>
          <button
            className={`lab-btn ${activeLab === 'lab4' ? 'active' : ''}`}
            onClick={() => setActiveLab('lab4')}
          >
            Лабораторная 4
            <span className="desc">Геометрические преобразования</span>
          </button>
          <button
            className={`lab-btn ${activeLab === 'lab5' ? 'active' : ''}`}
            onClick={() => setActiveLab('lab5')}
          >
            Лабораторная 5
            <span className="desc">Предварительная обработка полигонов</span>
          </button>
          <button
            className={`lab-btn ${activeLab === 'lab6' ? 'active' : ''}`}
            onClick={() => setActiveLab('lab6')}
          >
            Лабораторная 6
            <span className="desc">Делоне и Вороного</span>
          </button>
          <button
            className={`lab-btn ${activeLab === 'lab7' ? 'active' : ''}`}
            onClick={() => setActiveLab('lab7')}
          >
            Лабораторная 7
            <span className="desc">Отсечение и видимость</span>
          </button>
        </div>
      </div>

      <div className="canvas-area">
        <div className="canvas-container">
          <h1>Графический редактор</h1>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="main-canvas"
            onClick={handleCanvasClick}
          />
          <p className="canvas-hint">
            {activeLab === 'none' && 'Выберите лабораторную работу слева'}
            {activeLab === 'lab4' && 'Загрузите 3D-объект и управляйте преобразованиями с клавиатуры (панель справа)'}
            {activeLab === 'lab5' && 'Выберите режим справа: добавление полигона, отрезок или точка. Кликайте по холсту.'}
            {activeLab !== 'none' && activeLab !== 'lab4' && activeLab !== 'lab5' && activeLab !== 'lab6' && `Нажимайте на холст для добавления контрольных точек (${controlPoints.length})`}
            {activeLab === 'lab6' && 'Расставьте минимум 3 точки, затем нажмите кнопку Делоне или Вороного в панели справа.'}
            {activeLab === 'lab7' && lab7Overlay?.mode !== '3d' && (
              lab7Overlay?.drawMode === 'window'
                ? 'Кликните 2 точки для задания окна отсечения.'
                : 'Кликайте для добавления отрезков (нечётный клик — начало, чётный — конец).'
            )}
            {activeLab === 'lab7' && lab7Overlay?.mode === '3d' && 'Используйте стрелки ↑↓←→ для вращения куба. Синие грани — видимые, пунктир — скрытые рёбра.'}
          </p>
        </div>

        <div className="bottom-panel">
          <div className="points-info">
            <strong>Контрольные точки:</strong> {controlPoints.length}
            {controlPoints.length > 0 && (
              <button className="small-btn" onClick={handleClearPoints}>
                Очистить точки
              </button>
            )}
          </div>
        </div>
      </div>

      {activeLab !== 'none' && (
        <div className="sidebar-right">
          {activeLab === 'lab1' && <Lab1 controlPoints={controlPoints} onCurveApply={handleCurveApply} />}
          {activeLab === 'lab2' && <Lab2 controlPoints={controlPoints} onCurveApply={handleCurveApply} />}
          {activeLab === 'lab3' && <Lab3 controlPoints={controlPoints} onAlgorithmApply={handleCurveApply} />}
          {activeLab === 'lab4' && (
            <Lab4
              mainCanvasRef={canvasRef}
              canvasWidth={CANVAS_WIDTH}
              canvasHeight={CANVAS_HEIGHT}
            />
          )}
          {activeLab === 'lab5' && (
            <Lab5
              controlPoints={controlPoints}
              setControlPoints={setControlPoints}
              onCurveApply={handleCurveApply}
              setLab5Overlay={setLab5Overlay}
            />
          )}
          {activeLab === 'lab6' && (
            <Lab6
              controlPoints={controlPoints}
              setLab6Overlay={setLab6Overlay}
            />
          )}
          {activeLab === 'lab7' && (
            <Lab7
              controlPoints={controlPoints}
              setControlPoints={setControlPoints}
              setLab7Overlay={setLab7Overlay}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
