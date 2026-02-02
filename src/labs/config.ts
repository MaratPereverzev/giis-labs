import type { Lab } from '../types/lab';
import { Lab1 } from './lab1/Lab1';
import { Lab2 } from './lab2/Lab2';

export const LABS_CONFIG: Lab[] = [
  {
    id: 1,
    title: 'Построение отрезков',
    description: 'Алгоритмы растеризации линий: DDA, Брезенхем, Ву',
    path: 'lab1',
    component: Lab1,
  },
  {
    id: 2,
    title: 'Линии второго порядка',
    description: 'Алгоритмы Брезенхема для окружности, эллипса, параболы',
    path: 'lab2',
    component: Lab2,
  },
];
