import { useState, useCallback, useEffect } from 'react';
import {
  drawCircleBresenham,
  drawCircleBresenhamDebug,
  drawEllipseBresenham,
  drawEllipseBresenhamDebug,
  drawParabolaBresenham,
  drawParabolaBresenhamDebug,
  drawHyperbolaBresenham,
  drawHyperbolaBresenhamDebug,
  type Point,
  type StepInfo,
} from '../../utils/secondOrderCurves';
import './Lab2.css';

type CurveType = 'circle' | 'ellipse' | 'parabola' | 'hyperbola';

interface Lab2Props {
  controlPoints: Point[];
  onCurveApply: (points: Point[], title: string) => void;
}

export function Lab2({ controlPoints, onCurveApply }: Lab2Props) {
  const [curveType, setCurveType] = useState<CurveType>('circle');
  const [circleRadius, setCircleRadius] = useState(20);
  const [ellipseA, setEllipseA] = useState(30);
  const [ellipseB, setEllipseB] = useState(20);
  const [parabolaP, setParabolaP] = useState(10);
  const [hyperbolaA, setHyperbolaA] = useState(25);
  const [hyperbolaB, setHyperbolaB] = useState(18);
  const [showDebug, setShowDebug] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [allSteps, setAllSteps] = useState<StepInfo[]>([]);
  // Сохраняем параметры последней нарисованной кривой
  const [lastCurveParams, setLastCurveParams] = useState<{
    curveType: CurveType;
    radius?: number;
    a?: number;
    b?: number;
    p?: number;
    hyperbolaA?: number;
    hyperbolaB?: number;
    center: Point;
  } | null>(null);

  // Применить кривую второго порядка
  const applyCurve = useCallback(() => {
    if (controlPoints.length === 0) {
      alert('Выберите центр кривой на холсте');
      return;
    }

    const centerPoint = controlPoints[0];
    let points: Point[] | StepInfo[] = [];
    let title = '';

    if (curveType === 'circle') {
      title = 'Окружность';
      if (showDebug) {
        points = drawCircleBresenhamDebug(centerPoint.x, centerPoint.y, circleRadius);
      } else {
        points = drawCircleBresenham(centerPoint.x, centerPoint.y, circleRadius);
      }
    } else if (curveType === 'ellipse') {
      title = 'Эллипс';
      if (showDebug) {
        points = drawEllipseBresenhamDebug(centerPoint.x, centerPoint.y, ellipseA, ellipseB);
      } else {
        points = drawEllipseBresenham(centerPoint.x, centerPoint.y, ellipseA, ellipseB);
      }
    } else if (curveType === 'parabola') {
      title = 'Парабола';
      const maxLen = Math.max(ellipseA, ellipseB, circleRadius) * 2;
      if (showDebug) {
        points = drawParabolaBresenhamDebug(centerPoint.x, centerPoint.y, parabolaP, maxLen);
      } else {
        points = drawParabolaBresenham(centerPoint.x, centerPoint.y, parabolaP, maxLen);
      }
    } else if (curveType === 'hyperbola') {
      title = 'Гипербола';
      if (showDebug) {
        points = drawHyperbolaBresenhamDebug(centerPoint.x, centerPoint.y, hyperbolaA, hyperbolaB);
      } else {
        points = drawHyperbolaBresenham(centerPoint.x, centerPoint.y, hyperbolaA, hyperbolaB);
      }
    }

    if (showDebug && points.length > 0) {
      setAllSteps(points as StepInfo[]);
      setCurrentStep(0);
    }

    // Сохраняем параметры этой кривой для возможного переключения режимов
    setLastCurveParams({
      curveType,
      radius: circleRadius,
      a: ellipseA,
      b: ellipseB,
      p: parabolaP,
      hyperbolaA,
      hyperbolaB,
      center: centerPoint
    });

    onCurveApply(points as Point[], title);
  }, [controlPoints, curveType, circleRadius, ellipseA, ellipseB, parabolaP, hyperbolaA, hyperbolaB, showDebug, onCurveApply]);

  // Пересчитать фигуру при изменении режима debug (если фигура была нарисована)
  useEffect(() => {
    if (!lastCurveParams) return;

    const { curveType: savedType, center, radius, a, b, p, hyperbolaA: hA, hyperbolaB: hB } = lastCurveParams;
    let points: Point[] | StepInfo[] = [];
    let title = '';

    if (savedType === 'circle') {
      title = 'Окружность';
      points = showDebug
        ? drawCircleBresenhamDebug(center.x, center.y, radius!)
        : drawCircleBresenham(center.x, center.y, radius!);
    } else if (savedType === 'ellipse') {
      title = 'Эллипс';
      points = showDebug
        ? drawEllipseBresenhamDebug(center.x, center.y, a!, b!)
        : drawEllipseBresenham(center.x, center.y, a!, b!);
    } else if (savedType === 'parabola') {
      title = 'Парабола';
      const maxLen = Math.max(a!, b!, radius!) * 2;
      points = showDebug
        ? drawParabolaBresenhamDebug(center.x, center.y, p!, maxLen)
        : drawParabolaBresenham(center.x, center.y, p!, maxLen);
    } else if (savedType === 'hyperbola') {
      title = 'Гипербола';
      points = showDebug
        ? drawHyperbolaBresenhamDebug(center.x, center.y, hA!, hB!)
        : drawHyperbolaBresenham(center.x, center.y, hA!, hB!);
    }

    // Если debug режим, сохраняем все шаги и отображаем полный набор
    if (showDebug && points.length > 0) {
      setAllSteps(points as StepInfo[]);
      setCurrentStep(0);
      setStepMode(false); // Отключаем пошаговый режим при включении debug
    }

    onCurveApply(points as Point[], title);
  }, [showDebug, lastCurveParams, onCurveApply]);

  // Пересчитать фигуру при изменении параметров (если фигура уже была нарисована)
  useEffect(() => {
    if (!lastCurveParams) return;

    const { curveType: savedType, center } = lastCurveParams;
    let points: Point[] | StepInfo[] = [];
    let title = '';

    // Используем ТЕКУЩИЕ значения параметров, а не сохранённые
    if (savedType === 'circle') {
      title = 'Окружность';
      if (showDebug) {
        points = drawCircleBresenhamDebug(center.x, center.y, circleRadius);
      } else {
        points = drawCircleBresenham(center.x, center.y, circleRadius);
      }
    } else if (savedType === 'ellipse') {
      title = 'Эллипс';
      if (showDebug) {
        points = drawEllipseBresenhamDebug(center.x, center.y, ellipseA, ellipseB);
      } else {
        points = drawEllipseBresenham(center.x, center.y, ellipseA, ellipseB);
      }
    } else if (savedType === 'parabola') {
      title = 'Парабола';
      const maxLen = Math.max(ellipseA, ellipseB, circleRadius) * 2;
      if (showDebug) {
        points = drawParabolaBresenhamDebug(center.x, center.y, parabolaP, maxLen);
      } else {
        points = drawParabolaBresenham(center.x, center.y, parabolaP, maxLen);
      }
    } else if (savedType === 'hyperbola') {
      title = 'Гипербола';
      if (showDebug) {
        points = drawHyperbolaBresenhamDebug(center.x, center.y, hyperbolaA, hyperbolaB);
      } else {
        points = drawHyperbolaBresenham(center.x, center.y, hyperbolaA, hyperbolaB);
      }
    }

    if (showDebug && points.length > 0) {
      setAllSteps(points as StepInfo[]);
      setCurrentStep(0);
    }

    onCurveApply(points as Point[], title);
  }, [circleRadius, ellipseA, ellipseB, parabolaP, hyperbolaA, hyperbolaB, lastCurveParams, showDebug, onCurveApply]);

  // Обновить отображение при изменении пошагового режима
  useEffect(() => {
    if (stepMode && allSteps.length > 0) {
      // Передать только шаги до текущего (включительно)
      const filteredSteps = allSteps.slice(0, currentStep + 1);
      onCurveApply(filteredSteps as Point[], 'step-debug');
    }
  }, [currentStep, stepMode, allSteps, onCurveApply]);

  return (
    <div className="lab-panel">
      <h2>Линии второго порядка</h2>

      {/* Curve type selector */}
      <div className="control-group">
        <label>Тип кривой:</label>
        <div className="method-buttons">
          <button
            className={`method-btn ${curveType === 'circle' ? 'active' : ''}`}
            onClick={() => setCurveType('circle')}
          >
            Окружность
          </button>
          <button
            className={`method-btn ${curveType === 'ellipse' ? 'active' : ''}`}
            onClick={() => setCurveType('ellipse')}
          >
            Эллипс
          </button>
          <button
            className={`method-btn ${curveType === 'parabola' ? 'active' : ''}`}
            onClick={() => setCurveType('parabola')}
          >
            Парабола
          </button>
          <button
            className={`method-btn ${curveType === 'hyperbola' ? 'active' : ''}`}
            onClick={() => setCurveType('hyperbola')}
          >
            Гипербола
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

      {/* Hyperbola parameters */}
      {curveType === 'hyperbola' && (
        <>
          <div className="control-group">
            <label>
              Полуось a (по x): <span className="value">{hyperbolaA}</span>
            </label>
            <input
              type="range"
              min="10"
              max="80"
              value={hyperbolaA}
              onChange={(e) => setHyperbolaA(Number(e.target.value))}
              className="slider"
            />
          </div>
          <div className="control-group">
            <label>
              Полуось b (по y): <span className="value">{hyperbolaB}</span>
            </label>
            <input
              type="range"
              min="8"
              max="60"
              value={hyperbolaB}
              onChange={(e) => setHyperbolaB(Number(e.target.value))}
              className="slider"
            />
          </div>
        </>
      )}

      {/* Apply button */}
      <button className="apply-btn" onClick={applyCurve}>
        Нарисовать кривую
      </button>

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
                onChange={(e) => setStepMode(e.target.checked)}
              />
              Пошаговый режим
            </label>
          </div>

          {stepMode && allSteps.length > 0 && (
            <>
              <div className="control-group">
                <label>
                  Шаг: <span className="value">{currentStep + 1} / {allSteps.length}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, allSteps.length - 1)}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="control-group">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="nav-btn"
                >
                  ◀ Предыдущий
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(allSteps.length - 1, currentStep + 1))}
                  disabled={currentStep === allSteps.length - 1}
                  className="nav-btn"
                >
                  Следующий ▶
                </button>
              </div>

              {allSteps[currentStep] && (
                <div className="debug-info">
                  <p>
                    <strong>Точка:</strong> ({allSteps[currentStep].x}, {allSteps[currentStep].y})
                  </p>
                  <p>
                    <strong>Δi:</strong> {allSteps[currentStep].deltaI}
                  </p>
                  {(allSteps[currentStep] as any).stepType && (
                    <p>
                      <strong>Тип шага:</strong> {(allSteps[currentStep] as any).stepType}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      <div className="algo-description">
        {curveType === 'circle' && <p><strong>Окружность:</strong> Алгоритм Брезенхема с 8-симметрией</p>}
        {curveType === 'ellipse' && <p><strong>Эллипс:</strong> Алгоритм средней точки с двумя регионами</p>}
        {curveType === 'parabola' && <p><strong>Парабола:</strong> Вертикальная парабола x²=2py</p>}
        {curveType === 'hyperbola' && <p><strong>Гипербола:</strong> Аналитический метод с плавными ветвями</p>}
      </div>
    </div>
  );
}

export default Lab2;
