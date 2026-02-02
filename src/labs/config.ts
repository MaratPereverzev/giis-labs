import type { Lab } from '../types/lab';
import { Lab1 } from './lab1/Lab1';

export const LABS_CONFIG: Lab[] = [
  {
    id: 1,
    title: 'Построение отрезков',
    description: 'Алгоритмы растеризации линий: DDA, Брезенхем, Ву',
    path: 'lab1',
    component: Lab1,
  },
];
