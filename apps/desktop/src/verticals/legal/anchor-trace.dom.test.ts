// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReviewMatrix, Timeline } from '@courtwork/legal';
import type { SourceAnchor } from '@courtwork/schemas';

import { MatrixPanel, TimelinePanel } from './panels';

/**
 * LEGAL-ANCHOR-BINDING-1 · 「回到原件」在时间线／矩阵两面由显式 disabled 转真实回跳。
 *
 * 判据循 CONTRACT-TRACE-1：面只负责把**真实 SourceAnchor** 原样交给宿主的 canonical reader
 * 单调用链（`readMaterialAction` → `openMaterialReader`），不在面内重做定位、不做 quote 搜索；
 * 无锚才禁用。fileId 同案重验、textLayerVersion 漂移、合法 bbox-only → `anchor_unsupported`
 * 这些 fail-closed 判定住 `material/material-actions.ts` 并由其谱看守，本谱只锁**交接面**。
 */

const MINTED_ANCHOR: SourceAnchor = {
  fileId: 'V1-采购合同.docx',
  textRange: { start: 12, end: 26 },
  textLayerVersion: 'source-text@1+ab12cd34',
  quote: '本合同自双方签字之日起生效',
};

const TIMELINE: Timeline = {
  caseId: 'case-anchor',
  events: [{
    id: 'evt-01',
    description: '双方签署设备采购合同',
    date: { kind: 'exact', date: '2024-03-11' },
    partyIds: [],
    sourceAnchors: [MINTED_ANCHOR],
  }],
  outOfCoverage: [],
};

const MATRIX: ReviewMatrix = {
  caseId: 'case-anchor',
  questions: [{ id: 'q1', text: '付款期限如何约定' }, { id: 'q2', text: '是否约定违约金' }],
  rows: [{
    documentId: 'V1-采购合同.docx',
    answers: {
      q1: { answer: '验收后三十日内付清', sourceAnchors: [MINTED_ANCHOR], confidence: 'high' },
      // 「该文档未提及此问题」是合法答案，结构上零锚——没有可去之处，故按钮必须禁用。
      q2: { answer: '该文档未提及此问题', sourceAnchors: [], confidence: 'low' },
    },
  }],
  outOfCoverage: [],
};

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function mount(node: ReturnType<typeof createElement>) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
  return container;
}

function button(testId: string): HTMLButtonElement {
  const element = container?.querySelector(`[data-testid="${testId}"]`);
  if (!(element instanceof HTMLButtonElement)) throw new Error(`button missing: ${testId}`);
  return element;
}

describe('时间线面 · 回到原件', () => {
  it('点击把该事件的锚原样交给 canonical reader 入口（不改写、不重算坐标）', () => {
    const onOpenSource = vi.fn();
    mount(createElement(TimelinePanel, { timeline: TIMELINE, onOpenSource }));

    const goto = button('timeline-goto-source');
    expect(goto.disabled).toBe(false);
    act(() => { goto.click(); });

    expect(onOpenSource).toHaveBeenCalledTimes(1);
    expect(onOpenSource).toHaveBeenCalledWith(MINTED_ANCHOR);
  });

  it('死态退役的具名反向锁：面上不再出现「尚未接通」', () => {
    mount(createElement(TimelinePanel, { timeline: TIMELINE, onOpenSource: vi.fn() }));
    expect(container?.textContent ?? '').not.toContain('尚未接通');
    expect(container?.textContent ?? '').toContain('回到原件');
  });
});

describe('矩阵审阅面 · 回到原件', () => {
  it('有锚的格可点并原样交锚；「未提及」的零锚格禁用且点了零调用', () => {
    const onOpenSource = vi.fn();
    mount(createElement(MatrixPanel, { matrix: MATRIX, onOpenSource }));

    const answered = button('matrix-goto-source-v1-q1');
    expect(answered.disabled).toBe(false);
    act(() => { answered.click(); });
    expect(onOpenSource).toHaveBeenCalledWith(MINTED_ANCHOR);

    const unanswered = button('matrix-goto-source-v1-q2');
    expect(unanswered.disabled).toBe(true);
    act(() => { unanswered.click(); });
    // 阴性对照：禁用格没有把调用数推上去——「有锚才可点」不是靠样式装出来的。
    expect(onOpenSource).toHaveBeenCalledTimes(1);
  });

  it('图例与死态文案同批退役：矩阵面不再宣称「尚未接通」', () => {
    mount(createElement(MatrixPanel, { matrix: MATRIX, onOpenSource: vi.fn() }));
    expect(container?.textContent ?? '').not.toContain('尚未接通');
  });
});
