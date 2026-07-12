import { useEffect, useId, useRef, useState } from 'react';
import {
  KEYCHAIN_RECOVERY_GUIDE,
  type CredentialStatus,
} from '../credentials/client';
import { CredentialForm } from '../credentials/CredentialForm';
import {
  effectiveBaseUrl,
  modelOptions,
  PROVIDER_OPTIONS,
  REASONING_OPTIONS,
  type ModelConfig,
  type ProviderId,
  type ReasoningLevel,
  withProvider,
} from '../provider/model-config';
import { DATA_PROMISE_SECTIONS, DATA_PROMISE_TITLE, RESERVED_COPY } from './data-promise-copy';
import {
  buildDiagnosticPayload,
  loadSettings,
  setBehaviorDataOptIn,
  setTelemetryEnabled,
  type SettingsSnapshot,
  updateOutputDir,
  updateRuntimeGuard,
} from './settings-store';
import { SurfaceCard } from '../surface/SurfaceCard';

export type SettingsSection =
  | 'model'
  | 'output'
  | 'channels'
  | 'privacy'
  | 'promise'
  | 'about';

const NAV: ReadonlyArray<{ id: SettingsSection; label: string }> = [
  { id: 'model', label: 'Model' },
  { id: 'output', label: 'Output & files' },
  { id: 'channels', label: 'Channels' },
  { id: 'privacy', label: 'Data & privacy' },
  { id: 'promise', label: 'Data promise' },
  { id: 'about', label: 'About & updates' },
];

const APP_VERSION = '0.1.1';

function chromeConnectionLabel(status: CredentialStatus): string {
  if (status.phase === 'connected') return 'Connected';
  if (status.phase === 'failed') return 'Connection failed';
  return 'Connect';
}

export interface SettingsPageProps {
  open: boolean;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onClose: () => void;
  credentialStatus: CredentialStatus;
  onCredentialStatusChange: (status: CredentialStatus) => void;
  /** connect 路由（2026-07-12）：打开即自动展开内嵌凭证面（消费一次） */
  autoOpenCredentials?: boolean;
  onAutoOpenConsumed?: () => void;
  modelConfig: ModelConfig;
  onModelConfigChange: (next: ModelConfig) => void;
  onRevealPath: (path: string) => void;
  onFeedback: (message: string, ok: boolean) => void;
}

/**
 * 设置页（SET-1 / docs/46）：全局层、容器无关，分组切换 0ms。
 * 真实路由接真；预留项禁用态 + tooltip；零假开关。
 * #43：凭证管理内嵌本页（减法律——不再叠开根层浮层）。
 */
