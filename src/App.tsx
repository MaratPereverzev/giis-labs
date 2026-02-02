import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './components/Home';
import { LabLayout } from './components/LabLayout';
import { LABS_CONFIG } from './labs/config';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home labs={LABS_CONFIG} />} />
        <Route path="/lab/:id" element={<LabLayout labs={LABS_CONFIG} />} />
      </Routes>
    </Router>
  )
}

export default App

