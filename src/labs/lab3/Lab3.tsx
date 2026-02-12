import { useState, useCallback, useEffect } from 'react';
import {
  hermiteInterpolation,
  cubicBezier,
  bSpline,
  hermiteInterpolationDebug,
  cubicBezierDebug,
  bSplineDebug,
  type Point,
  type CurveStep,
} from '../../utils/curveInterpolation';
import './Lab3.css';

type InterpolationType = 'hermite' | 'bezier' | 'bspline';

interface Lab3Props {
  controlPoints: Point[];
  onAlgorithmApply?: (curvePoints: Point[], title: string) => void;
}

export function Lab3({ controlPoints, onAlgorithmApply }: Lab3Props) {
  const [interpolationType, setInterpolationType] = useState<InterpolationType>('bezier');
  const [showDebug, setShowDebug] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [allSteps, setAllSteps] = useState<CurveStep[]>([]);
  // Сохраняем параметры последней нарисованной кривой
  const [lastCurveParams, setLastCurveParams] = useState<{
    interpolationType: InterpolationType;
    controlPoints: Point[];
  } | null>(null);

  // Применить алгоритм интерполяции
  const applyCurve = useCallback(() => {
    if (controlPoints.length < 2) {
      alert('Нужны минимум 2 точки для рисования кривой');
      return;
    }

    let points: Point[] | CurveStep[] = [];
    let title = '';

    if (interpolationType === 'hermite') {
      if (controlPoints.length < 4) {
        alert('Для Эрмита нужны 4 точки');
        return;
      }
      title = 'Интерполяция Эрмита';
      const P0 = controlPoints[0];
      const P1 = controlPoints[1];
      // Касательные вычисляются как векторы от конечных точек к указанным направляющим

        // Усиливаем влияние векторов (×2)
        const T0 = {
          x: 2 * (controlPoints[2].x - P0.x),
          y: 2 * (controlPoints[2].y - P0.y)
        };
        const T1 = {
          x: 2 * (controlPoints[3].x - P1.x),
          y: 2 * (controlPoints[3].y - P1.y)
        };

      if (showDebug) {
        points = hermiteInterpolationDebug(P0, P1, T0, T1);
      } else {
        points = hermiteInterpolation(P0, P1, T0, T1);
      }
    } else if (interpolationType === 'bezier') {
      if (controlPoints.length < 4) {
        alert('Для Безье нужны 4 контрольные точки');
        return;
      }
      title = 'Кубическая кривая Безье';
      const P0 = controlPoints[0];
      const P1 = controlPoints[1];
      const P2 = controlPoints[2];
      const P3 = controlPoints[3];

      if (showDebug) {
        points = cubicBezierDebug(P0, P1, P2, P3);
      } else {
        points = cubicBezier(P0, P1, P2, P3);
      }
    } else if (interpolationType === 'bspline') {
      if (controlPoints.length < 2) {
        alert('Для B-сплайнов нужны минимум 2 точки');
        return;
      }
      title = 'B-сплайн';

      if (showDebug) {
        points = bSplineDebug(controlPoints);
      } else {
        points = bSpline(controlPoints);
      }
    }

    if (showDebug && points.length > 0) {
      setAllSteps(points as CurveStep[]);
      setCurrentStep(0);
    }

    // Сохраняем параметры этой кривой для возможного переключения режимов
    setLastCurveParams({
      interpolationType,
      controlPoints: controlPoints.slice()
    });

    if (onAlgorithmApply) {
      onAlgorithmApply(points as Point[], title);
    }
  }, [controlPoints, interpolationType, showDebug, onAlgorithmApply]);

  // Обновить отображение при изменении пошагового режима
  useEffect(() => {
    if (stepMode && allSteps.length > 0) {
      // Передать только шаги до текущего (включительно)
      const filteredSteps = allSteps.slice(0, currentStep + 1);
      if (onAlgorithmApply) {
        onAlgorithmApply(filteredSteps as Point[], 'step-debug');
      }
    }
  }, [currentStep, stepMode, allSteps, onAlgorithmApply]);

  // Пересчитать фигуру при изменении режима debug (если фигура была нарисована)
  useEffect(() => {
    if (!lastCurveParams) return;

    const { interpolationType: savedType, controlPoints: savedPoints } = lastCurveParams;
    let points: Point[] | CurveStep[] = [];
    let title = '';

    if (savedType === 'hermite') {
      if (savedPoints.length < 4) return;
      title = 'Интерполяция Эрмита';
      const P0 = savedPoints[0];
      const P1 = savedPoints[1];
      const T0 = {
        x: savedPoints[2].x - P0.x,
        y: savedPoints[2].y - P0.y
      };
      const T1 = {
        x: savedPoints[3].x - P1.x,
        y: savedPoints[3].y - P1.y
      };

      if (showDebug) {
        points = hermiteInterpolationDebug(P0, P1, T0, T1);
      } else {
        points = hermiteInterpolation(P0, P1, T0, T1);
      }
    } else if (savedType === 'bezier') {
      if (savedPoints.length < 4) return;
      title = 'Кубическая кривая Безье';
      const P0 = savedPoints[0];
      const P1 = savedPoints[1];
      const P2 = savedPoints[2];
      const P3 = savedPoints[3];

      if (showDebug) {
        points = cubicBezierDebug(P0, P1, P2, P3);
      } else {
        points = cubicBezier(P0, P1, P2, P3);
      }
    } else if (savedType === 'bspline') {
      if (savedPoints.length < 2) return;
      title = 'B-сплайн';

      if (showDebug) {
        points = bSplineDebug(savedPoints);
      } else {
        points = bSpline(savedPoints);
      }
    }

    if (showDebug && points.length > 0) {
      setAllSteps(points as CurveStep[]);
      setCurrentStep(0);
    }

    if (onAlgorithmApply) {
      onAlgorithmApply(points as Point[], title);
    }
  }, [showDebug, lastCurveParams, onAlgorithmApply]);

  // Пересчитать при изменении типа интерполяции (если кривая уже была нарисована)
  useEffect(() => {
    if (!lastCurveParams) return;

    const { controlPoints: savedPoints } = lastCurveParams;
    let points: Point[] | CurveStep[] = [];
    let title = '';

    // Используем ТЕКУЩИЙ тип интерполяции, а не сохранённый
    if (interpolationType === 'hermite') {
      if (savedPoints.length < 4) return;
      title = 'Интерполяция Эрмита';
      const P0 = savedPoints[0];
      const P1 = savedPoints[1];
      const T0 = {
        x: savedPoints[2].x - P0.x,
        y: savedPoints[2].y - P0.y
      };
      const T1 = {
        x: savedPoints[3].x - P1.x,
        y: savedPoints[3].y - P1.y
      };

      if (showDebug) {
        points = hermiteInterpolationDebug(P0, P1, T0, T1);
      } else {
        points = hermiteInterpolation(P0, P1, T0, T1);
      }
    } else if (interpolationType === 'bezier') {
      if (savedPoints.length < 4) return;
      title = 'Кубическая кривая Безье';
      const P0 = savedPoints[0];
      const P1 = savedPoints[1];
      const P2 = savedPoints[2];
      const P3 = savedPoints[3];

      if (showDebug) {
        points = cubicBezierDebug(P0, P1, P2, P3);
      } else {
        points = cubicBezier(P0, P1, P2, P3);
      }
    } else if (interpolationType === 'bspline') {
      if (savedPoints.length < 2) return;
      title = 'B-сплайн';

      if (showDebug) {
        points = bSplineDebug(savedPoints);
      } else {
        points = bSpline(savedPoints);
      }
    }

    if (showDebug && points.length > 0) {
      setAllSteps(points as CurveStep[]);
      setCurrentStep(0);
    }

    if (onAlgorithmApply) {
      onAlgorithmApply(points as Point[], title);
    }
  }, [interpolationType, lastCurveParams, showDebug, onAlgorithmApply]);

  return (
    <div className="lab3-panel">
      <h3>Интерполяция и аппроксимация</h3>

      {/* Выбор типа интерполяции */}
      <div className="control-group">
        <label>Метод:</label>
        <div className="method-buttons">
          <button
            className={`method-btn ${interpolationType === 'hermite' ? 'active' : ''}`}
            onClick={() => setInterpolationType('hermite')}
          >
            Эрмит
          </button>
          <button
            className={`method-btn ${interpolationType === 'bezier' ? 'active' : ''}`}
            onClick={() => setInterpolationType('bezier')}
          >
            Безье
          </button>
          <button
            className={`method-btn ${interpolationType === 'bspline' ? 'active' : ''}`}
            onClick={() => setInterpolationType('bspline')}
          >
            B-сплайн
          </button>
        </div>
      </div>

      {/* Информация о требуемом количестве точек */}
      <div className="control-group">
        <label className="info-label">
          Точек установлено: {controlPoints.length}
          {interpolationType === 'hermite' && ' (нужно 4)'}
          {interpolationType === 'bezier' && ' (нужно 4)'}
          {interpolationType === 'bspline' && ' (минимум 2)'}
        </label>
      </div>

      {/* Кнопка применения */}
      <button className="apply-btn" onClick={applyCurve}>
        Применить интерполяцию
      </button>

      {/* Debug режим */}
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
          Отладочный режим
        </label>
      </div>

      {/* Step режим */}
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
                >
                  ◀ Предыдущ.
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(allSteps.length - 1, currentStep + 1))}
                  disabled={currentStep === allSteps.length - 1}
                >
                  Следующ. ▶
                </button>
              </div>

              {allSteps[currentStep] && (
                <div className="debug-info">
                  <p>
                    <strong>Шаг:</strong> {allSteps[currentStep].description}
                  </p>
                  <p>
                    <strong>Координаты:</strong> ({allSteps[currentStep].x}, {allSteps[currentStep].y})
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Описание алгоритма */}
      <div className="algo-description">
        {interpolationType === 'hermite' && (
          <p>
            <strong>Интерполяция Эрмита:</strong><br/>
            Кубическая интерполяция между двумя точками с контролем направления.<br/>
          </p>
        )}
        {interpolationType === 'bezier' && (
          <p>
            <strong>Кривая Безье:</strong> Параметрическая кривая, не проходящая через все контрольные точки,
            но следующая их направлению. 4 контрольные точки определяют форму.
          </p>
        )}
        {interpolationType === 'bspline' && (
          <p>
            <strong>B-сплайн:</strong> Гладкая кривая, проходящая рядом с контрольными точками.
            Можно использовать любое количество точек (минимум 2).
          </p>
        )}
      </div>
    </div>
  );
}
export default Lab3;