export function SettingsPage({
  open,
  section,
  onSectionChange,
  onClose,
  credentialStatus,
  onCredentialStatusChange,
  autoOpenCredentials = false,
  onAutoOpenConsumed,
  modelConfig,
  onModelConfigChange,
  onRevealPath,
  onFeedback,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<SettingsSnapshot>(() => loadSettings());
  const [maxUsdDraft, setMaxUsdDraft] = useState(String(settings.runtimeGuard.maxUsd ?? ''));
  const [optInConfirmOpen, setOptInConfirmOpen] = useState(false);
  const [credentialFormOpen, setCredentialFormOpen] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open || !autoOpenCredentials) return;
    setCredentialFormOpen(true);
    onAutoOpenConsumed?.();
  }, [open, autoOpenCredentials, onAutoOpenConsumed]);

  useEffect(() => {
    if (!open) return;
    const snap = loadSettings();
    setSettings(snap);
    setMaxUsdDraft(snap.runtimeGuard.maxUsd === undefined ? '' : String(snap.runtimeGuard.maxUsd));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const commitMaxUsd = () => {
    const trimmed = maxUsdDraft.trim();
    const value = trimmed === '' ? undefined : Number(trimmed);
    if (trimmed !== '' && (!Number.isFinite(value) || (value as number) < 0)) {
      onFeedback('Enter a valid non-negative limit', false);
      return;
    }
    const next = updateRuntimeGuard(settings, { maxUsd: value });
    setSettings(next);
    setMaxUsdDraft(next.runtimeGuard.maxUsd === undefined ? '' : String(next.runtimeGuard.maxUsd));
    onFeedback(
      next.runtimeGuard.maxUsd === undefined
        ? 'Usage limit removed'
        : `Usage limit set to $${next.runtimeGuard.maxUsd}`,
      true,
    );
  };

  const pickOutputFolder = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const relative = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const folderName = relative.split('/')[0] || '产出';
    // 浏览器无法得绝对路径；用虚拟前缀 + 文件夹名，Tauri 真机可后续替换
    const virtualPath = `/Courtwork/默认产出/${folderName}`;
    const next = updateOutputDir(settings, virtualPath);
    setSettings(next);
    onFeedback(`Default output folder set to “${folderName}”`, true);
    event.target.value = '';
  };

  const revealOutputDir = () => {
    const dir = settings.output.defaultOutputDir;
    if (!dir) {
      onFeedback('Choose a default output folder first', false);
      return;
    }
    onRevealPath(dir);
  };

  const exportDiagnostics = () => {
    const payload = buildDiagnosticPayload(settings, {
      appVersion: APP_VERSION,
      credentialPhase: credentialStatus.phase,
      credentialFailKind: credentialStatus.failKind ?? null,
      modelConfig: {
        providerId: modelConfig.providerId,
        modelId: modelConfig.modelId,
        reasoning: modelConfig.reasoning,
      },
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `courtwork-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onFeedback('Diagnostics exported without credentials or case content', true);
  };

  const confirmOptIn = () => {
    const next = setBehaviorDataOptIn(settings, true);
    setSettings(next);
    setOptInConfirmOpen(false);
    onFeedback('De-identified product analytics enabled', true);
  };

  const toggleOptInOff = () => {
    const next = setBehaviorDataOptIn(settings, false);
    setSettings(next);
    onFeedback('De-identified product analytics disabled', true);
  };

  return (
    <div className="settings-backdrop" role="presentation">
    <SurfaceCard className="settings-layer" data-testid="settings-page" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="settings-header">
        <h1 id={titleId}>Settings</h1>
        <span className="settings-header-note">Global preferences</span>
        <span className="spacer" />
        <button type="button" className="quiet-button" data-testid="settings-close" onClick={onClose} title="Close settings · Esc">
          Close
          <kbd>Esc</kbd>
        </button>
      </header>

      <div className="settings-body">
        <nav className="settings-nav" aria-label="Settings sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? 'active' : ''}
              data-testid={`settings-nav-${item.id}`}
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => onSectionChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="settings-content" data-testid={`settings-section-${section}`} data-section={section}>
          {section === 'model' && (
            <section className="settings-panel">
              <h2>Model</h2>
              <p className="settings-lead">Credentials stay in the local keychain. Connection state is probe-driven.</p>

              <div className="settings-row" data-testid="settings-key-row">
                <div>
                  <strong>Credentials</strong>
                  <p>Paste a credential or name an environment variable, then probe again.</p>
                </div>
                <div className="settings-row-actions">
                  <span
                    className="settings-status-chip"
                    data-testid="settings-credential-phase"
                    data-phase={credentialStatus.phase}
                    data-fail-kind={credentialStatus.failKind ?? undefined}
                    title={credentialStatus.failureMessage}
                  >
                    {chromeConnectionLabel(credentialStatus)}
                  </span>
                  <button
                    type="button"
                    className="primary-button"
                    data-testid="settings-open-credentials"
                    aria-expanded={credentialFormOpen}
                    onClick={() => setCredentialFormOpen((current) => !current)}
                  >
                    Manage credentials
                  </button>
                </div>
              </div>

              {/* #43：凭证面板内嵌设置页内（减法律），不再叠开根层浮层；
                  #44：验证全程本页稳定在场，结果就地呈现 */}
              {credentialFormOpen && (
                <div className="settings-credential-embed" data-testid="settings-credential-embed">
                  <CredentialForm
                    variant="embedded"
                    modelConfig={modelConfig}
                    onModelConfigChange={onModelConfigChange}
                    onStatusChange={onCredentialStatusChange}
                  />
                </div>
              )}

              {credentialStatus.phase === 'failed' && (
                <div
                  className="settings-recovery"
                  data-testid="settings-credential-recovery"
                  role="note"
                >
                  {credentialStatus.failureMessage && (
                    <p className="settings-recovery-message" data-testid="settings-credential-fail-message">
                      {credentialStatus.failureMessage}
                    </p>
                  )}
                  {KEYCHAIN_RECOVERY_GUIDE.split('\n').map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </div>
              )}

              {/* 收敛令②（docs/55 cab982a）：用户唯一旋钮=标准/深思两档;provider/BaseURL/模型撤入 developer 层
                  （表面减法律：字段全在,面板不见）。两档绑定什么模型是 quirk 声明的事,UI 不知模型名存在。 */}
              <div className="settings-row" data-testid="settings-provider-row">
                <div>
                  <strong>Reasoning</strong>
                  <p>Standard is fast; Deep thinks harder. Which model each maps to is handled for you.</p>
                </div>
                <div className="settings-fields">
                  <fieldset data-testid="settings-reasoning">
                    <legend>Reasoning</legend>
                    {REASONING_OPTIONS.map((item) => (
                      <label key={item.id} className="settings-radio">
                        <input
                          type="radio"
                          name="settings-reasoning"
                          value={item.id}
                          checked={modelConfig.reasoning === item.id}
                          onChange={() =>
                            onModelConfigChange({ ...modelConfig, reasoning: item.id as ReasoningLevel })
                          }
                        />
                        {item.id === 'deep' ? 'Deep' : 'Standard'}
                      </label>
                    ))}
                  </fieldset>
                  <p className="settings-muted" data-testid="settings-model-summary">
                    Current: {modelConfig.reasoning === 'deep' ? 'Deep' : 'Standard'}
                  </p>
                  {/* 五裁④：双「验证连接」去重——页级唯一入口=凭证表单内 Verify connection（#44 就地绿徽契约随之） */}
                  {/* developer 层：能力全量,默认收起（收敛令②表面减法律） */}
                  <details className="settings-developer" data-testid="settings-developer">
                    <summary>Developer · provider &amp; model</summary>
                    <label>
                      <span>Provider</span>
                      <select
                        data-testid="settings-provider"
                        value={modelConfig.providerId}
                        onChange={(event) =>
                          onModelConfigChange(withProvider(modelConfig, event.target.value as ProviderId))
                        }
                      >
                        {PROVIDER_OPTIONS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {modelConfig.providerId === 'custom' && <label>
                      <span>Base URL</span>
                      <input data-testid="settings-base-url" type="url" value={modelConfig.baseUrl ?? ''} onChange={(event) => onModelConfigChange({ ...modelConfig, baseUrl: event.target.value })} />
                    </label>}
                    {modelConfig.providerId !== 'custom' && <p className="settings-muted" data-testid="settings-preset-url">{effectiveBaseUrl(modelConfig)}</p>}
                    <label>
                      <span>Model</span>
                      <input
                        data-testid="settings-model"
                        list="settings-model-options"
                        value={modelConfig.modelId}
                        onChange={(event) => onModelConfigChange({ ...modelConfig, modelId: event.target.value })}
                      />
                      <datalist id="settings-model-options">{modelOptions(modelConfig).map((id) => <option key={id} value={id} />)}</datalist>
                    </label>
                  </details>
                </div>
              </div>

              <div className="settings-row is-reserved" data-testid="settings-managed-provider">
                <div><strong>Courtwork managed credits</strong><p>Hosted provider billing will appear here.</p></div>
                <button type="button" className="quiet-button" disabled title="Coming later">Coming later</button>
              </div>

              <div className="settings-row" data-testid="settings-maxusd-row">
                <div>
                  <strong>Usage limit (USD)</strong>
                  <p>Leave blank for no limit. Generation stops when the limit is reached.</p>
                </div>
                <div className="settings-row-actions">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="settings-number"
                    data-testid="settings-maxusd"
                    value={maxUsdDraft}
                    placeholder="No limit"
                    onChange={(event) => setMaxUsdDraft(event.target.value)}
                  />
                  <button type="button" className="quiet-button" data-testid="settings-maxusd-save" onClick={commitMaxUsd}>
                    Save limit
                  </button>
                </div>
              </div>
            </section>
          )}

          {section === 'output' && (
            <section className="settings-panel">
              <h2>Output & files</h2>
              <p className="settings-lead">Choose one default destination instead of confirming every export.</p>

              <div className="settings-row" data-testid="settings-output-dir-row">
                <div>
                  <strong>Default output folder</strong>
                  <p>The root folder for generated files.</p>
                </div>
                <div className="settings-fields">
                  <code className="settings-path mono-ellip" data-testid="settings-output-dir" title={settings.output.defaultOutputDir}>
                    {settings.output.defaultOutputDir ?? 'Not set · using the current case output folder'}
                  </code>
                  <div className="settings-row-actions">
                    <button
                      type="button"
                      className="quiet-button"
                      data-testid="settings-pick-output-dir"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      Choose folder
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      data-testid="settings-reveal-output-dir"
                      disabled={!settings.output.defaultOutputDir}
                      title={settings.output.defaultOutputDir ? 'Show in Finder' : 'Choose a folder first'}
                      onClick={revealOutputDir}
                    >
                      Show in Finder
                    </button>
                  </div>
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    hidden
                    data-testid="settings-output-folder-input"
                    onChange={pickOutputFolder}
                    {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                  />
                </div>
              </div>

              <div className="settings-row is-reserved" data-testid="settings-sources-row">
                <div>
                  <strong>Source access</strong>
                  <p>Manage external libraries and connector permissions.</p>
                </div>
                <button
                  type="button"
                  className="quiet-button is-disabled-feature"
                  data-testid="settings-sources"
                  aria-disabled="true"
                  title={RESERVED_COPY.sources}
                  tabIndex={0}
                  onClick={(event) => event.preventDefault()}
                >
                  Manage sources
                </button>
              </div>
            </section>
          )}

          {section === 'channels' && (
            <section className="settings-panel">
              <h2>Channels</h2>
              <p className="settings-lead">Reserved integrations stay visible and disabled until they are real.</p>
              {(
                [
                  ['wecom', 'WeCom', RESERVED_COPY.wecom],
                  ['feishu', 'Feishu', RESERVED_COPY.feishu],
                  ['email', 'Email', RESERVED_COPY.email],
                  ['enterprise-lib', 'Private enterprise library', RESERVED_COPY.enterpriseLib],
                ] as const
              ).map(([id, label, tip]) => (
                <div key={id} className="settings-row is-reserved" data-testid={`settings-channel-${id}`}>
                  <div>
                    <strong>{label}</strong>
                    <p>Reserved organization channel.</p>
                  </div>
                  <button
                    type="button"
                    className="quiet-button is-disabled-feature"
                    data-testid={`settings-channel-${id}-btn`}
                    aria-disabled="true"
                    title={tip}
                    tabIndex={0}
                    onClick={(event) => event.preventDefault()}
                  >
                    Connect
                  </button>
                </div>
              ))}
            </section>
          )}

          {section === 'privacy' && (
            <section className="settings-panel">
              <h2>Data & privacy</h2>
              <p className="settings-lead">Sensitive choices require explicit confirmation.</p>

              <div className="settings-row" data-testid="settings-promise-link-row">
                <div>
                  <strong>Data promise</strong>
                  <p>Read the product-level commitments, including the no-training promise.</p>
                </div>
                <button
                  type="button"
                  className="quiet-button"
                  data-testid="settings-open-promise"
                  onClick={() => onSectionChange('promise')}
                >
                  Read promise
                </button>
              </div>

              <div className="settings-row" data-testid="settings-behavior-optin-row">
                <div>
                  <strong>De-identified product analytics</strong>
                  <p>Field-level correction signals only. You can turn this off at any time.</p>
                  {settings.privacy.behaviorDataConsentedAt && (
                    <p className="settings-muted" data-testid="settings-optin-timestamp">
                      Enabled: {settings.privacy.behaviorDataConsentedAt}
                    </p>
                  )}
                </div>
                <div className="settings-row-actions">
                  {settings.privacy.behaviorDataOptIn ? (
                    <button
                      type="button"
                      className="quiet-button"
                      data-testid="settings-optin-off"
                      onClick={toggleOptInOff}
                    >
                      Turn off
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      data-testid="settings-optin-on"
                      onClick={() => setOptInConfirmOpen(true)}
                    >
                      Review and enable
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-row" data-testid="settings-telemetry-row">
                <div>
                  <strong>Usage telemetry</strong>
                  <p>Never includes credentials or case text. Disable it at any time.</p>
                </div>
                <label className="settings-switch">
                  <input
                    type="checkbox"
                    data-testid="settings-telemetry"
                    checked={settings.privacy.telemetryEnabled}
                    onChange={(event) => {
                      const next = setTelemetryEnabled(settings, event.target.checked);
                      setSettings(next);
                      onFeedback(event.target.checked ? 'Usage telemetry enabled' : 'Usage telemetry disabled', true);
                    }}
                  />
                  <span>{settings.privacy.telemetryEnabled ? 'On' : 'Off'}</span>
                </label>
              </div>

              <div className="settings-row is-reserved" data-testid="settings-clear-prefs-row">
                <div>
                  <strong>Clear saved preferences</strong>
                  <p>This does not clear the current conversation.</p>
                </div>
                <button
                  type="button"
                  className="quiet-button is-disabled-feature"
                  data-testid="settings-clear-prefs"
                  aria-disabled="true"
                  title={RESERVED_COPY.clearPrefs}
                  tabIndex={0}
                  onClick={(event) => event.preventDefault()}
                >
                  Clear preferences
                </button>
              </div>
            </section>
          )}

          {section === 'promise' && (
            <article className="settings-panel settings-promise" data-testid="settings-promise-doc">
              <h2>{DATA_PROMISE_TITLE}</h2>
              <p className="settings-promise-dek">摘自数据承诺分层（docs/28）。以下条款对律所客户具有主协议级效力。</p>
              {DATA_PROMISE_SECTIONS.map((block) => (
                <section key={block.id} className="settings-promise-section" data-testid={`promise-${block.id}`}>
                  <h3>{block.heading}</h3>
                  {block.paragraphs.map((text) => (
                    <p key={text.slice(0, 24)}>{text}</p>
                  ))}
                </section>
              ))}
            </article>
          )}

          {section === 'about' && (
            <section className="settings-panel">
              <h2>About & updates</h2>
              <div className="settings-row" data-testid="settings-version-row">
                <div>
                  <strong>Version</strong>
                  <p>Courtwork desktop</p>
                </div>
                <span className="settings-mono" data-testid="settings-version">
                  {APP_VERSION}
                </span>
              </div>
              <div className="settings-row" data-testid="settings-license-row">
                <div>
                  <strong>Licenses</strong>
                  <p>Product license and third-party notices ship with the release.</p>
                </div>
                <span className="settings-muted" data-testid="settings-license">
                  Proprietary · See NOTICE for third-party software
                </span>
              </div>
              <div className="settings-row" data-testid="settings-diagnostics-row">
                <div>
                  <strong>Diagnostics</strong>
                  <p>Export configuration and connection state without credentials or case content.</p>
                </div>
                <button type="button" className="quiet-button" data-testid="settings-export-diagnostics" onClick={exportDiagnostics}>
                  Export diagnostics
                </button>
              </div>
              <div className="settings-row is-reserved" data-testid="settings-check-update-row">
                <div>
                  <strong>Check for updates</strong>
                  <p>Automatic updates require a signed release channel.</p>
                </div>
                <button
                  type="button"
                  className="quiet-button is-disabled-feature"
                  data-testid="settings-check-update"
                  aria-disabled="true"
                  title={RESERVED_COPY.checkUpdate}
                  tabIndex={0}
                  onClick={(event) => event.preventDefault()}
                >
                  Check for updates
                </button>
              </div>
              <div className="settings-row" data-testid="settings-feedback-row">
                <div><strong>Feedback</strong><p>Send product feedback or report a problem by email.</p></div>
                <a className="quiet-button settings-feedback-link" href="mailto:feedback@courtwork.local?subject=Courtwork%20feedback">Send feedback</a>
              </div>
            </section>
          )}
        </div>
      </div>

      {optInConfirmOpen && (
        <div className="modal-backdrop settings-confirm-backdrop" role="presentation">
          <section
            className="settings-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="optin-confirm-title"
            data-testid="settings-optin-confirm"
          >
            <h2 id="optin-confirm-title">Enable de-identified product analytics?</h2>
            <p>
              Courtwork will collect only irreversibly de-identified field-level correction signals. Case content is excluded. You can turn this off at any time.
            </p>
            <div className="scope-popover-actions">
              <button type="button" className="quiet-button" onClick={() => setOptInConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-button" data-testid="settings-optin-confirm-yes" onClick={confirmOptIn}>
                Enable
              </button>
            </div>
          </section>
        </div>
      )}
    </SurfaceCard>
    </div>
  );
}
