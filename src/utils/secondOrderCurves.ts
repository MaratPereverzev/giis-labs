// Точка на пиксельной сетке
export interface Point {
	x: number;
	y: number;
}

// Информация для пошагового режима (отладки)
export interface StepInfo extends Point {
	// целочисленное значение решения/ошибки, используется для отображения Δi
	deltaI: number;
	// тип шага: горизонтальный (H), вертикальный (V) или диагональный (D)
	stepType: 'H' | 'V' | 'D';
}

// ============================================================
// КРУГ: алгоритм Брезенхэма (целочисленный, 8-симметрий)
// Возвращает массив пикселей, покрывающих окружность радиуса R.
// Применяет 8-симметрию: строим только одну октаву и зеркалим.
// ============================================================
export function drawCircleBresenham(
	centerX: number,
	centerY: number,
	radius: number
): Point[] {
	const points: Point[] = [];

	// начальные условия
	let x = 0;
	let y = radius;
	// Δi — целочисленная функция решения
	let deltaI = 2 * (1 - radius);

	// Проходим октаву: x растёт, y уменьшается по мере необходимости
	while (x <= y) {
		// добавляем 8 симметричных пикселей
		plotCirclePoints(points, centerX, centerY, x, y);

		// решение на основе deltaI: выбираем между горизонтальным, вертикальным и диагональным шагом
		if (deltaI < 0) {
			const d = 2 * (deltaI + y) - 1;
			if (d <= 0) {
				// горизонтальный шаг: x++
				deltaI = deltaI + 4 * x + 6;
			} else {
				// диагональный шаг: x++, y--
				deltaI = deltaI + 4 * (x - y) + 10;
				y--;
			}
		} else if (deltaI > 0) {
			const d = 2 * (deltaI - x) - 1;
			if (d <= 0) {
				// вертикальный шаг: y--
				deltaI = deltaI - 4 * y + 10;
				y--;
			} else {
				// диагональный шаг
				deltaI = deltaI + 4 * (x - y) + 10;
				y--;
			}
		} else {
			// ровно ноль — берем диагональ
			deltaI = deltaI + 4 * (x - y) + 10;
			y--;
		}

		// увеличиваем x — идём по октаве
		x++;
	}

	return points;
}

// Версия круга, возвращающая подробные шаги (для режима пошаговой отладки)
export function drawCircleBresenhamDebug(
	centerX: number,
	centerY: number,
	radius: number
): StepInfo[] {
	const steps: StepInfo[] = [];

	let x = 0;
	let y = radius;
	let deltaI = 2 * (1 - radius);

	// Для каждой итерации добавляем 8 записей с одинаковым deltaI (симметрия)
	while (x <= y) {
		const stepType: 'H' | 'V' | 'D' = 'D';
		steps.push(
			{ x: centerX + x, y: centerY + y, deltaI, stepType },
			{ x: centerX - x, y: centerY + y, deltaI, stepType },
			{ x: centerX + x, y: centerY - y, deltaI, stepType },
			{ x: centerX - x, y: centerY - y, deltaI, stepType },
			{ x: centerX + y, y: centerY + x, deltaI, stepType },
			{ x: centerX - y, y: centerY + x, deltaI, stepType },
			{ x: centerX + y, y: centerY - x, deltaI, stepType },
			{ x: centerX - y, y: centerY - x, deltaI, stepType }
		);

		// Обновление решения аналогично основной функции
		if (deltaI < 0) {
			const d = 2 * (deltaI + y) - 1;
			if (d <= 0) {
				deltaI = deltaI + 4 * x + 6;
			} else {
				deltaI = deltaI + 4 * (x - y) + 10;
				y--;
			}
		} else if (deltaI > 0) {
			const d = 2 * (deltaI - x) - 1;
			if (d <= 0) {
				deltaI = deltaI - 4 * y + 10;
				y--;
			} else {
				deltaI = deltaI + 4 * (x - y) + 10;
				y--;
			}
		} else {
			deltaI = deltaI + 4 * (x - y) + 10;
			y--;
		}

		x++;
	}

	return steps;
}

