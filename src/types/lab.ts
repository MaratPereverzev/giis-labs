export interface Lab {
  id: number;
  title: string;
  description: string;
  path: string;
  component: React.ComponentType<any>;
}
