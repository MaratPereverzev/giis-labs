import { useNavigate, useParams } from 'react-router-dom';
import type { Lab } from '../types/lab';
import '../styles/LabLayout.css';

interface LabLayoutProps {
  labs: Lab[];
}

export function LabLayout({ labs }: LabLayoutProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const labId = parseInt(id || '1');
  const currentLab = labs.find((lab) => lab.id === labId);

  if (!currentLab) {
    return (
      <div className="lab-not-found">
        <h2>Лабораторная работа не найдена</h2>
        <button onClick={() => navigate('/')}>Вернуться в меню</button>
      </div>
    );
  }

  const LabComponent = currentLab.component;

  return (
    <div className="lab-layout">
      <nav className="lab-navbar">
        <button className="nav-back" onClick={() => navigate('/')}>
          Главное меню
        </button>
        <h2>{currentLab.title}</h2>
        <div className="lab-navigation" style={{ visibility: 'hidden' }}>
          <button
            className="nav-prev"
            onClick={() => navigate(`/lab/${Math.max(1, labId - 1)}`)}
            disabled={labId === 1}
          >
            Пред
          </button>
          <span className="lab-counter">{labId} / 1</span>
          <button
            className="nav-next"
            onClick={() => navigate(`/lab/${Math.min(1, labId + 1)}`)}
            disabled={labId === 1}
          >
            След
          </button>
        </div>
      </nav>


      <div className="lab-content">
        <LabComponent />
      </div>
    </div>
  );
}
