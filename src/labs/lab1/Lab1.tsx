import { useState, useRef, useEffect, useCallback } from 'react';
import { drawLineDDA, drawLineBresenham, drawLineWu, type Point } from '../../utils/lineDrawing';
import './Lab1.css';

type Algorithm = 'dda' | 'bresenham' | 'wu';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIXEL_SIZE = 10;

export function Lab1() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm>('bresenham');
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);

  // Draw a single grid pixel (with padding)
  const drawPixel = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string = '#000'
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * PIXEL_SIZE + 1, y * PIXEL_SIZE + 1, PIXEL_SIZE - 2, PIXEL_SIZE - 2);
  };

  // Render pixel grid and white background
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
  };

  // Redraw the whole canvas (grid, points, line)
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx);

    if (startPoint) drawPixel(ctx, startPoint.x, startPoint.y, '#00aa00');
    if (endPoint) drawPixel(ctx, endPoint.x, endPoint.y, '#ff0000');

    if (startPoint && endPoint) {
      let points: Point[] | Array<Point & { intensity: number }> = [];
      if (algorithm === 'dda') points = drawLineDDA(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      else if (algorithm === 'bresenham') points = drawLineBresenham(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      else points = drawLineWu(startPoint.x, startPoint.y, endPoint.x, endPoint.y);

      points.forEach((point) => {
        const p = point as Point & { intensity?: number };
        if (algorithm === 'wu' && p.intensity !== undefined) {
          drawPixel(ctx, p.x, p.y, `rgba(0,0,0,${p.intensity})`);
        } else {
          drawPixel(ctx, p.x, p.y, '#000000');
        }
      });
    }
  }, [startPoint, endPoint, algorithm]);

  // Convert mouse event to grid coordinates, accounting for canvas CSS scaling
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const x = Math.floor(canvasX / PIXEL_SIZE);
    const y = Math.floor(canvasY / PIXEL_SIZE);

    // Click flow: first click = start, second = end, third = start new
    if (!startPoint) {
      setStartPoint({ x, y });
      setEndPoint(null);
    } else if (!endPoint) {
      setEndPoint({ x, y });
    } else {
      setStartPoint({ x, y });
      setEndPoint(null);
    }
  };

  const handleClear = () => {
    setStartPoint(null);
    setEndPoint(null);
  };

  useEffect(() => {
    redraw();
  }, [redraw]);

  return (
    <div className="lab1-container">
      <h1>Построение отрезков</h1>

      <div className="lab1-content">
        <div className="lab1-panel">
          <div className="control-group">
            <label>Алгоритм:</label>
            <div className="algorithm-buttons">
              <button
                className={`algo-btn ${algorithm === 'dda' ? 'active' : ''}`}
                onClick={() => setAlgorithm('dda')}
              >
                DDA
              </button>
              <button
                className={`algo-btn ${algorithm === 'bresenham' ? 'active' : ''}`}
                onClick={() => setAlgorithm('bresenham')}
              >
                Брезенхем
              </button>
              <button
                className={`algo-btn ${algorithm === 'wu' ? 'active' : ''}`}
                onClick={() => setAlgorithm('wu')}
              >
                Ву (сглаживание)
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Координаты:</label>
            <div className="coordinates">
              <div>
                <strong>Начало:</strong> {startPoint ? `(${startPoint.x}, ${startPoint.y})` : 'не выбрано'}
              </div>
              <div>
                <strong>Конец:</strong> {endPoint ? `(${endPoint.x}, ${endPoint.y})` : 'не выбрано'}
              </div>
            </div>
          </div>

          <button className="clear-btn" onClick={handleClear}>
            Очистить
          </button>

          <div className="algorithm-info">
            <h3>О {algorithm === 'dda' ? 'DDA' : algorithm === 'bresenham' ? 'Брезенхеме' : 'Ву'}:</h3>
            {algorithm === 'dda' && (
              <p>Digital Differential Analyzer — шаги с интерполяцией и округлением.</p>
            )}
            {algorithm === 'bresenham' && (
              <p>Брезенхем — быстрый целочисленный алгоритм растеризации линий.</p>
            )}
            {algorithm === 'wu' && (
              <p>Ву — антиалиасинг по интенсивности соседних пикселей.</p>
            )}
          </div>
        </div>

        <div className="lab1-canvas-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="lab1-canvas"
            onClick={handleCanvasClick}
          />
          <div className="canvas-hint">
            {!startPoint && 'Нажмите для установки начальной точки'}
            {startPoint && !endPoint && 'Нажмите для установки конечной точки'}
            {startPoint && endPoint && 'Нажмите для начала новой линии'}
          </div>
        </div>
      </div>
    </div>
  );
}
