import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root');

if (!container) {
  document.body.innerHTML = '<p style="font-family:sans-serif;padding:2rem">Tura could not start: #root was not found.</p>';
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
