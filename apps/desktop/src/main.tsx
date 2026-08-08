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
import { createLegalWorkSurface } from './work/legal-work-surface';
import { createDesktopPackageRuntime } from './composition/package-runtime';
import { createCaseRegistriesResolver } from './composition/matter-registries';
import { readCaseList } from './case/case-store';
import { createDemoWorkFixture } from './demo/client';
import { createDesktopWorkCommand, installWorkTestHooks } from './work/work-runtime';
import { createTauriWorkStateHost } from './work/tauri-work-state-host';
import { createTauriPiLane } from './pi/tauri-pi-lane';
import { createBrowserPiLane, installPiLaneTestHooks } from './pi/browser-pi-lane';
import { loadSettings } from './settings/settings-store';
import { installDesktopThemeController } from './settings/theme-controller';
import './styles.css';

installDesktopThemeController();

const providerTransport = isTauriHostRuntime() ? createTauriProviderTransport() : undefined;
// HOST-AUTH-LITE：产品运行时用 Tauri 适配器；DEV/E2E 无原生 picker 时用 browser 樁（诚实失败，非 demo 回落）。
const hostAuth = isTauriHostRuntime() ? createTauriHostAuth() : createBrowserHostAuth();
// MATERIAL-INGRESS-1：产品运行时经 src-tauri 命令持久；DEV/E2E 用内存宿主（绝不进正式 Tauri composition）。
const materialHost = isTauriHostRuntime() ? createTauriMaterialHost() : createBrowserMaterialHost();
const materialStore = new MaterialStore(materialHost);
// WORK-HOST-1：产品运行时注入 Tauri WorkState opaque-blob 宿主（跨重启耐久持久，ADR-010 决定二）；
// DEV/E2E 留空 → work-runtime 缺省内存参考实现（跨 store 实例存活，供樁宿主 replay/resume 反例，不跨真机重启）。
const workHost = isTauriHostRuntime() ? createTauriWorkStateHost() : undefined;
// PI-LANE-UI-1：产品运行时经 pi 线的 Tauri 薄壳；DEV/E2E 用 scripted 樁（ADR-022 六-C harness
// 注入面）。樁产的是账本形状的记录，不是产品事实——没有真 sidecar、真模型或真落盘。
const piLane = isTauriHostRuntime() ? createTauriPiLane() : createBrowserPiLane();

if (import.meta.env.DEV && import.meta.env.VITE_COURTWORK_E2E === '1') {
  installCredentialTestHooks();
  installProviderConnectionTestHooks();
  installChatTestHooks();
  installHostAuthTestHooks();
  installMaterialHostTestHooks();
  installWorkTestHooks();
  installPiLaneTestHooks();
}

const packageRuntime = createDesktopPackageRuntime();
// PILOT-LIVE-1-FIX #2：demo 回放逐事件延时可被 E2E 经 addInitScript 预设归零（residue 谱消除
// 「负载下回放时长 < 等待上限」的时序赌注；事件仍全量逐序发布，终点由条件等待把守）。
// 与其余测试钩子同双门，正式 Tauri composition 与生产构建永不读取。
const demoReplayDelayOverride =
  import.meta.env.DEV && import.meta.env.VITE_COURTWORK_E2E === '1'
    ? (window as { __courtworkDemoReplayDelayMs?: number }).__courtworkDemoReplayDelayMs
    : undefined;
const demoWorkFixture = createDemoWorkFixture(
  typeof demoReplayDelayOverride === 'number' ? { replayDelayMs: demoReplayDelayOverride } : {},
);
// WORK-LIVE-1：production Work 命令端口（进程内 callback）。生产 host=Tauri WorkState 宿主（WORK-HOST-1，
// 跨真机重启耐久）；DEV/E2E host=work-runtime 缺省内存参考实现。provider 走注入 transport（生产 DeepSeek）/
// DEV+E2E 走 Work turn 樁。
// ADR-015 决定三（2026-08-08）：production 命令的垂类执行授权只认 matter 当下绑定。
// 组合根注入「按 caseId 现读 canonical case store → 解析生效 registry」的依赖；
// 全局 registry 留给准入、目录与既有信封/产物解码。
const registriesForCase = createCaseRegistriesResolver({
  readCases: () => readCaseList(),
  availablePackageIds: packageRuntime.packageIds,
  registriesFor: packageRuntime.registriesFor,
});
const workCommand = createDesktopWorkCommand({
  registries: packageRuntime.packageRegistries,
  registriesForCase,
  materialResolver: materialStore,
  loadRuntimeLimits: () => loadSettings().runtimeGuard,
  ...(providerTransport ? { transport: providerTransport } : {}),
  ...(workHost ? { host: workHost } : {}),
});

const verticalWorkSurface = createLegalWorkSurface({ workCommand });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LucideProvider strokeWidth={1.35}>
      <App
        providerTransport={providerTransport}
        packageRegistries={packageRuntime.packageRegistries}
        hostRenderers={packageRuntime.hostRenderers}
        registriesFor={packageRuntime.registriesFor}
        availablePackageIds={packageRuntime.packageIds}
        packCatalog={packageRuntime.packageCatalog}
        workProjection={demoWorkFixture.projection}
        workFixture={demoWorkFixture}
        verticalWorkSurface={verticalWorkSurface}
        hostAuth={hostAuth}
        materialStore={materialStore}
        piLane={piLane}
      />
    </LucideProvider>
  </StrictMode>,
);
