import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LaunchSnapshot } from '@courtwork/registry';
import { ScenarioPrecheckForm, type ScenarioPrecheckFormProps } from './scenario-precheck-form';

/**
 * 预检表单通用件（GENERIC-PACK-1 裁定二）：字段形状/文案/提交态全部来自冻结声明，
 * 本件零垂类语义。交互（填值→提交进启动参数）由 e2e 全链覆盖（contract-output 等）。
 */

const LAUNCH: LaunchSnapshot = {
  label: '审查合同',
  tone: 'primary',
  kind: 'scenario',
  description: '对已入库的合同做逐条风险审查。',
  submitLabel: '开始合同审查',
  footnote: '其余已入库材料作为支持材料一并送审。',
  recover: { label: '打开上次审查', note: '本案有一次此前的合同审查。' },
  formFields: [
    { kind: 'select', id: 'primaryContractId', label: '主合同（批注目标）', source: 'ready-materials', mediaType: 'docx', required: true, placeholder: '请选择一份 Word 主合同', emptyNote: '先入库一份 Word 主合同' },
    { kind: 'text', id: 'subject', label: '对方主体名称', required: true, placeholder: '例如：临江精铸科技有限公司' },
  ],
};

function render(props: Partial<ScenarioPrecheckFormProps> = {}): string {
  return renderToStaticMarkup(createElement(ScenarioPrecheckForm, {
    title: '合同审查',
    launch: LAUNCH,
    resolveOptions: () => [],
    onSubmit: () => undefined,
    ...props,
  }));
}

describe('ScenarioPrecheckForm（裁定二 · 宿主有限元素集通用渲染）', () => {
  it('字段/文案全部来自冻结声明：标题、说明、select、text、提交、尾注一字不缺', () => {
    const html = render();
    expect(html).toContain('合同审查');
    expect(html).toContain('对已入库的合同做逐条风险审查。');
    expect(html).toContain('主合同（批注目标）');
    expect(html).toContain('对方主体名称');
    expect(html).toContain('请选择一份 Word 主合同');
    expect(html).toContain('开始合同审查');
    expect(html).toContain('其余已入库材料作为支持材料一并送审。');
  });

  it('必填未满足时提交禁用（初始空值）；声明必填的字段判定不可放宽', () => {
    const html = render();
    expect(html).toContain('disabled=""');
  });

  it('select 零选项时禁用并展示声明空态说明（precheck-empty-<fieldId>）', () => {
    const html = render();
    expect(html).toContain('data-testid="precheck-empty-primaryContractId"');
    expect(html).toContain('先入库一份 Word 主合同');
    expect(html).toContain('data-testid="precheck-field-primaryContractId"');
    expect(html).toContain('data-testid="precheck-field-subject"');
    expect(html).toContain('data-testid="precheck-submit"');
  });

  it('recoverable 时渲染声明恢复入口（label/note），缺省不渲染', () => {
    expect(render()).not.toContain('data-testid="precheck-recover"');
    const html = render({ recoverable: true });
    expect(html).toContain('data-testid="precheck-recover"');
    expect(html).toContain('打开上次审查');
    expect(html).toContain('本案有一次此前的合同审查。');
  });
});