// Вспомогательная функция: добавляет 8 симметричных точек круга в массив
function plotCirclePoints(points: Point[], cx: number, cy: number, x: number, y: number) {
	points.push(
		{ x: cx + x, y: cy + y },
		{ x: cx - x, y: cy + y },
		{ x: cx + x, y: cy - y },
		{ x: cx - x, y: cy - y },
		{ x: cx + y, y: cy + x },
		{ x: cx - y, y: cy + x },
		{ x: cx + y, y: cy - x },
		{ x: cx - y, y: cy - x }
	);
}

// ============================================================
// ЭЛЛИПС: алгоритм середины (midpoint), целочисленный
// Алгоритм делится на две области (region1, region2).
// Используем 4-симметрию: строим первую четверть и зеркалим.
// Если a === b, эллипс является кругом — используем быстрый путь.
// ============================================================
export function drawEllipseBresenham(
	centerX: number,
	centerY: number,
	a: number,
	b: number
): Point[] {
	const points: Point[] = [];

	// Быстрый путь: если полуоси равны, это круг
	if (a === b) return drawCircleBresenham(centerX, centerY, a);

	// начальные координаты в первой четверти
	let x = 0;
	let y = b;
	const a2 = a * a;
	const b2 = b * b;

	// Параметры для области 1
	let dx = 2 * b2 * x;
	let dy = 2 * a2 * y;
	let d1 = Math.floor(b2 - a2 * b + a2 / 4);

	// Область 1: пока dx < dy
	while (dx < dy) {
		plotEllipsePoints(points, centerX, centerY, x, y);
		if (d1 < 0) {
			// горизонтальный шаг: x++
			x++;
			dx += 2 * b2;
			d1 += dx + b2;
		} else {
			// диагональный шаг: x++, y--
			x++;
			y--;
			dx += 2 * b2;
			dy -= 2 * a2;
			d1 += dx - dy + b2;
		}
	}

	// Область 2: пока y >= 0
	let d2 = Math.floor(b2 * (x * x + x + 0.25) + a2 * (y * y - 2 * y + 1) - a2 * b2);
	while (y >= 0) {
		plotEllipsePoints(points, centerX, centerY, x, y);
		if (d2 > 0) {
			// вертикальный шаг: y--
			y--;
			dy -= 2 * a2;
			d2 += a2 - dy;
		} else {
			// диагональный шаг: x++, y--
			x++;
			dx += 2 * b2;
			y--;
			dy -= 2 * a2;
			d2 += dx - dy + a2;
		}
	}

	return points;
}

// Debug-версия эллипса: возвращает шаги с Δi и типом шага
export function drawEllipseBresenhamDebug(
	centerX: number,
	centerY: number,
	a: number,
	b: number
): StepInfo[] {
	const steps: StepInfo[] = [];

	if (a === b) return drawCircleBresenhamDebug(centerX, centerY, a);

	let x = 0;
	let y = b;
	const a2 = a * a;
	const b2 = b * b;

	// Область 1
	let dx = 2 * b2 * x;
	let dy = 2 * a2 * y;
	let d1 = Math.floor(b2 - a2 * b + a2 / 4);
	while (dx < dy) {
		const stepType: 'H' | 'D' = d1 < 0 ? 'H' : 'D';
		plotEllipsePointsDebug(steps, centerX, centerY, x, y, d1, stepType);

		if (d1 < 0) {
			x++;
			dx += 2 * b2;
			d1 += dx + b2;
		} else {
			x++;
			y--;
			dx += 2 * b2;
			dy -= 2 * a2;
			d1 += dx - dy + b2;
		}
	}

	// Область 2
	let d2 = Math.floor(b2 * (x * x + x + 0.25) + a2 * (y * y - 2 * y + 1) - a2 * b2);
	while (y >= 0) {
		const stepType: 'V' | 'D' = d2 > 0 ? 'V' : 'D';
		plotEllipsePointsDebug(steps, centerX, centerY, x, y, d2, stepType);

		if (d2 > 0) {
			y--;
			dy -= 2 * a2;
			d2 += a2 - dy;
		} else {
			x++;
			dx += 2 * b2;
			y--;
			dy -= 2 * a2;
			d2 += dx - dy + a2;
		}
	}

	return steps;
}

