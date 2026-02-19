import { useState, useCallback, useEffect } from 'react';
import type { Point } from '../../utils/polygonUtils';
import {
  delaunayTriangulation,
  delaunayTriangulationSteps,
  voronoiFromDelaunay,
  voronoiFromDelaunaySteps,
  type DelaunayStep,
  type VoronoiStep,
  type VoronoiEdge,
} from '../../utils/delaunay';
import './Lab6.css';

const CANVAS_CELLS_X = 80;
const CANVAS_CELLS_Y = 60;
const BBOX = { minX: 0, minY: 0, maxX: CANVAS_CELLS_X, maxY: CANVAS_CELLS_Y };

export type Lab6Overlay = {
  points: Point[];
  kind: 'delaunay' | 'voronoi' | null;
  triangles: Point[][];
  voronoiEdges: VoronoiEdge[];
  debug: {
    stepMode: boolean;
    currentStepIndex: number;
    delaunaySteps: DelaunayStep[];
    voronoiSteps: VoronoiStep[];
    kind: 'delaunay' | 'voronoi';
    currentMessage: string;
  } | null;
};

interface Lab6Props {
  controlPoints: Point[];
  setLab6Overlay: (data: Lab6Overlay) => void;
}

type ResultKind = 'delaunay' | 'voronoi' | null;

