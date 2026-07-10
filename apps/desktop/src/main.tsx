import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LucideProvider } from 'lucide-react';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LucideProvider strokeWidth={1.35}>
      <App />
    </LucideProvider>
  </StrictMode>,
);
