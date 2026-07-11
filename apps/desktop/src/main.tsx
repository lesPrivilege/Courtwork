import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LucideProvider } from 'lucide-react';
import { App } from './App';
import { installCredentialTestHooks } from './credentials/client';
import { installProviderConnectionTestHooks } from './provider/connection-client';
import './styles.css';

// Playwright 三态探针注入点（非 demo 装配）
installCredentialTestHooks();
installProviderConnectionTestHooks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LucideProvider strokeWidth={1.35}>
      <App />
    </LucideProvider>
  </StrictMode>,
);
