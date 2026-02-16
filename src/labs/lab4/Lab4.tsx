import { useState, useRef, useEffect, useCallback } from 'react';
import {
  type Vec3,
  type Mat4,
  identity,
  translation,
  rotationX,
  rotationY,
  rotationZ,
  scaling,
  reflectionXY,
  reflectionXZ,
  reflectionYZ,
  perspective,
  multiplyMat4,
  transformVertices,
  projectTo2D,
} from '../../utils/transform3d';

type Point2D = { x: number; y: number; z: number };
import './Lab4.css';

interface Lab4Props {
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
}

/** Default cube: vertices and edges (indices). */
const DEFAULT_CUBE: { vertices: Vec3[]; edges: [number, number][] } = {
  vertices: [
    { x: -1, y: -1, z: -1 },
    { x: 1, y: -1, z: -1 },
    { x: 1, y: 1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: 1, z: 1 },
    { x: -1, y: 1, z: 1 },
  ],
  edges: [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ],
};

/**
 * Parse 3D object file. Format: lines of "x y z" for vertices, then lines of "i j" for edges (indices from 0).
 * Blank lines separate vertices block from edges block.
 */
function parseObjectFile(text: string): { vertices: Vec3[]; edges: [number, number][] } {
  const vertices: Vec3[] = [];
  const edges: [number, number][] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let phase: 'vertices' | 'edges' = 'vertices';

  for (const line of lines) {
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length === 3) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const z = parseFloat(parts[2]);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        if (phase === 'edges') phase = 'vertices';
        vertices.push({ x, y, z });
      }
    } else if (parts.length === 2 && vertices.length > 0) {
      phase = 'edges';
      const i = parseInt(parts[0], 10);
      const j = parseInt(parts[1], 10);
      if (Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < vertices.length && j < vertices.length) {
        edges.push([i, j]);
      }
    }
  }

  return { vertices, edges };
}

function buildCompositeMatrix(
  tx: number, ty: number, tz: number,
  rotX: number, rotY: number, rotZ: number,
  sx: number, sy: number, sz: number,
  reflectXY: boolean, reflectXZ: boolean, reflectYZ: boolean,
  usePerspective: boolean,
  perspectiveDist: number
): Mat4 {
  let M: Mat4 = identity();

  // Order: scale -> rotate -> reflect -> translate -> (perspective if on)
  M = multiplyMat4(M, scaling(sx, sy, sz));
  M = multiplyMat4(M, rotationX(rotX));
  M = multiplyMat4(M, rotationY(rotY));
  M = multiplyMat4(M, rotationZ(rotZ));
  if (reflectXY) M = multiplyMat4(M, reflectionXY());
  if (reflectXZ) M = multiplyMat4(M, reflectionXZ());
  if (reflectYZ) M = multiplyMat4(M, reflectionYZ());
  M = multiplyMat4(M, translation(tx, ty, tz));
  if (usePerspective && perspectiveDist > 0) {
    M = multiplyMat4(M, perspective(perspectiveDist));
  }
  return M;
}

