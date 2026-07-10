import { useEffect, useId, useRef, useState } from 'react';
import {
  connectionLabel,
  type CredentialStatus,
} from '../credentials/client';
import {
  modelDisplayName,
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

export type SettingsSection =
  | 'model'
  | 'output'
  | 'channels'
  | 'privacy'
  | 'promise'
  | 'about';

const NAV: ReadonlyArray<{ id: SettingsSection; label: string }> = [
  { id: 'model', label: '模型服务' },
  { id: 'output', label: '产出与文件' },
  { id: 'channels', label: '通道与集成' },
  { id: 'privacy', label: '数据与隐私' },
  { id: 'promise', label: '数据承诺声明' },
  { id: 'about', label: '关于' },
];

const APP_VERSION = '0.1.0';

export interface SettingsPageProps {
  open: boolean;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onClose: () => void;
  credentialStatus: CredentialStatus;
  onOpenCredentialSetup: () => void;
  modelConfig: ModelConfig;
  onModelConfigChange: (next: ModelConfig) => void;
  onRevealPath: (path: string) => void;
  onFeedback: (message: string, ok: boolean) => void;
}

/**
 * 设置页（SET-1 / docs/46）：全局层、容器无关，分组切换 0ms。
 * 真实路由接真；预留项禁用态 + tooltip；零假开关。
 */
export function SettingsPage({
  open,
  section,
  onSectionChange,
  onClose,
  credentialStatus,
  onOpenCredentialSetup,
  modelConfig,
  onModelConfigChange,
  onRevealPath,
  onFeedback,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<SettingsSnapshot>(() => loadSettings());
  const [maxUsdDraft, setMaxUsdDraft] = useState(String(settings.runtimeGuard.maxUsd ?? ''));
  const [optInConfirmOpen, setOptInConfirmOpen] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

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

  const provider = PROVIDER_OPTIONS.find((item) => item.id === modelConfig.providerId) ?? PROVIDER_OPTIONS[0]!;

  const commitMaxUsd = () => {
    const trimmed = maxUsdDraft.trim();
    const value = trimmed === '' ? undefined : Number(trimmed);
    if (trimmed !== '' && (!Number.isFinite(value) || (value as number) < 0)) {
      onFeedback('请输入有效的非负数字限额', false);
      return;
    }
    const next = updateRuntimeGuard(settings, { maxUsd: value });
    setSettings(next);
    setMaxUsdDraft(next.runtimeGuard.maxUsd === undefined ? '' : String(next.runtimeGuard.maxUsd));
    onFeedback(
      next.runtimeGuard.maxUsd === undefined
        ? '已取消用量美元限额'
        : `用量限额已设为 ${next.runtimeGuard.maxUsd} 美元`,
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
    onFeedback(`默认产出目录已设为「${folderName}」`, true);
    event.target.value = '';
  };

  const revealOutputDir = () => {
    const dir = settings.output.defaultOutputDir;
    if (!dir) {
      onFeedback('尚未设置默认产出目录', false);
      return;
    }
    onRevealPath(dir);
  };

  const exportDiagnostics = () => {
    const payload = buildDiagnosticPayload(settings, {
      appVersion: APP_VERSION,
      credentialPhase: credentialStatus.phase,
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
    onFeedback('诊断信息已导出（不含密钥与案件内容）', true);
  };

  const confirmOptIn = () => {
    const next = setBehaviorDataOptIn(settings, true);
    setSettings(next);
    setOptInConfirmOpen(false);
    onFeedback('已同意脱敏行为数据 opt-in', true);
  };

  const toggleOptInOff = () => {
    const next = setBehaviorDataOptIn(settings, false);
    setSettings(next);
    onFeedback('已关闭脱敏行为数据 opt-in（不溯及既往）', true);
  };

  return (
    <div className="settings-layer" data-testid="settings-page" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="settings-header">
        <h1 id={titleId}>设置</h1>
        <span className="settings-header-note">全局偏好 · 与当前案件无关</span>
        <span className="spacer" />
        <button type="button" className="quiet-button" data-testid="settings-close" onClick={onClose} title="关闭设置 · Esc">
          关闭
          <kbd>Esc</kbd>
        </button>
      </header>

      <div className="settings-body">
        <nav className="settings-nav" aria-label="设置分组">
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
              <h2>模型服务</h2>
              <p className="settings-lead">密钥仅存本机钥匙串；连接状态由探针驱动，绝不乐观显示已连接。</p>

              <div className="settings-row" data-testid="settings-key-row">
                <div>
                  <strong>访问凭证</strong>
                  <p>粘贴凭证或指定环境变量名；保存后复探。</p>
                </div>
                <div className="settings-row-actions">
                  <span
                    className="settings-status-chip"
                    data-testid="settings-credential-phase"
                    data-phase={credentialStatus.phase}
                  >
                    {connectionLabel(credentialStatus)}
                  </span>
                  <button
                    type="button"
                    className="primary-button"
                    data-testid="settings-open-credentials"
                    onClick={onOpenCredentialSetup}
                  >
                    管理凭证
                  </button>
                </div>
              </div>

              <div className="settings-row" data-testid="settings-provider-row">
                <div>
                  <strong>服务商与模型</strong>
                  <p>写入 provider 配置，接真实流式时 UI 零改动。</p>
                </div>
                <div className="settings-fields">
                  <label>
                    <span>服务商</span>
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
                  <label>
                    <span>模型</span>
                    <select
                      data-testid="settings-model"
                      value={modelConfig.modelId}
                      onChange={(event) => onModelConfigChange({ ...modelConfig, modelId: event.target.value })}
                    >
                      {provider.models.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset data-testid="settings-reasoning">
                    <legend>推理强度</legend>
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
                        {item.label}
                      </label>
                    ))}
                  </fieldset>
                  <p className="settings-muted" data-testid="settings-model-summary">
                    当前：{modelDisplayName(modelConfig)} ·{' '}
                    {modelConfig.reasoning === 'deep' ? '深思' : '标准'}
                  </p>
                </div>
              </div>

              <div className="settings-row" data-testid="settings-maxusd-row">
                <div>
                  <strong>用量限额（美元）</strong>
                  <p>对应 RuntimeGuard.maxUsd；留空表示不限额。超限中断生成。</p>
                </div>
                <div className="settings-row-actions">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="settings-number"
                    data-testid="settings-maxusd"
                    value={maxUsdDraft}
                    placeholder="不限额"
                    onChange={(event) => setMaxUsdDraft(event.target.value)}
                  />
                  <button type="button" className="quiet-button" data-testid="settings-maxusd-save" onClick={commitMaxUsd}>
                    保存限额
                  </button>
                </div>
              </div>
            </section>
          )}

          {section === 'output' && (
            <section className="settings-panel">
              <h2>产出与文件</h2>
              <p className="settings-lead">默认下载落点可改；不逐次询问（docs/46 裁决 10）。</p>

              <div className="settings-row" data-testid="settings-output-dir-row">
                <div>
                  <strong>默认产出目录</strong>
                  <p>生成文件的默认根目录；可用「在访达中显示」验证路径。</p>
                </div>
                <div className="settings-fields">
                  <code className="settings-path mono-ellip" data-testid="settings-output-dir" title={settings.output.defaultOutputDir}>
                    {settings.output.defaultOutputDir ?? '尚未设置（将使用本案产出子目录）'}
                  </code>
                  <div className="settings-row-actions">
                    <button
                      type="button"
                      className="quiet-button"
                      data-testid="settings-pick-output-dir"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      选择文件夹
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      data-testid="settings-reveal-output-dir"
                      disabled={!settings.output.defaultOutputDir}
                      title={settings.output.defaultOutputDir ? '在访达中显示' : '请先选择目录'}
                      onClick={revealOutputDir}
                    >
                      在访达中显示
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
                  <strong>来源授权</strong>
                  <p>管理外部资料库与连接器授权范围。</p>
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
                  管理来源
                </button>
              </div>
            </section>
          )}

          {section === 'channels' && (
            <section className="settings-panel">
              <h2>通道与集成</h2>
              <p className="settings-lead">以下通道为路线图预留，入口常驻禁用态（docs/19 空路由判据）。</p>
              {(
                [
                  ['wecom', '企业微信', RESERVED_COPY.wecom],
                  ['feishu', '飞书', RESERVED_COPY.feishu],
                  ['email', '邮件', RESERVED_COPY.email],
                  ['enterprise-lib', '企业私域库', RESERVED_COPY.enterpriseLib],
                ] as const
              ).map(([id, label, tip]) => (
                <div key={id} className="settings-row is-reserved" data-testid={`settings-channel-${id}`}>
                  <div>
                    <strong>{label}</strong>
                    <p>即将支持的机构通道。</p>
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
                    连接
                  </button>
                </div>
              ))}
            </section>
          )}

          {section === 'privacy' && (
            <section className="settings-panel">
              <h2>数据与隐私</h2>
              <p className="settings-lead">关键授权逐项确认，不埋长文本（docs/28）。</p>

              <div className="settings-row" data-testid="settings-promise-link-row">
                <div>
                  <strong>数据承诺声明</strong>
                  <p>主协议级条款摘录，含「案件内容永不训练」。</p>
                </div>
                <button
                  type="button"
                  className="quiet-button"
                  data-testid="settings-open-promise"
                  onClick={() => onSectionChange('promise')}
                >
                  阅读声明
                </button>
              </div>

              <div className="settings-row" data-testid="settings-behavior-optin-row">
                <div>
                  <strong>脱敏行为数据 opt-in</strong>
                  <p>仅字段级修正行为，可随时关，不溯及既往。</p>
                  {settings.privacy.behaviorDataConsentedAt && (
                    <p className="settings-muted" data-testid="settings-optin-timestamp">
                      同意时间：{settings.privacy.behaviorDataConsentedAt}
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
                      关闭授权
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      data-testid="settings-optin-on"
                      onClick={() => setOptInConfirmOpen(true)}
                    >
                      逐项确认开启
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-row" data-testid="settings-telemetry-row">
                <div>
                  <strong>使用遥测</strong>
                  <p>不含密钥与案件正文；本机可随时关闭。</p>
                </div>
                <label className="settings-switch">
                  <input
                    type="checkbox"
                    data-testid="settings-telemetry"
                    checked={settings.privacy.telemetryEnabled}
                    onChange={(event) => {
                      const next = setTelemetryEnabled(settings, event.target.checked);
                      setSettings(next);
                      onFeedback(event.target.checked ? '已开启使用遥测' : '已关闭使用遥测', true);
                    }}
                  />
                  <span>{settings.privacy.telemetryEnabled ? '已开启' : '已关闭'}</span>
                </label>
              </div>

              <div className="settings-row is-reserved" data-testid="settings-clear-prefs-row">
                <div>
                  <strong>清除记住的偏好</strong>
                  <p>与「清空本次对话」是两个独立入口（docs/25）。</p>
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
                  清除偏好
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
              <h2>关于</h2>
              <div className="settings-row" data-testid="settings-version-row">
                <div>
                  <strong>版本</strong>
                  <p>Courtwork 桌面端</p>
                </div>
                <span className="settings-mono" data-testid="settings-version">
                  {APP_VERSION}
                </span>
              </div>
              <div className="settings-row" data-testid="settings-license-row">
                <div>
                  <strong>许可</strong>
                  <p>产品软件许可与第三方开源清单以发行包为准。</p>
                </div>
                <span className="settings-muted" data-testid="settings-license">
                  Proprietary · 第三方见 NOTICE
                </span>
              </div>
              <div className="settings-row" data-testid="settings-diagnostics-row">
                <div>
                  <strong>诊断导出</strong>
                  <p>导出配置摘要与连接状态；永不含密钥与案件内容。</p>
                </div>
                <button type="button" className="quiet-button" data-testid="settings-export-diagnostics" onClick={exportDiagnostics}>
                  导出诊断
                </button>
              </div>
              <div className="settings-row is-reserved" data-testid="settings-check-update-row">
                <div>
                  <strong>检查更新</strong>
                  <p>自动更新依赖发行通道与公证。</p>
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
                  检查更新
                </button>
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
            <h2 id="optin-confirm-title">确认开启脱敏行为数据 opt-in</h2>
            <p>
              仅会在不可逆脱敏后，汇总字段级修正行为（例如否决了哪类风险点），用于产品改进。不含案件实质内容。您可随时关闭；关闭不溯及既往。
            </p>
            <div className="scope-popover-actions">
              <button type="button" className="quiet-button" onClick={() => setOptInConfirmOpen(false)}>
                取消
              </button>
              <button type="button" className="primary-button" data-testid="settings-optin-confirm-yes" onClick={confirmOptIn}>
                确认开启
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
