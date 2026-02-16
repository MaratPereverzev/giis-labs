import { useState, useCallback, useRef, useEffect } from 'react';
import Lab1 from './labs/lab1/Lab1';
import Lab2 from './labs/lab2/Lab2';
import Lab3 from './labs/lab3/Lab3';
import Lab4 from './labs/lab4/Lab4';
import Lab5, { type Lab5Overlay } from './labs/lab5/Lab5';
import type { Point } from './utils/lineDrawing';
import { getInnerNormals } from './utils/polygonUtils';
import './App.css';

type Lab = 'none' | 'lab1' | 'lab2' | 'lab3' | 'lab4' | 'lab5';

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

  // Очистить точки и overlay при смене лабораторной работы
  useEffect(() => {
    setControlPoints([]);
    setDrawnCurves([]);
    if (activeLab !== 'lab5') setLab5Overlay(null);
  }, [activeLab]);

  // Отрисовка холста
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    // Отрисовка контрольных точек (без номеров)
    controlPoints.forEach((point) => {
      ctx.fillStyle = '#0066cc';
      ctx.beginPath();
      ctx.arc(point.x * PIXEL_SIZE + PIXEL_SIZE / 2, 
              point.y * PIXEL_SIZE + PIXEL_SIZE / 2, 
              4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Лаба 5: полигон, выпуклая оболочка, нормали, точка, пересечения
    if (activeLab === 'lab5' && lab5Overlay) {
      const { polygon, hull, showNormals, testPoint, pointInside, intersections } = lab5Overlay;
      const toX = (x: number) => x * PIXEL_SIZE + PIXEL_SIZE / 2;
      const toY = (y: number) => y * PIXEL_SIZE + PIXEL_SIZE / 2;

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
  }, [controlPoints, drawnCurves, activeLab, lab5Overlay]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      setControlPoints([...controlPoints, { x, y }]);
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
            {activeLab !== 'none' && activeLab !== 'lab4' && activeLab !== 'lab5' && `Нажимайте на холст для добавления контрольных точек (${controlPoints.length})`}
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
          {activeLab === 'lab4' && <Lab4 />}
          {activeLab === 'lab5' && (
            <Lab5
              controlPoints={controlPoints}
              setControlPoints={setControlPoints}
              onCurveApply={handleCurveApply}
              setLab5Overlay={setLab5Overlay}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
