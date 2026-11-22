import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Kun latin-tegnsæt (dækker æ, ø, å), så offline-cachen holdes lille.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Mangler #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
