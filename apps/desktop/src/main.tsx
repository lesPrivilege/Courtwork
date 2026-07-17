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
import { MaterialStore } from './material/material-store';
import { createBrowserMaterialHost, installMaterialHostTestHooks } from './material/material-store';
import { createTauriMaterialHost } from './material/tauri-material-host';
import { createDesktopPackageRuntime } from './composition/package-runtime';
import { createDemoWorkFixture } from './demo/client';
import { createDesktopWorkCommand, installWorkTestHooks } from './work/work-runtime';
import { createTauriWorkStateHost } from './work/tauri-work-state-host';
import { loadModelConfig } from './provider/model-config';
import './styles.css';

// Playwright 探针注入点（非 demo 装配）
installCredentialTestHooks();
installProviderConnectionTestHooks();
const providerTransport = isTauriHostRuntime() ? createTauriProviderTransport() : undefined;
// HOST-AUTH-LITE：产品运行时用 Tauri 适配器；DEV/E2E 无原生 picker 时用 browser 樁（诚实失败，非 demo 回落）。
const hostAuth = isTauriHostRuntime() ? createTauriHostAuth() : createBrowserHostAuth();
// MATERIAL-INGRESS-1：产品运行时经 src-tauri 命令持久；DEV/E2E 用内存宿主（绝不进正式 Tauri composition）。
const materialHost = isTauriHostRuntime() ? createTauriMaterialHost() : createBrowserMaterialHost();
const materialStore = new MaterialStore(materialHost);
// WORK-HOST-1：产品运行时注入 Tauri WorkState opaque-blob 宿主（跨重启耐久持久，ADR-010 决定二）；
// DEV/E2E 留空 → work-runtime 缺省内存参考实现（跨 store 实例存活，供樁宿主 replay/resume 反例，不跨真机重启）。
const workHost = isTauriHostRuntime() ? createTauriWorkStateHost() : undefined;

if (import.meta.env.DEV && import.meta.env.VITE_COURTWORK_E2E === '1') {
  installChatTestHooks();
  installHostAuthTestHooks();
  installMaterialHostTestHooks();
  installWorkTestHooks();
}

const packageRuntime = createDesktopPackageRuntime();
const demoWorkFixture = createDemoWorkFixture();
// WORK-LIVE-1：production Work 命令端口（进程内 callback）。生产 host=Tauri WorkState 宿主（WORK-HOST-1，
// 跨真机重启耐久）；DEV/E2E host=work-runtime 缺省内存参考实现。provider 走注入 transport（生产 DeepSeek）/
// DEV+E2E 走 Work turn 樁。
const workCommand = createDesktopWorkCommand({
  registries: packageRuntime.packageRegistries,
  materialResolver: materialStore,
  providerConfig: () => loadModelConfig(),
  ...(providerTransport ? { transport: providerTransport } : {}),
  ...(workHost ? { host: workHost } : {}),
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LucideProvider strokeWidth={1.35}>
      <App
        providerTransport={providerTransport}
        packageRegistries={packageRuntime.packageRegistries}
        hostRenderers={packageRuntime.hostRenderers}
        workProjection={demoWorkFixture.projection}
        workFixture={demoWorkFixture}
        workCommand={workCommand}
        hostAuth={hostAuth}
        materialStore={materialStore}
      />
    </LucideProvider>
  </StrictMode>,
);
