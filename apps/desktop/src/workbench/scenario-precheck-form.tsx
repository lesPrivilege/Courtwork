import { useState } from 'react';
import type { LaunchFormField, LaunchSnapshot } from '@courtwork/registry';

/**
 * 预检表单通用件（GENERIC-PACK-1 裁定二 · ADR-016 填格协议同族）。
 *
 * 契约冻结为「descriptor 声明、registry 冻结、宿主有限元素集通用渲染」：字段形状来自
 * registry 深冻结的 `launch.formFields`（元素集＝select | text），提交值收成
 * {@link ScenarioStartParams}（`Record<fieldId, string>`）进场景启动参数。
 * 本件零垂类语义——标题/说明/字段文案全部来自冻结声明，垂类只在其 renderer 里组装
 * 选项解析与提交流转。
 */

/** 预检表单提交值：声明字段 id → 提交值（进场景启动参数）。 */
export type ScenarioStartParams = Record<string, string>;

export interface ScenarioPrecheckFormProps {
  /** 场景名（registry 冻结数据；垂类 renderer 把自身场景名递来）。 */
  title: string;
  /** 冻结的 launch 声明快照（registry 只读）。 */
  launch: LaunchSnapshot;
  /** select 字段选项：宿主按声明 source/mediaType 领域无关解析。 */
  resolveOptions: (fieldId: string) => ReadonlyArray<{ value: string; label: string }>;
  /** 可恢复会话入口（垂类 renderer 按工作面驱动声明的可恢复态传入）。 */
  recoverable?: boolean;
  onRecover?: () => void;
  onSubmit: (params: ScenarioStartParams) => void;
}

function requiredInvalid(field: LaunchFormField, value: string): boolean {
  if (field.required !== true) return false;
  if (field.kind === 'text') return value.trim() === '';
  return value === '';
}

/** 有选项的 select 才是有效选择；零选项时 select 禁用并展示声明空态说明。 */
function selectOptionCount(props: ScenarioPrecheckFormProps, fieldId: string): number {
  return props.resolveOptions(fieldId).length;
}

export function ScenarioPrecheckForm(props: ScenarioPrecheckFormProps) {
  const { title, launch, recoverable, onRecover, onSubmit } = props;
  const [values, setValues] = useState<ScenarioStartParams>({});
  const fields = launch.formFields ?? [];
  const submitDisabled = fields.some((field) => requiredInvalid(field, values[field.id] ?? ''));
  return (
    <div className="precheck-form" data-testid="precheck-form">
      <h3>{title}</h3>
      {launch.description !== undefined && <p>{launch.description}</p>}
      {recoverable && launch.recover !== undefined && (
        <div className="work-recover" data-testid="precheck-recover">
          <p>{launch.recover.note}</p>
          <button type="button" className="primary-button" data-testid="precheck-recover-run" onClick={onRecover}>
            {launch.recover.label}
          </button>
        </div>
      )}
      {fields.map((field) => (
        field.kind === 'select' ? (
          <label className="precheck-field" key={field.id}>
            <span>{field.label}</span>
            <select
              data-testid={`precheck-field-${field.id}`}
              value={values[field.id] ?? ''}
              disabled={selectOptionCount(props, field.id) === 0}
              onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
            >
              <option value="">{field.placeholder ?? ''}</option>
              {props.resolveOptions(field.id).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {selectOptionCount(props, field.id) === 0 && field.emptyNote !== undefined && (
              <p className="precheck-note" data-testid={`precheck-empty-${field.id}`}>{field.emptyNote}</p>
            )}
          </label>
        ) : (
          <label className="precheck-field" key={field.id}>
            <span>{field.label}</span>
            <input
              data-testid={`precheck-field-${field.id}`}
              value={values[field.id] ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
              placeholder={field.placeholder}
            />
          </label>
        )
      ))}
      <button
        type="button"
        className="primary-button"
        data-testid="precheck-submit"
        disabled={submitDisabled}
        onClick={() => onSubmit(values)}
      >
        {launch.submitLabel ?? '开始'}
      </button>
      {launch.footnote !== undefined && <p className="precheck-note">{launch.footnote}</p>}
    </div>
  );
}