export function Lab6({ controlPoints, setLab6Overlay }: Lab6Props) {
  const [resultKind, setResultKind] = useState<ResultKind>(null);
  const [triangles, setTriangles] = useState<Point[][]>([]);
  const [voronoiEdges, setVoronoiEdges] = useState<VoronoiEdge[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [delaunaySteps, setDelaunaySteps] = useState<DelaunayStep[]>([]);
  const [voronoiSteps, setVoronoiSteps] = useState<VoronoiStep[]>([]);
  const [debugKind, setDebugKind] = useState<'delaunay' | 'voronoi'>('delaunay');

  const points = controlPoints;

  const updateOverlay = useCallback(
    (overlay: Lab6Overlay) => {
      setLab6Overlay(overlay);
    },
    [setLab6Overlay]
  );

  useEffect(() => {
    if (points.length === 0 && !resultKind) {
      updateOverlay({
        points: [],
        kind: null,
        triangles: [],
        voronoiEdges: [],
        debug: null,
      });
      return;
    }

    if (showDebug && stepMode) {
      const isDelaunay = debugKind === 'delaunay';
      const steps = isDelaunay ? delaunaySteps : voronoiSteps;
      const step = steps[currentStepIndex];
      if (step) {
        const tri = isDelaunay ? (step as DelaunayStep).triangles : (step as VoronoiStep).triangles;
        const vor = isDelaunay ? [] : (step as VoronoiStep).voronoiEdges;
        updateOverlay({
          points,
          kind: resultKind,
          triangles: tri,
          voronoiEdges: vor,
          debug: {
            stepMode: true,
            currentStepIndex,
            delaunaySteps,
            voronoiSteps,
            kind: debugKind,
            currentMessage: step.message,
          },
        });
      }
      return;
    }

    updateOverlay({
      points,
      kind: resultKind,
      triangles,
      voronoiEdges,
      debug: showDebug
        ? {
            stepMode: false,
            currentStepIndex: 0,
            delaunaySteps,
            voronoiSteps,
            kind: debugKind,
            currentMessage: '',
          }
        : null,
    });
  }, [
    points,
    resultKind,
    triangles,
    voronoiEdges,
    showDebug,
    stepMode,
    currentStepIndex,
    delaunaySteps,
    voronoiSteps,
    debugKind,
    updateOverlay,
  ]);

  const handleDelaunay = useCallback(() => {
    if (points.length < 3) {
      alert('Расставьте минимум 3 точки на холсте');
      return;
    }
    if (showDebug) {
      const steps = delaunayTriangulationSteps(points);
      setDelaunaySteps(steps);
      setDebugKind('delaunay');
      setCurrentStepIndex(0);
      setStepMode(false);
      const last = steps[steps.length - 1];
      setTriangles(last?.triangles ?? []);
      setResultKind('delaunay');
      setVoronoiEdges([]);
    } else {
      const tri = delaunayTriangulation(points);
      setTriangles(tri);
      setResultKind('delaunay');
      setVoronoiEdges([]);
    }
  }, [points, showDebug]);

  const handleVoronoi = useCallback(() => {
    if (points.length < 3) {
      alert('Расставьте минимум 3 точки на холсте');
      return;
    }
    const tri = delaunayTriangulation(points);
    if (tri.length === 0) {
      alert('Триангуляция не построена (возможно, точки коллинеарны)');
      return;
    }
    if (showDebug) {
      const steps = voronoiFromDelaunaySteps(tri, BBOX);
      setTriangles(tri);
      setVoronoiSteps(steps);
      setDebugKind('voronoi');
      setCurrentStepIndex(0);
      setStepMode(false);
      const last = steps[steps.length - 1];
      setVoronoiEdges(last?.voronoiEdges ?? []);
      setResultKind('voronoi');
    } else {
      const edges = voronoiFromDelaunay(tri, BBOX);
      setTriangles(tri);
      setVoronoiEdges(edges);
      setResultKind('voronoi');
    }
  }, [points, showDebug]);

  const currentDelaunayStep = delaunaySteps[currentStepIndex] as DelaunayStep | undefined;
  const currentVoronoiStep = voronoiSteps[currentStepIndex] as VoronoiStep | undefined;
  const steps = debugKind === 'delaunay' ? delaunaySteps : voronoiSteps;
  const stepsCount = steps.length;

  return (
    <div className="lab6-panel">
      <h3>Триангуляция Делоне и диаграмма Вороного</h3>

      <p className="lab6-hint">
        Расставьте минимум 3 точки на холсте, затем нажмите одну из кнопок ниже.
      </p>

      <div className="lab6-buttons">
        <button className="apply-btn" onClick={handleDelaunay}>
          Создать триангуляцию Делоне
        </button>
        <button className="apply-btn voronoi" onClick={handleVoronoi}>
          Создать диаграмму Вороного
        </button>
      </div>

      <div className="control-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showDebug}
            onChange={(e) => {
              setShowDebug(e.target.checked);
              if (e.target.checked) setStepMode(false);
            }}
          />
          Отладочный режим
        </label>
      </div>

      {showDebug && stepsCount > 0 && (
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

          {stepMode && stepsCount > 0 && (
            <>
              <div className="control-group">
                <label>
                  Шаг: <span className="value">{currentStepIndex + 1} / {stepsCount}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, stepsCount - 1)}
                  value={currentStepIndex}
                  onChange={(e) => setCurrentStepIndex(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="control-group">
                <button
                  className="nav-btn"
                  onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
                  disabled={currentStepIndex === 0}
                >
                  ◀ Предыдущий
                </button>
                <button
                  className="nav-btn"
                  onClick={() => setCurrentStepIndex((i) => Math.min(stepsCount - 1, i + 1))}
                  disabled={currentStepIndex === stepsCount - 1}
                >
                  Следующий ▶
                </button>
              </div>

              <div className="lab6-debug-step-info">
                <p><strong>Шаг {currentStepIndex + 1}:</strong></p>
                <p>{debugKind === 'delaunay' ? currentDelaunayStep?.message : currentVoronoiStep?.message}</p>
                {currentDelaunayStep?.circumcenter && (
                  <p>
                    Центр описанной окружности: ({currentDelaunayStep.circumcenter.x.toFixed(1)},{' '}
                    {currentDelaunayStep.circumcenter.y.toFixed(1)}), R ={' '}
                    {currentDelaunayStep.circumRadius?.toFixed(1)}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div className="lab6-status">
        <p><strong>Точек:</strong> {points.length}</p>
        {resultKind === 'delaunay' && <p><strong>Треугольников Делоне:</strong> {triangles.length}</p>}
        {resultKind === 'voronoi' && <p><strong>Рёбер Вороного:</strong> {voronoiEdges.length}</p>}
      </div>
    </div>
  );
}

export default Lab6;
