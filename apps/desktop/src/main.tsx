import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LucideProvider } from 'lucide-react';
import { App } from './App';
import { installCredentialTestHooks } from './credentials/client';
import { installProviderConnectionTestHooks } from './provider/connection-client';
import { installChatTestHooks } from './provider/chat-client';
import { createTauriProviderTransport, isTauriHostRuntime } from './host/tauri-provider-transport';
import { createTauriHostAuth } from './host/tauri-host-auth';
import { createBrowserHostAuth, installHostAuthTestHooks } from './host/browser-host-auth';
import { createDesktopPackageRuntime } from './composition/package-runtime';
import { createDemoWorkFixture } from './demo/client';
import './styles.css';

// Playwright 探针注入点（非 demo 装配）
installCredentialTestHooks();
installProviderConnectionTestHooks();
if (import.meta.env.DEV && import.meta.env.VITE_COURTWORK_E2E === '1') {
  installChatTestHooks();
  installHostAuthTestHooks();
}

const providerTransport = isTauriHostRuntime() ? createTauriProviderTransport() : undefined;
// HOST-AUTH-LITE：产品运行时用 Tauri 适配器；DEV/E2E 无原生 picker 时用 browser 樁（诚实失败，非 demo 回落）。
const hostAuth = isTauriHostRuntime() ? createTauriHostAuth() : createBrowserHostAuth();
const packageRuntime = createDesktopPackageRuntime();
const demoWorkFixture = createDemoWorkFixture();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LucideProvider strokeWidth={1.35}>
      <App
        providerTransport={providerTransport}
        packageRegistries={packageRuntime.packageRegistries}
        hostRenderers={packageRuntime.hostRenderers}
        workProjection={demoWorkFixture.projection}
        workFixture={demoWorkFixture}
        hostAuth={hostAuth}
      />
    </LucideProvider>
  </StrictMode>,
);
