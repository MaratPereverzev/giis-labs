// Интерперлляция и аппроксимация кривых

export interface Point {
	x: number;
	y: number;
}

export interface CurveStep extends Point {
	// Информация о текущем шаге интерполяции/аппроксимации
	stepIndex: number;
	totalSteps: number;
	description: string;
}

// ============================================================
// ИНТЕРПОЛЯЦИЯ ЭРМИТА
// Для 4 контрольных точек: P0, P1 и два вектора касательной (T0, T1)
// Строит кубический полином через P0 и P1 с заданными касательными
// ============================================================
export function hermiteInterpolation(
	P0: Point,
	P1: Point,
	T0: Point, // вектор касательной в P0
	T1: Point, // вектор касательной в P1
	steps: number = 100
): Point[] {
	const points: Point[] = [];

	for (let i = 0; i <= steps; i++) {
		const t = i / steps; // параметр от 0 до 1

		// базовые функции Эрмита
		const h00 = 2 * t * t * t - 3 * t * t + 1;  // начальна позиция
		const h10 = t * t * t - 2 * t * t + t;       // начальна касательная
		const h01 = -2 * t * t * t + 3 * t * t;      // конечная позиция
		const h11 = t * t * t - t * t;               // конечная касательная

		// интерполяция координат: P(t) = h00*P0 + h10*T0 + h01*P1 + h11*T1
		const x = h00 * P0.x + h10 * T0.x + h01 * P1.x + h11 * T1.x;
		const y = h00 * P0.y + h10 * T0.y + h01 * P1.y + h11 * T1.y;

		points.push({ x: Math.round(x), y: Math.round(y) });
	}

	return points;
}

// Debug версия интерполяции Эрмита с пошаговой информацией
export function hermiteInterpolationDebug(
	P0: Point,
	P1: Point,
	T0: Point,
	T1: Point,
	steps: number = 100
): CurveStep[] {
	const points: CurveStep[] = [];

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;

		const h00 = 2 * t * t * t - 3 * t * t + 1;
		const h10 = t * t * t - 2 * t * t + t;
		const h01 = -2 * t * t * t + 3 * t * t;
		const h11 = t * t * t - t * t;

		const x = h00 * P0.x + h10 * T0.x + h01 * P1.x + h11 * T1.x;
		const y = h00 * P0.y + h10 * T0.y + h01 * P1.y + h11 * T1.y;

		points.push({
			x: Math.round(x),
			y: Math.round(y),
			stepIndex: i,
			totalSteps: steps,
			description: `Эрмит t=${t.toFixed(2)}`
		});
	}

	return points;
}

// ============================================================
// КРИВАЯ БЕЗЬЕ (квадратичная и кубическая)
// Параметрическая кривая, определяемая контрольными точками
// ============================================================

// Квадратичная кривая Безье (3 контрольные точки)
export function quadraticBezier(
	P0: Point,
	P1: Point,
	P2: Point,
	steps: number = 50
): Point[] {
	const points: Point[] = [];

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const s = 1 - t;

		// формула: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
		const x = s * s * P0.x + 2 * s * t * P1.x + t * t * P2.x;
		const y = s * s * P0.y + 2 * s * t * P1.y + t * t * P2.y;

		points.push({ x: Math.round(x), y: Math.round(y) });
	}

	return points;
}

// Кубическая кривая Безье (4 контрольные точки)
export function cubicBezier(
	P0: Point,
	P1: Point,
	P2: Point,
	P3: Point,
	steps: number = 100
): Point[] {
	const points: Point[] = [];

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const s = 1 - t;

		// формула: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
		const b0 = s * s * s;
		const b1 = 3 * s * s * t;
		const b2 = 3 * s * t * t;
		const b3 = t * t * t;

		const x = b0 * P0.x + b1 * P1.x + b2 * P2.x + b3 * P3.x;
		const y = b0 * P0.y + b1 * P1.y + b2 * P2.y + b3 * P3.y;

		points.push({ x: Math.round(x), y: Math.round(y) });
	}

	return points;
}

// Debug версия Безье
export function cubicBezierDebug(
	P0: Point,
	P1: Point,
	P2: Point,
	P3: Point,
	steps: number = 100
): CurveStep[] {
	const points: CurveStep[] = [];

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const s = 1 - t;

		const b0 = s * s * s;
		const b1 = 3 * s * s * t;
		const b2 = 3 * s * t * t;
		const b3 = t * t * t;

		const x = b0 * P0.x + b1 * P1.x + b2 * P2.x + b3 * P3.x;
		const y = b0 * P0.y + b1 * P1.y + b2 * P2.y + b3 * P3.y;

		points.push({
			x: Math.round(x),
			y: Math.round(y),
			stepIndex: i,
			totalSteps: steps,
			description: `Безье t=${t.toFixed(2)}`
		});
	}

	return points;
}