export default function Lab4({ mainCanvasRef, canvasWidth, canvasHeight }: Lab4Props) {
  const focusWrapRef = useRef<HTMLDivElement>(null);
  const [vertices, setVertices] = useState<Vec3[]>(DEFAULT_CUBE.vertices);
  const [edges, setEdges] = useState<[number, number][]>(DEFAULT_CUBE.edges);
  const [fileName, setFileName] = useState<string | null>(null);

  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [tz, setTz] = useState(3);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [rotZ, setRotZ] = useState(0);
  const [sx, setSx] = useState(1);
  const [sy, setSy] = useState(1);
  const [sz, setSz] = useState(1);
  const [refXY, setRefXY] = useState(false);
  const [refXZ, setRefXZ] = useState(false);
  const [refYZ, setRefYZ] = useState(false);
  const [usePerspective, setUsePerspective] = useState(false);
  const [perspectiveDist, setPerspectiveDist] = useState(5);

  const buildMatrix = useCallback(() => buildCompositeMatrix(
    tx, ty, tz, rotX, rotY, rotZ, sx, sy, sz,
    refXY, refXZ, refYZ, usePerspective, perspectiveDist
  ), [tx, ty, tz, rotX, rotY, rotZ, sx, sy, sz, refXY, refXZ, refYZ, usePerspective, perspectiveDist]);

  const STEP = 0.35;
  const ANGLE_STEP = Math.PI / 10;
  const SCALE_STEP = 0.15;

  // Автофокус на область 3D при открытии лабы
  useEffect(() => {
    const t = setTimeout(() => focusWrapRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Q, A, P — глобально на document (работают даже при потере фокуса областью 3D)
  useEffect(() => {
    const onDocKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('input, textarea, select')) return;
      if (e.code === 'KeyQ') {
        setTz((t) => t + STEP);
        e.preventDefault();
      } else if (e.code === 'KeyA') {
        setTz((t) => t - STEP);
        e.preventDefault();
      } else if (e.code === 'KeyP') {
        setUsePerspective((u) => !u);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onDocKey, true);
    return () => document.removeEventListener('keydown', onDocKey, true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const code = e.code;
    const key = e.key;

    if (code === 'KeyQ' || code === 'KeyA' || code === 'KeyP') return;

    switch (key) {
      case 'ArrowLeft':
        setTx((t) => t - STEP);
        break;
      case 'ArrowRight':
        setTx((t) => t + STEP);
        break;
      case 'ArrowDown':
        setTy((t) => t - STEP);
        break;
      case 'ArrowUp':
        setTy((t) => t + STEP);
        break;
      case '1':
        setRotX((r) => r + ANGLE_STEP);
        break;
      case '2':
        setRotY((r) => r + ANGLE_STEP);
        break;
      case '3':
        setRotZ((r) => r + ANGLE_STEP);
        break;
      case '4':
        setSx((s) => s + SCALE_STEP);
        setSy((s) => s + SCALE_STEP);
        setSz((s) => s + SCALE_STEP);
        break;
      case '5':
        setSx((s) => Math.max(0.1, s - SCALE_STEP));
        setSy((s) => Math.max(0.1, s - SCALE_STEP));
        setSz((s) => Math.max(0.1, s - SCALE_STEP));
        break;
      case '6':
        setRefXY((r) => !r);
        break;
      case '7':
        setRefXZ((r) => !r);
        break;
      case '8':
        setRefYZ((r) => !r);
        break;
      default:
        return;
    }
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
  }, []);

  // File load
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const { vertices: v, edges: ed } = parseObjectFile(text);
      if (v.length > 0) {
        setVertices(v);
        setEdges(ed.length > 0 ? ed : []);
        setFileName(file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadDefaultCube = () => {
    setVertices(DEFAULT_CUBE.vertices);
    setEdges(DEFAULT_CUBE.edges);
    setFileName(null);
  };

  const resetTransform = () => {
    setTx(0);
    setTy(0);
    setTz(3);
    setRotX(0);
    setRotY(0);
    setRotZ(0);
    setSx(1);
    setSy(1);
    setSz(1);
    setRefXY(false);
    setRefXZ(false);
    setRefYZ(false);
    setUsePerspective(false);
  };

  // Draw on main canvas
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas || vertices.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const M = buildMatrix();
    const transformed = transformVertices(vertices, M);
    const projected: Point2D[] = usePerspective
      ? transformed.map((p) => ({ x: p.x, y: p.y, z: p.z }))
      : transformed.map((p) => projectTo2D(p, 0));

    // Масштаб и центр под размер главного холста
    const VIEW_SCALE = Math.min(canvasWidth, canvasHeight) * 0.08;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    function toScreen(px: number, py: number) {
      return {
        x: cx + px * VIEW_SCALE,
        y: cy - py * VIEW_SCALE,
      };
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [i, j] of edges) {
      const a = toScreen(projected[i].x, projected[i].y);
      const b = toScreen(projected[j].x, projected[j].y);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.fillStyle = '#0066cc';
    for (const p of projected) {
      const s = toScreen(p.x, p.y);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [vertices, edges, buildMatrix, usePerspective, perspectiveDist, mainCanvasRef, canvasWidth, canvasHeight]);

  return (
    <div className="lab4-container">
      <h3>Геометрические преобразования (3D)</h3>
      <div className="lab4-controls">
        <div className="lab4-file-row">
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
          />
          <button type="button" onClick={loadDefaultCube}>
            Куб по умолчанию
          </button>
        </div>
        <div className="lab4-info">
          {fileName ? `Файл: ${fileName}` : 'Объект: куб по умолчанию'} — вершин: {vertices.length}, рёбер: {edges.length}
        </div>
        <div className="lab4-params">
          <label>
            Перспектива (d):
            <input
              type="range"
              min={2}
              max={20}
              step={0.5}
              value={perspectiveDist}
              onChange={(e) => setPerspectiveDist(Number(e.target.value))}
            />
            {perspectiveDist}
          </label>
        </div>
        <div className="lab4-keys">
          <strong>Клавиши</strong> (кликните по блоку ниже для фокуса, 3D — на главном холсте слева):<br />
          <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> — перемещение по X, Y; <kbd>Q</kbd>/<kbd>A</kbd> — по Z<br />
          <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> — поворот вокруг X, Y, Z<br />
          <kbd>4</kbd>/<kbd>5</kbd> — масштаб +/–<br />
          <kbd>6</kbd><kbd>7</kbd><kbd>8</kbd> — отражение XY, XZ, YZ<br />
          <kbd>P</kbd> — вкл/выкл перспективу
        </div>
        <p className="lab4-perspective-hint">
          <strong>Перспектива:</strong> камера смотрит по оси +Z. Чтобы картинка не «ломалась», объект должен быть перед камерой (z &gt; 0): загрузите <code>house.txt</code> или <code>pyramid.txt</code> либо сдвиньте куб вперёд клавишей <kbd>Q</kbd>.
        </p>
        <div className="lab4-reset">
          <button type="button" onClick={resetTransform}>
            Сбросить преобразования
          </button>
        </div>
      </div>
      <div className="lab4-view-status">
        <span className={`lab4-perspective-badge ${usePerspective ? 'on' : 'off'}`}>
          Перспектива: {usePerspective ? 'ВКЛ' : 'выкл'}
        </span>
        <span className="lab4-offset-info">
          Смещение: X={tx.toFixed(1)} Y={ty.toFixed(1)} Z={tz.toFixed(1)}
        </span>
      </div>
      <div
        ref={focusWrapRef}
        className="lab4-focus-wrap"
        tabIndex={0}
        role="application"
        aria-label="Управление 3D: кликните сюда и используйте стрелки, 1-8, Q, A, P"
        onClick={() => focusWrapRef.current?.focus()}
        onKeyDown={handleKeyDown}
        title="Кликните сюда, затем управляйте стрелками и клавишами 1–8, Q, A, P"
      >
        <span className="lab4-focus-hint">Кликните сюда для управления с клавиатуры. 3D-объект отображается на главном холсте.</span>
      </div>
    </div>
  );
}
