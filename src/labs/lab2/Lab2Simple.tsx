import { useState } from 'react';
import {
  drawCircleBresenham,
  drawEllipseBresenham,
  drawParabolaBresenham,
  drawHyperbolaBresenham,
  type Point,
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

  // Применить кривую второго порядка
  const applyCurve = () => {
    if (controlPoints.length === 0) {
      alert('Выберите центр кривой на холсте');
      return;
    }

    const centerPoint = controlPoints[0];
    let points: Point[] = [];
    let title = '';

    if (curveType === 'circle') {
      title = 'Окружность';
      points = drawCircleBresenham(centerPoint.x, centerPoint.y, circleRadius);
    } else if (curveType === 'ellipse') {
      title = 'Эллипс';
      points = drawEllipseBresenham(centerPoint.x, centerPoint.y, ellipseA, ellipseB);
    } else if (curveType === 'parabola') {
      title = 'Парабола';
      const maxLen = Math.max(ellipseA, ellipseB, circleRadius) * 2;
      points = drawParabolaBresenham(centerPoint.x, centerPoint.y, parabolaP, maxLen);
    } else if (curveType === 'hyperbola') {
      title = 'Гипербола';
      points = drawHyperbolaBresenham(centerPoint.x, centerPoint.y, hyperbolaA, hyperbolaB);
    }

    onCurveApply(points, title);
  };

  return (
    <div className="lab-panel lab2-panel">
      <h3>Кривые второго порядка</h3>

      {/* Выбор типа кривой */}
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
          <button
            className={`curve-btn ${curveType === 'hyperbola' ? 'active' : ''}`}
            onClick={() => setCurveType('hyperbola')}
          >
            Гипербола
          </button>
        </div>
      </div>

      {/* Параметры круга */}
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

      {/* Параметры эллипса */}
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

      {/* Параметры параболы */}
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

      {/* Параметры гиперболы */}
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

      {/* Кнопка применения */}
      <button className="apply-btn" onClick={applyCurve}>
        Нарисовать кривую
      </button>

      {/* Описание */}
      <div className="algo-description">
        {curveType === 'circle' && <p><strong>Окружность:</strong> Алгоритм Брезенхема с 8-симметрией</p>}
        {curveType === 'ellipse' && <p><strong>Эллипс:</strong> Алгоритм средней точки с двумя регионами</p>}
        {curveType === 'parabola' && <p><strong>Парабола:</strong> Вертикальная парабола x²=2py</p>}
        {curveType === 'hyperbola' && <p><strong>Гипербола:</strong> Аналитический метод с плавными ветвями</p>}
      </div>
    </div>
  );
}
