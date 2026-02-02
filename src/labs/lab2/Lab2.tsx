import { useState, useRef, useEffect, useCallback } from 'react';
import {
  drawCircleBresenham,
  drawCircleBresenhamDebug,
  drawEllipseBresenham,
  drawEllipseBresenhamDebug,
  drawParabolaBresenham,
  drawParabolaBresenhamDebug,
  type Point,
  type StepInfo,
} from '../../utils/secondOrderCurves';
import './Lab2.css';

type CurveType = 'circle' | 'ellipse' | 'parabola';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIXEL_SIZE = 10;
const GRID_WIDTH = CANVAS_WIDTH / PIXEL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / PIXEL_SIZE;

export function Lab2() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [curveType, setCurveType] = useState<CurveType>('circle');
  const [centerPoint, setCenterPoint] = useState<Point>({ x: 40, y: 30 });
  const [isSelectingCenter, setIsSelectingCenter] = useState(false);

  // Curve parameters
  const [circleRadius, setCircleRadius] = useState(20);
  const [ellipseA, setEllipseA] = useState(30);
  const [ellipseB, setEllipseB] = useState(20);
  const [parabolaP, setParabolaP] = useState(10);

  // Debug/step mode
  const [showDebug, setShowDebug] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [allSteps, setAllSteps] = useState<StepInfo[]>([]);

  // Draw a single grid pixel
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

    // Draw center point (green)
    drawPixel(ctx, centerPoint.x, centerPoint.y, '#00aa00');
  };

  // Generate curve points based on mode
  const generateCurve = useCallback(() => {
    let points: Point[] | StepInfo[] = [];

    if (curveType === 'circle') {
      if (showDebug) {
        points = drawCircleBresenhamDebug(centerPoint.x, centerPoint.y, circleRadius);
      } else {
        points = drawCircleBresenham(centerPoint.x, centerPoint.y, circleRadius);
      }
    } else if (curveType === 'ellipse') {
      if (showDebug) {
        points = drawEllipseBresenhamDebug(centerPoint.x, centerPoint.y, ellipseA, ellipseB);
      } else {
        points = drawEllipseBresenham(centerPoint.x, centerPoint.y, ellipseA, ellipseB);
      }
    } else if (curveType === 'parabola') {
      const maxLen = Math.max(ellipseA, ellipseB, circleRadius) * 2;
      if (showDebug) {
        points = drawParabolaBresenhamDebug(centerPoint.x, centerPoint.y, parabolaP, maxLen);
      } else {
        points = drawParabolaBresenham(centerPoint.x, centerPoint.y, parabolaP, maxLen);
      }
    }

    if (showDebug) {
      setAllSteps(points as StepInfo[]);
    }

    return points;
  }, [curveType, centerPoint, circleRadius, ellipseA, ellipseB, parabolaP, showDebug]);

  // Redraw the whole canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx);

    let points = generateCurve();

    // In step mode, show only up to current step
    if (stepMode && showDebug) {
      const stepPoints = allSteps.slice(0, currentStep + 1);
      points = stepPoints.map(step => ({ x: step.x, y: step.y }));
    }

    if (isSelectingCenter) {
      // Show selection mode indicator
      ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#0066ff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Выберите центр (нажмите на точку)', CANVAS_WIDTH / 2, 30);
    }

    // Draw curve points
    (points as Point[]).forEach((point) => {
      drawPixel(ctx, point.x, point.y, '#000000');
    });
  }, [generateCurve, stepMode, currentStep, allSteps, showDebug, isSelectingCenter]);

  // Re-render when dependencies change
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Handle canvas click for center point selection
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingCenter) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const x = Math.floor(canvasX / PIXEL_SIZE);
    const y = Math.floor(canvasY / PIXEL_SIZE);

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      setCenterPoint({ x, y });
      setIsSelectingCenter(false);
    }
  };

  // Get current step info for display
  const currentStepInfo = stepMode && showDebug ? allSteps[currentStep] : null;

  return (
    <div className="lab-component">
      <div className="lab-controls">
        <h2>Линии второго порядка</h2>

        {/* Center point selection */}
        <div className="control-group">
          <label>Центр: ({centerPoint.x}, {centerPoint.y})</label>
          <button
            className="select-center-btn"
            onClick={() => setIsSelectingCenter(!isSelectingCenter)}
          >
            {isSelectingCenter ? '✓ Выбирать центр' : 'Выбрать центр'}
          </button>
        </div>

        {/* Curve type */}
        <div className="control-group">
          <label>Тип кривой:</label>
          <div className="curve-buttons">
            <button
              className={`curve-btn ${curveType === 'circle' ? 'active' : ''}`}
              onClick={() => setCurveType('circle')}
            >
              Окружность
            </button>
            <button
              className={`curve-btn ${curveType === 'ellipse' ? 'active' : ''}`}
              onClick={() => setCurveType('ellipse')}
            >
              Эллипс
            </button>
            <button
              className={`curve-btn ${curveType === 'parabola' ? 'active' : ''}`}
              onClick={() => setCurveType('parabola')}
            >
              Парабола
            </button>
          </div>
        </div>

        {/* Circle parameters */}
        {curveType === 'circle' && (
          <div className="control-group">
            <label>
              Радиус R: <span className="value">{circleRadius}</span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={circleRadius}
              onChange={(e) => setCircleRadius(Number(e.target.value))}
              className="slider"
            />
          </div>
        )}

        {/* Ellipse parameters */}
        {curveType === 'ellipse' && (
          <>
            <div className="control-group">
              <label>
                Полуось a: <span className="value">{ellipseA}</span>
              </label>
              <input
                type="range"
                min="10"
                max="120"
                value={ellipseA}
                onChange={(e) => setEllipseA(Number(e.target.value))}
                className="slider"
              />
            </div>
            <div className="control-group">
              <label>
                Полуось b: <span className="value">{ellipseB}</span>
              </label>
              <input
                type="range"
                min="10"
                max="120"
                value={ellipseB}
                onChange={(e) => setEllipseB(Number(e.target.value))}
                className="slider"
              />
            </div>
          </>
        )}

        {/* Parabola parameters */}
        {curveType === 'parabola' && (
          <div className="control-group">
            <label>
              Параметр p: <span className="value">{parabolaP}</span>
            </label>
            <input
              type="range"
              min="2"
              max="40"
              value={parabolaP}
              onChange={(e) => setParabolaP(Number(e.target.value))}
              className="slider"
            />
          </div>
        )}

        {/* Debug mode */}
        <div className="control-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => {
                setShowDebug(e.target.checked);
                if (e.target.checked) {
                  setStepMode(false);
                }
              }}
            />
            Отладочный режим (Δi)
          </label>
        </div>

        {/* Step mode */}
        {showDebug && (
          <>
            <div className="control-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={stepMode}
                  onChange={(e) => {
                    setStepMode(e.target.checked);
                    if (e.target.checked) {
                      setCurrentStep(0);
                    }
                  }}
                />
                Пошаговый режим
              </label>
            </div>

            {stepMode && (
              <div className="control-group">
                <label>
                  Шаг: <span className="value">{currentStep + 1} / {allSteps.length}</span>
                </label>
                <div className="step-controls">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="step-btn"
                  >
                    ◀ Пред
                  </button>
                  <button
                    onClick={() => setCurrentStep(Math.min(allSteps.length - 1, currentStep + 1))}
                    disabled={currentStep === allSteps.length - 1}
                    className="step-btn"
                  >
                    След ▶
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, allSteps.length - 1)}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  className="slider"
                />
              </div>
            )}

            {/* Step info display */}
            {currentStepInfo && (
              <div className="debug-info">
                <div className="debug-row">
                  <span>Точка:</span>
                  <span className="debug-value">({currentStepInfo.x}, {currentStepInfo.y})</span>
                </div>
                <div className="debug-row">
                  <span>Δi:</span>
                  <span className="debug-value">{currentStepInfo.deltaI}</span>
                </div>
                <div className="debug-row">
                  <span>Тип шага:</span>
                  <span className="debug-value">{currentStepInfo.stepType}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Statistics */}
        {showDebug && (
          <div className="stats-info">
            <div>Всего точек: <strong>{allSteps.length}</strong></div>
          </div>
        )}
      </div>

      <div className="lab-canvas">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="pixel-canvas"
          onClick={handleCanvasClick}
          style={{ cursor: isSelectingCenter ? 'crosshair' : 'default' }}
        />
      </div>
    </div>
  );
}
