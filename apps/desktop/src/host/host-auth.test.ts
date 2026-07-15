import { beforeEach, describe, expect, it } from 'vitest';
import {
  HOST_AUTH_REASONS,
  HOST_AUTH_REASON_COPY,
  hostAuthReasonCopy,
  type HostAuthReason,
  type HostGrant,
} from './host-auth-port';
import { createBrowserHostAuth, installHostAuthTestHooks } from './browser-host-auth';

describe('host-auth-port failure taxonomy', () => {
  it('闭集恰为四类，顺序稳定', () => {
    expect(HOST_AUTH_REASONS).toEqual(['denied', 'revoked', 'unavailable', 'out_of_scope']);
  });

  it('每类失败都有非空、互异的可见文案，且不泄漏绝对路径/技术细节', () => {
    const copies = HOST_AUTH_REASONS.map((reason) => hostAuthReasonCopy(reason));
    for (const copy of copies) {
      expect(copy.trim().length).toBeGreaterThan(0);
      expect(copy).not.toMatch(/[/\\]Users[/\\]|[A-Za-z]:\\|grantId|canonicalize/);
    }
    expect(new Set(copies).size).toBe(HOST_AUTH_REASONS.length);
    // 映射表恰好覆盖闭集，无多余键
    expect(Object.keys(HOST_AUTH_REASON_COPY).sort()).toEqual([...HOST_AUTH_REASONS].sort());
  });
});

describe('browser host-auth adapter (DEV/E2E 樁)', () => {
  let hooks: ReturnType<typeof installHostAuthTestHooks>;

  beforeEach(() => {
    hooks = installHostAuthTestHooks();
    hooks.reset();
  });

  it('浏览器无原生 picker：默认授权为诚实 denied，非 demo 回落', async () => {
    const host = createBrowserHostAuth();
    const result = await host.authorizeFolder();
    expect(result).toEqual({ status: 'failed', reason: 'denied' });
    expect(await host.listGrants()).toEqual([]);
  });

  it('四类失败逐一经樁到达客户端，无静默降级', async () => {
    const host = createBrowserHostAuth();
    const reasons: HostAuthReason[] = ['denied', 'revoked', 'unavailable', 'out_of_scope'];
    for (const reason of reasons) {
      hooks.setNextAuthorize({ status: 'failed', reason });
      expect(await host.authorizeFolder()).toEqual({ status: 'failed', reason });
      hooks.setNextRead({ status: 'failed', reason });
      expect(await host.readFile({ grantId: 'g', relativePath: 'x.txt' })).toEqual({ status: 'failed', reason });
      hooks.setNextWrite({ status: 'failed', reason });
      expect(await host.writeFile({ grantId: 'g', relativePath: 'x.txt', bytes: new Uint8Array() })).toEqual({
        status: 'failed',
        reason,
      });
    }
  });

  it('授权成功后 grant 并入 listGrants（重启后可见的樁语义），读写往返成立', async () => {
    const host = createBrowserHostAuth();
    const grant: HostGrant = { grantId: 'grant-1', label: '临江案' };
    hooks.setNextAuthorize({ status: 'granted', grant });
    const authorized = await host.authorizeFolder();
    expect(authorized).toEqual({ status: 'granted', grant });
    expect(await host.listGrants()).toEqual([grant]);

    hooks.setNextWrite({ status: 'wrote', byteLength: 2 });
    expect(await host.writeFile({ grantId: 'grant-1', relativePath: 'check.txt', bytes: Uint8Array.from([1, 2]) })).toEqual({
      status: 'wrote',
      byteLength: 2,
    });
    hooks.setNextRead({ status: 'read', bytes: Uint8Array.from([1, 2]) });
    const read = await host.readFile({ grantId: 'grant-1', relativePath: 'check.txt' });
    expect(read).toEqual({ status: 'read', bytes: Uint8Array.from([1, 2]) });
  });

  it('对外 grant 只含 grantId 与 label，绝无绝对路径字段', async () => {
    const host = createBrowserHostAuth();
    const grant: HostGrant = { grantId: 'grant-2', label: '案件' };
    hooks.setGrants([grant]);
    const grants = await host.listGrants();
    expect(grants).toHaveLength(1);
    expect(Object.keys(grants[0]!).sort()).toEqual(['grantId', 'label']);
    expect(JSON.stringify(grants)).not.toMatch(/path|[/\\]Users[/\\]/i);
  });
});
