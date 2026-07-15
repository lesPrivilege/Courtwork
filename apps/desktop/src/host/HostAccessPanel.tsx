import { useCallback, useEffect, useState } from 'react';
import {
  hostAuthReasonCopy,
  type HostAuthPort,
  type HostAuthReason,
  type HostGrant,
} from './host-auth-port';

/**
 * HOST-AUTH-LITE 失败可见面（Settings · Output & files 内嵌）。
 * 只消费注入的 `HostAuthPort`：授权、授权域内读写探针、四类失败结构化呈现。
 * 不显示绝对路径（只显示 opaque grant 的 label），不接 MaterialStore，不建 opaque case ref。
 */

const ACCESS_CHECK_FILE = '.courtwork-access-check';
function accessCheckBytes(): Uint8Array {
  return new TextEncoder().encode('courtwork-host-auth-lite');
}

type PanelState =
  | { kind: 'idle' }
  | { kind: 'authorized'; label: string }
  | { kind: 'verified'; label: string }
  | { kind: 'failed'; reason: HostAuthReason }
  | { kind: 'error' };

export interface HostAccessPanelProps {
  hostAuth: HostAuthPort;
}

export function HostAccessPanel({ hostAuth }: HostAccessPanelProps) {
  const [grants, setGrants] = useState<HostGrant[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<PanelState>({ kind: 'idle' });

  const refresh = useCallback(async () => {
    try {
      setGrants(await hostAuth.listGrants());
    } catch {
      setGrants([]);
    }
  }, [hostAuth]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const authorize = async () => {
    setBusy(true);
    try {
      const result = await hostAuth.authorizeFolder();
      if (result.status === 'granted') {
        await refresh();
        setState({ kind: 'authorized', label: result.grant.label });
      } else {
        setState({ kind: 'failed', reason: result.reason });
      }
    } catch {
      setState({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (grant: HostGrant) => {
    setBusy(true);
    try {
      const wrote = await hostAuth.writeFile({
        grantId: grant.grantId,
        relativePath: ACCESS_CHECK_FILE,
        bytes: accessCheckBytes(),
      });
      if (wrote.status !== 'wrote') {
        setState({ kind: 'failed', reason: wrote.reason });
        return;
      }
      const read = await hostAuth.readFile({ grantId: grant.grantId, relativePath: ACCESS_CHECK_FILE });
      if (read.status !== 'read') {
        setState({ kind: 'failed', reason: read.reason });
        return;
      }
      setState({ kind: 'verified', label: grant.label });
    } catch {
      setState({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-row" data-testid="host-access-row">
      <div>
        <strong>Host file access</strong>
        <p>授权 Courtwork 读写某个案件文件夹；授权、绝对路径与失败分类都由本机判定，不进入界面状态。</p>
        {grants.length > 0 ? (
          <p className="settings-muted" data-testid="host-access-grants">
            已授权：
            {grants.map((grant) => (
              <span
                key={grant.grantId}
                data-testid="host-access-grant"
                data-grant-id={grant.grantId}
                data-label={grant.label}
              >
                〔{grant.label}〕
              </span>
            ))}
          </p>
        ) : (
          <p className="settings-muted" data-testid="host-access-empty">
            尚未授权任何文件夹
          </p>
        )}
        {state.kind === 'authorized' && (
          <p
            className="settings-muted"
            data-testid="host-access-authorized"
            data-label={state.label}
            role="status"
          >
            已授权〔{state.label}〕
          </p>
        )}
        {state.kind === 'verified' && (
          <p
            className="settings-muted"
            data-testid="host-access-verified"
            data-label={state.label}
            role="status"
          >
            已验证读写〔{state.label}〕
          </p>
        )}
        {state.kind === 'failed' && (
          <div
            className="settings-recovery"
            data-testid="host-access-failure"
            data-reason={state.reason}
            role="alert"
          >
            {hostAuthReasonCopy(state.reason)}
          </div>
        )}
        {state.kind === 'error' && (
          <div className="settings-recovery" data-testid="host-access-error" role="alert">
            宿主访问出现意外错误，请重试。
          </div>
        )}
      </div>
      <div className="settings-row-actions">
        <button
          type="button"
          className="primary-button"
          data-testid="host-access-authorize"
          disabled={busy}
          onClick={authorize}
        >
          Authorize a folder
        </button>
        {grants.length > 0 && (
          <button
            type="button"
            className="quiet-button"
            data-testid="host-access-verify"
            disabled={busy}
            onClick={() => verify(grants[0]!)}
          >
            Verify read/write
          </button>
        )}
      </div>
    </div>
  );
}