// Добавляет 4 симметричных точки эллипса в массив (четверть -> 4-симметрия)
function plotEllipsePoints(points: Point[], cx: number, cy: number, x: number, y: number) {
	points.push(
		{ x: cx + x, y: cy + y },
		{ x: cx - x, y: cy + y },
		{ x: cx + x, y: cy - y },
		{ x: cx - x, y: cy - y }
	);
}

// Добавляет 4 симметричных шага в debug-список вместе с deltaI и типом шага
function plotEllipsePointsDebug(
	steps: StepInfo[],
	cx: number,
	cy: number,
	x: number,
	y: number,
	deltaI: number,
	stepType: 'H' | 'V' | 'D'
) {
	steps.push(
		{ x: cx + x, y: cy + y, deltaI, stepType },
		{ x: cx - x, y: cy + y, deltaI, stepType },
		{ x: cx + x, y: cy - y, deltaI, stepType },
		{ x: cx - x, y: cy - y, deltaI, stepType }
	);
}

// ============================================================
// ПАРАБОЛА — целочисленный генератор ветвей
// Замечание по ориентации: в системе координат canvas значение y растёт вниз.
// Здесь реализована вертикальная парабола (ось симметрии — вертикаль):
// уравнение x^2 = 2*p*y  =>  y = x^2/(2p). Чтобы ветви на экране были "вверх",
// используем экранную координату vertexY - y.
// ============================================================
export function drawParabolaBresenham(
	vertexX: number,
	vertexY: number,
	p: number,
	maxLength: number = 100
): Point[] {
	const points: Point[] = [];
	// ограничиваем горизонтальную длину по x для стабильности
	const maxX = Math.max(0, Math.min(400, maxLength));

	// Вертикальная парабола: генерируем по x, вычисляем y = floor(x^2/(2p)).
	for (let x = 0; x <= maxX; x++) {
		const numerator = x * x + p; // +p для корректного округления
		const denom = 2 * p || 1; // защита от деления на ноль
		const y = Math.floor(numerator / denom);

		// добавляем две симметричные точки относительно вертикальной оси вершины
		points.push({ x: vertexX + x, y: vertexY - y }, { x: vertexX - x, y: vertexY - y });
	}

	return points;
}

// Debug-версия параболы: возвращает массив StepInfo с deltaI и шагами
export function drawParabolaBresenhamDebug(
	vertexX: number,
	vertexY: number,
	p: number,
	maxLength: number = 100
): StepInfo[] {
	const steps: StepInfo[] = [];
	const maxX = Math.max(0, Math.min(400, maxLength));
	let prevY = 0;

	for (let x = 0; x <= maxX; x++) {
		const numerator = x * x + p;
		const denom = 2 * p || 1;
		const y = Math.floor(numerator / denom);

		// простая оценка ошибки (информативна): x^2 - 2*p*y
		const deltaI = x * x - 2 * p * y;

		// тип шага: если y вырос — был диагональный шаг, иначе горизонтальный
		const stepType: 'H' | 'V' | 'D' = y > prevY ? 'D' : 'H';

		steps.push({ x: vertexX + x, y: vertexY - y, deltaI, stepType });
		steps.push({ x: vertexX - x, y: vertexY - y, deltaI, stepType });

		prevY = y;
	}

	return steps;
}
