import { useState, useCallback, useEffect } from 'react';
import type { Point } from '../../utils/lineDrawing';
import { cohenSutherlandClip, cyrusBeckClip } from '../../utils/clipping';
import {
  buildUnitCube,
  rotateCube,
  applyRobertsAlgorithm,
  type ProjectedFace,
} from '../../utils/roberts';
import './Lab7.css';

export type InputSegment = { start: Point; end: Point };

export type Lab7Overlay = {
  mode: '2d' | '3d';
  // 2D clipping
  inputSegments: InputSegment[];
  clippingWindow: { x1: number; y1: number; x2: number; y2: number } | null;
  clippedSegments: InputSegment[];
  pendingPoint: Point | null;
  drawMode: 'segment' | 'window';
  algorithm: 'cohen-sutherland' | 'cyrus-beck';
  // 3D Roberts
  cube3d: {
    projectedFaces: ProjectedFace[];
    showHidden: boolean;
  } | null;
};

const CANVAS_CELLS_X = 80;
const CANVAS_CELLS_Y = 60;

interface Lab7Props {
  controlPoints: Point[];
  setControlPoints: (pts: Point[]) => void;
  setLab7Overlay: (data: Lab7Overlay) => void;
}

export function Lab7({ controlPoints, setControlPoints, setLab7Overlay }: Lab7Props) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  // 2D state
  const [algorithm, setAlgorithm] = useState<'cohen-sutherland' | 'cyrus-beck'>('cohen-sutherland');
  const [drawMode, setDrawMode] = useState<'segment' | 'window'>('segment');
  const [segments, setSegments] = useState<InputSegment[]>([]);
  const [clippingWindow, setClippingWindow] = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);
  const [clippedSegments, setClippedSegments] = useState<InputSegment[]>([]);
  const [hasApplied, setHasApplied] = useState(false);

  // 3D state
  const [rotX, setRotX] = useState(30);
  const [rotY, setRotY] = useState(45);
  const [rotZ, setRotZ] = useState(0);
  const [showHidden, setShowHidden] = useState(true);
  const [projectedFaces, setProjectedFaces] = useState<ProjectedFace[]>([]);

  // Interpret controlPoints as segment pairs or window corners
  useEffect(() => {
    if (mode !== '2d') return;

    if (drawMode === 'segment') {
      const newSegments: InputSegment[] = [];
      for (let i = 0; i + 1 < controlPoints.length; i += 2) {
        newSegments.push({ start: controlPoints[i], end: controlPoints[i + 1] });
      }
      setSegments(newSegments);
      setHasApplied(false);
      setClippedSegments([]);
    } else if (drawMode === 'window') {
      if (controlPoints.length >= 2) {
        const p1 = controlPoints[0];
        const p2 = controlPoints[1];
        setClippingWindow({
          x1: Math.min(p1.x, p2.x),
          y1: Math.min(p1.y, p2.y),
          x2: Math.max(p1.x, p2.x),
          y2: Math.max(p1.y, p2.y),
        });
      } else {
        setClippingWindow(null);
      }
    }
  }, [controlPoints, drawMode, mode]);

  // Auto-compute 3D cube whenever rotation changes or mode switches to 3D
  useEffect(() => {
    if (mode !== '3d') return;
    const { vertices: baseVertices, faces } = buildUnitCube();
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const rotated = rotateCube(baseVertices, toRad(rotX), toRad(rotY), toRad(rotZ));
    const observer = { x: 0, y: 0, z: 3 };
    const projected = applyRobertsAlgorithm(
      rotated, faces, observer,
      CANVAS_CELLS_X / 2, CANVAS_CELLS_Y / 2, 18,
    );
    setProjectedFaces(projected);
  }, [mode, rotX, rotY, rotZ]);

  // Arrow-key rotation in 3D mode
  useEffect(() => {
    if (mode !== '3d') return;
    const STEP = 5;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); setRotY((prev) => prev - STEP); break;
        case 'ArrowRight': e.preventDefault(); setRotY((prev) => prev + STEP); break;
        case 'ArrowUp':    e.preventDefault(); setRotX((prev) => prev - STEP); break;
        case 'ArrowDown':  e.preventDefault(); setRotX((prev) => prev + STEP); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode]);

  // Broadcast overlay on every relevant state change
  useEffect(() => {
    let pendingPoint: Point | null = null;
    if (mode === '2d' && drawMode === 'segment' && controlPoints.length % 2 === 1) {
      pendingPoint = controlPoints[controlPoints.length - 1];
    }

    setLab7Overlay({
      mode,
      inputSegments: segments,
      clippingWindow,
      clippedSegments,
      pendingPoint,
      drawMode,
      algorithm,
      cube3d:
        projectedFaces.length > 0
          ? { projectedFaces, showHidden }
          : null,
    });
  }, [
    mode, segments, clippingWindow, clippedSegments, drawMode, algorithm,
    projectedFaces, showHidden, controlPoints, setLab7Overlay,
  ]);

  const handleApplyClipping = useCallback(() => {
    if (segments.length === 0) {
      alert('Добавьте хотя бы один отрезок на холсте');
      return;
    }
    if (!clippingWindow) {
      alert('Задайте окно отсечения: выберите режим «Окно» и кликните двумя точками');
      return;
    }
    const win = {
      xMin: clippingWindow.x1,
      yMin: clippingWindow.y1,
      xMax: clippingWindow.x2,
      yMax: clippingWindow.y2,
    };
    const clipFn = algorithm === 'cohen-sutherland' ? cohenSutherlandClip : cyrusBeckClip;

    const clipped: InputSegment[] = [];
    for (const seg of segments) {
      const result = clipFn(
        { x1: seg.start.x, y1: seg.start.y, x2: seg.end.x, y2: seg.end.y },
        win,
      );
      if (result) {
        clipped.push({
          start: { x: result.x1, y: result.y1 },
          end: { x: result.x2, y: result.y2 },
        });
      }
    }
    setClippedSegments(clipped);
    setHasApplied(true);
  }, [segments, clippingWindow, algorithm]);

  const handleClear2D = useCallback(() => {
    setSegments([]);
    setClippingWindow(null);
    setClippedSegments([]);
    setHasApplied(false);
    setControlPoints([]);
  }, [setControlPoints]);

  const handleSwitchDrawMode = useCallback(
    (newMode: 'segment' | 'window') => {
      setDrawMode(newMode);
      setControlPoints([]);
      if (newMode === 'window') setClippingWindow(null);
    },
    [setControlPoints],
  );

  const handleSwitchMode = (newMode: '2d' | '3d') => {
    setMode(newMode);
    setControlPoints([]);
    if (newMode === '2d') {
      setProjectedFaces([]);
    } else {
      setSegments([]);
      setClippingWindow(null);
      setClippedSegments([]);
      setHasApplied(false);
    }
  };

  return (
    <div className="lab7-panel">
      <h3>Отсечение линий и удаление граней</h3>

      <div className="lab7-tabs">
        <button
          className={`lab7-tab${mode === '2d' ? ' active' : ''}`}
          onClick={() => handleSwitchMode('2d')}
        >
          2D Отсечение
        </button>
        <button
          className={`lab7-tab${mode === '3d' ? ' active' : ''}`}
          onClick={() => handleSwitchMode('3d')}
        >
          3D Робертс
        </button>
      </div>

      {mode === '2d' && (
        <div className="lab7-section">
          <div className="control-group">
            <label>Алгоритм:</label>
            <select
              value={algorithm}
              onChange={(e) =>
                setAlgorithm(e.target.value as 'cohen-sutherland' | 'cyrus-beck')
              }
              className="lab7-select"
            >
              <option value="cohen-sutherland">Коэна–Сазерленда</option>
              <option value="cyrus-beck">Кируса–Бэка</option>
            </select>
          </div>

          <div className="control-group">
            <label>Режим рисования:</label>
            <div className="lab7-mode-buttons">
              <button
                className={`lab7-mode-btn${drawMode === 'segment' ? ' active' : ''}`}
                onClick={() => handleSwitchDrawMode('segment')}
              >
                Отрезки
              </button>
              <button
                className={`lab7-mode-btn${drawMode === 'window' ? ' active' : ''}`}
                onClick={() => handleSwitchDrawMode('window')}
              >
                Окно
              </button>
            </div>
          </div>

          <p className="lab7-hint">
            {drawMode === 'segment'
              ? 'Кликайте по холсту: нечётный клик — начало отрезка, чётный — конец.'
              : 'Кликните две точки для задания углов прямоугольного окна отсечения.'}
          </p>

          <div className="lab7-status">
            <p><strong>Отрезков:</strong> {segments.length}</p>
            <p>
              <strong>Окно:</strong>{' '}
              {clippingWindow
                ? `(${clippingWindow.x1}, ${clippingWindow.y1}) — (${clippingWindow.x2}, ${clippingWindow.y2})`
                : 'не задано'}
            </p>
            {hasApplied && (
              <p>
                <strong>Видимых после отсечения:</strong> {clippedSegments.length} / {segments.length}
              </p>
            )}
          </div>

          <div className="lab7-action-buttons">
            <button className="apply-btn" onClick={handleApplyClipping}>
              Применить отсечение
            </button>
            <button className="apply-btn lab7-clear-btn" onClick={handleClear2D}>
              Очистить
            </button>
          </div>
        </div>
      )}

      {mode === '3d' && (
        <div className="lab7-section">
          <div className="lab7-key-hint">
            <div className="lab7-key-row">
              <kbd>↑</kbd><kbd>↓</kbd> — поворот по X
            </div>
            <div className="lab7-key-row">
              <kbd>←</kbd><kbd>→</kbd> — поворот по Y
            </div>
            <p className="lab7-hint" style={{ marginTop: 6 }}>
              Синим выделены видимые грани. Наблюдатель на оси Z+.
            </p>
          </div>

          <div className="control-group">
            <label>Поворот X: <span className="value">{rotX}°</span></label>
            <input
              type="range" min="-180" max="180" value={rotX}
              onChange={(e) => setRotX(Number(e.target.value))}
              className="slider"
            />
          </div>
          <div className="control-group">
            <label>Поворот Y: <span className="value">{rotY}°</span></label>
            <input
              type="range" min="-180" max="180" value={rotY}
              onChange={(e) => setRotY(Number(e.target.value))}
              className="slider"
            />
          </div>
          <div className="control-group">
            <label>Поворот Z: <span className="value">{rotZ}°</span></label>
            <input
              type="range" min="-180" max="180" value={rotZ}
              onChange={(e) => setRotZ(Number(e.target.value))}
              className="slider"
            />
          </div>

          <div className="control-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
              Показывать рёбра скрытых граней пунктиром
            </label>
          </div>

          <button
            className="apply-btn lab7-reset-btn"
            onClick={() => { setRotX(30); setRotY(45); setRotZ(0); }}
          >
            Сбросить поворот
          </button>

          <div className="lab7-legend">
            <span className="lab7-legend-vis">— видимая грань</span>
            <span className="lab7-legend-hid">- - скрытое ребро</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lab7;
