import { useNavigate } from 'react-router-dom';
import type { Lab } from '../types/lab';
import '../styles/Home.css';

interface HomeProps {
  labs: Lab[];
}

export function Home({ labs }: HomeProps) {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="home-header">
      </header>

      <div className="labs-grid">
        {labs.map((lab) => (
          <button
            key={lab.id}
            className="lab-card"
            onClick={() => navigate(`/lab/${lab.id}`)}
          >
            <div className="lab-number">Лаб {lab.id}</div>
            <h3>{lab.title}</h3>
            <p>{lab.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
