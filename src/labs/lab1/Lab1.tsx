import { useState, useCallback, useEffect } from 'react';
import {
  drawLineDDA,
  drawLineDDADebug,
  drawLineBresenham,
  drawLineBresenhamDebug,
  drawLineWu,
  type Point,
  type StepInfo,
} from '../../utils/lineDrawing';
import './Lab1.css';

type Algorithm = 'dda' | 'bresenham' | 'wu';

interface Lab1Props {
  controlPoints: Point[];
  onCurveApply: (points: Point[], title: string) => void;
}

export function Lab1({ controlPoints, onCurveApply }: Lab1Props) {
  const [algorithm, setAlgorithm] = useState<Algorithm>('bresenham');
  const [showDebug, setShowDebug] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [allSteps, setAllSteps] = useState<StepInfo[]>([]);
  // Сохраняем параметры последней нарисованной фигуры
  const [lastLineParams, setLastLineParams] = useState<{ startPoint: Point; endPoint: Point; algorithm: Algorithm } | null>(null);

  // Применить алгоритм рисования линии
  const applyLine = useCallback(() => {
    if (controlPoints.length < 2) {
      alert('Нужны минимум 2 точки для рисования линии');
      return;
    }

    const startPoint = controlPoints[0];
    const endPoint = controlPoints[1];

    let points: any[] = [];
    let title = '';

    if (algorithm === 'dda') {
      title = 'DDA';
      if (showDebug) {
        points = drawLineDDADebug(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else {
        points = drawLineDDA(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      }
    } else if (algorithm === 'bresenham') {
      title = 'Брезенхем';
      if (showDebug) {
        points = drawLineBresenhamDebug(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else {
        points = drawLineBresenham(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      }
    } else {
      // Wu алгоритм с антиалиасингом
      title = 'Ву (сглаживание)';
      const wuPoints = drawLineWu(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      // Конвертируем интенсивность в цвет
      points = wuPoints.map((p: any) => {
        // Более высокая интенсивность = более чёрный цвет
        // Используем корень для усиления контраста антиалиасинга
        const contrast = Math.pow(p.intensity, 0.8); // корень для усиления контраста
        const value = Math.round((1 - contrast) * 255);
        const hex = value.toString(16).padStart(2, '0');
        return {
          x: p.x,
          y: p.y,
          color: `#${hex}${hex}${hex}`
        };
      });
    }

    // Сохраняем все шаги для пошагового режима
    if (showDebug && points.length > 0) {
      setAllSteps(points as StepInfo[]);
      setCurrentStep(0);
    }

    // Сохраняем параметры этой линии для возможного переключения режимов
    setLastLineParams({ startPoint, endPoint, algorithm });
    onCurveApply(points as Point[], title);
  }, [controlPoints, algorithm, showDebug, onCurveApply]);

  // Обновить отображение при изменении пошагового режима
  useEffect(() => {
    if (stepMode && allSteps.length > 0) {
      // Передать только шаги до текущего (включительно)
      const filteredSteps = allSteps.slice(0, currentStep + 1);
      onCurveApply(filteredSteps as Point[], 'step-debug');
    }
  }, [currentStep, stepMode, allSteps, onCurveApply]);

  // Пересчитать фигуру при включении debug режима (если она уже была нарисована)
  useEffect(() => {
    if (showDebug && allSteps.length === 0 && lastLineParams) {
      const { startPoint, endPoint, algorithm: savedAlgorithm } = lastLineParams;
      let points: any[] = [];

      if (savedAlgorithm === 'dda') {
        points = drawLineDDADebug(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else if (savedAlgorithm === 'bresenham') {
        points = drawLineBresenhamDebug(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      }
      // Wu используется только в обычном режиме, поэтому его debug версии нет

      if (points.length > 0) {
        setAllSteps(points as StepInfo[]);
        setCurrentStep(0);
        onCurveApply(points as Point[], 'debug-mode');
      }
    }
  }, [showDebug, lastLineParams, onCurveApply]);

  // Пересчитать при изменении алгоритма (если линия уже была нарисована)
  useEffect(() => {
    if (!lastLineParams) return;

    const { startPoint, endPoint } = lastLineParams;
    let points: any[] = [];
    let title = '';

    // Используем ТЕКУЩИЙ алгоритм, а не сохранённый
    if (algorithm === 'dda') {
      title = 'DDA';
      if (showDebug) {
        points = drawLineDDADebug(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else {
        points = drawLineDDA(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      }
    } else if (algorithm === 'bresenham') {
      title = 'Брезенхем';
      if (showDebug) {
        points = drawLineBresenhamDebug(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      } else {
        points = drawLineBresenham(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      }
    } else {
      // Wu алгоритм с антиалиасингом
      title = 'Ву (сглаживание)';
      const wuPoints = drawLineWu(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
      // Конвертируем интенсивность в цвет (1.0 = черный #000000, 0.0 = белый #ffffff)
      points = wuPoints.map((p: any) => {
        // Инвертируем: чем выше интенсивность, тем темнее (меньше значение hex)
        const intensity = Math.round((1 - p.intensity) * 255);
        const hex = intensity.toString(16).padStart(2, '0');
        return {
          x: p.x,
          y: p.y,
          color: `#${hex}${hex}${hex}` // серый цвет с интенсивностью
        };
      });
    }

    if (showDebug && points.length > 0) {
      setAllSteps(points as StepInfo[]);
      setCurrentStep(0);
    }

    onCurveApply(points as Point[], title);
  }, [algorithm, lastLineParams, showDebug, onCurveApply]);

  return (
    <div className="lab-panel">
      <h3>Построение отрезков</h3>

      {/* Выбор алгоритма */}
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
            Ву
          </button>
        </div>
      </div>

      {/* Кнопка применения */}
      <button className="apply-btn" onClick={applyLine}>
        Нарисовать линию
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
            disabled={algorithm === 'wu'}
          />
          Отладочный режим (Δi)
        </label>
      </div>

      {/* Step режим */}
      {showDebug && algorithm !== 'wu' && (
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
                    <strong>Δi:</strong> {allSteps[currentStep].deltaI.toFixed(2)}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Описание алгоритма */}
      <div className="algo-description">
        {algorithm === 'dda' && (
          <p>
            <strong>DDA:</strong> Digital Differential Analyzer - использует интерполяцию с округлением.
          </p>
        )}
        {algorithm === 'bresenham' && (
          <p>
            <strong>Брезенхем:</strong> Быстрый целочисленный алгоритм растеризации линий.
          </p>
        )}
        {algorithm === 'wu' && (
          <p>
            <strong>Ву:</strong> Антиалиасинг по интенсивности соседних пикселей.
          </p>
        )}
      </div>
    </div>
  );
}

export default Lab1;