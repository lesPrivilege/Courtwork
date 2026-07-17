import type {
  AuthorizeResult,
  HostAuthPort,
  HostGrant,
  ReadResult,
  WriteResult,
} from './host-auth-port';

/**
 * 浏览器（DEV/E2E）宿主授权樁。产品运行时用 Tauri 适配器；此樁只在无 `__TAURI_INTERNALS__`
 * 的开发/端到端环境装配，由 Playwright 经 `window.__courtworkHostAuth` 逐类驱动可见失败呈现。
 *
 * 诚实默认：浏览器没有原生 picker，`authorizeFolder` 默认 `denied`（不是 demo 回落，是真实「此环境无法授权」）。
 * 授权成功（樁设定 granted）时把 grant 并入已授权集，模拟「重启后仍可见」的持久语义。
 */

interface HostAuthScript {
  grants: HostGrant[];
  authorize: AuthorizeResult;
  read: ReadResult;
  write: WriteResult;
}

function defaultScript(): HostAuthScript {
  return {
    grants: [],
    authorize: { status: 'failed', reason: 'denied' },
    read: { status: 'failed', reason: 'unavailable' },
    write: { status: 'failed', reason: 'unavailable' },
  };
}

let script: HostAuthScript = defaultScript();

export interface HostAuthTestHooks {
  setGrants(grants: HostGrant[]): void;
  setNextAuthorize(result: AuthorizeResult): void;
  setNextRead(result: ReadResult): void;
  setNextWrite(result: WriteResult): void;
  reset(): void;
}

export function installHostAuthTestHooks(): HostAuthTestHooks {
  const hooks: HostAuthTestHooks = {
    setGrants(grants) {
      script.grants = grants;
    },
    setNextAuthorize(result) {
      script.authorize = result;
    },
    setNextRead(result) {
      script.read = result;
    },
    setNextWrite(result) {
      script.write = result;
    },
    reset() {
      script = defaultScript();
    },
  };
  if (typeof window !== 'undefined') {
    (window as unknown as { __courtworkHostAuth?: HostAuthTestHooks }).__courtworkHostAuth = hooks;
  }
  return hooks;
}

export function createBrowserHostAuth(): HostAuthPort {
  return {
    async listGrants() {
      return script.grants;
    },
    async authorizeFolder() {
      if (script.authorize.status === 'granted') {
        const { grant } = script.authorize;
        if (!script.grants.some((entry) => entry.grantId === grant.grantId)) {
          script.grants = [...script.grants, grant];
        }
      }
      return script.authorize;
    },
    async readFile() {
      return script.read;
    },
    async writeFile(input) {
      // PILOT-LIVE-2 F：写放行时镜像进材料宿主樁——真宿主 write_in_grant 与材料读同盘天然一致，
      // 樁世界须同构，否则「写入项目文件夹→按 grant 路径入库」在 E2E 不可组合。仅 DEV+E2E 樁文件。
      if (script.write.status === 'wrote') {
        (window as {
          __courtworkMaterialHost?: { setFile(grantId: string, relativePath: string, bytes: Uint8Array): void };
        }).__courtworkMaterialHost?.setFile(input.grantId, input.relativePath, input.bytes);
        return { status: 'wrote', byteLength: input.bytes.byteLength };
      }
      return script.write;
    },
  };
}