// ============================================================
// B-СПЛАЙНЫ
// Гладкой кривой через множество контрольных точек
// Используем кубические B-сплайны с открытым узловым вектором
// ============================================================
export function bSpline(
	controlPoints: Point[],
	steps: number = 50
): Point[] {
	const points: Point[] = [];

	if (controlPoints.length < 4) {
		// Если меньше 4 точек, просто соединяем их линией
		for (let i = 0; i < controlPoints.length - 1; i++) {
			const p0 = controlPoints[i];
			const p1 = controlPoints[i + 1];
			const lineSteps = Math.max(10, steps / (controlPoints.length - 1));
			for (let j = 0; j <= lineSteps; j++) {
				const t = j / lineSteps;
				points.push({
					x: Math.round(p0.x + t * (p1.x - p0.x)),
					y: Math.round(p0.y + t * (p1.y - p0.y))
				});
			}
		}
		return points;
	}

	// Кубические B-сплайны: каждый отрезок определяется 4 контрольными точками
	const n = controlPoints.length - 1;

	for (let k = 0; k < n; k++) {
		// Берём 4 точки для текущего сегмента
		const P0 = controlPoints[Math.max(0, k - 1)];
		const P1 = controlPoints[k];
		const P2 = controlPoints[k + 1];
		const P3 = controlPoints[Math.min(n, k + 2)];

		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			const t2 = t * t;
			const t3 = t2 * t;

			// базовые функции кубического B-сплайна
			const b0 = (1 - 3 * t + 3 * t2 - t3) / 6;
			const b1 = (4 - 6 * t2 + 3 * t3) / 6;
			const b2 = (1 + 3 * t + 3 * t2 - 3 * t3) / 6;
			const b3 = t3 / 6;

			const x = b0 * P0.x + b1 * P1.x + b2 * P2.x + b3 * P3.x;
			const y = b0 * P0.y + b1 * P1.y + b2 * P2.y + b3 * P3.y;

			points.push({ x: Math.round(x), y: Math.round(y) });
		}
	}

	return points;
}

// Debug версия B-сплайнов
export function bSplineDebug(
	controlPoints: Point[],
	steps: number = 50
): CurveStep[] {
	const points: CurveStep[] = [];
	let stepCount = 0;
	const totalSteps = controlPoints.length * steps;

	if (controlPoints.length < 4) {
		for (let i = 0; i < controlPoints.length - 1; i++) {
			const p0 = controlPoints[i];
			const p1 = controlPoints[i + 1];
			const lineSteps = Math.max(10, steps / (controlPoints.length - 1));
			for (let j = 0; j <= lineSteps; j++) {
				const t = j / lineSteps;
				points.push({
					x: Math.round(p0.x + t * (p1.x - p0.x)),
					y: Math.round(p0.y + t * (p1.y - p0.y)),
					stepIndex: stepCount++,
					totalSteps,
					description: `B-сплайн сегмент ${i + 1}`
				});
			}
		}
		return points;
	}

	const n = controlPoints.length - 1;

	for (let k = 0; k < n; k++) {
		const P0 = controlPoints[Math.max(0, k - 1)];
		const P1 = controlPoints[k];
		const P2 = controlPoints[k + 1];
		const P3 = controlPoints[Math.min(n, k + 2)];

		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			const t2 = t * t;
			const t3 = t2 * t;

			const b0 = (1 - 3 * t + 3 * t2 - t3) / 6;
			const b1 = (4 - 6 * t2 + 3 * t3) / 6;
			const b2 = (1 + 3 * t + 3 * t2 - 3 * t3) / 6;
			const b3 = t3 / 6;

			const x = b0 * P0.x + b1 * P1.x + b2 * P2.x + b3 * P3.x;
			const y = b0 * P0.y + b1 * P1.y + b2 * P2.y + b3 * P3.y;

			points.push({
				x: Math.round(x),
				y: Math.round(y),
				stepIndex: stepCount++,
				totalSteps,
				description: `B-сплайн: сегмент ${k + 1}/${n}, t=${t.toFixed(2)}`
			});
		}
	}

	return points;
}
