// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Composer } from './Composer';
import type { ConvertInput, ReadingViewOutcome } from '@courtwork/reading-view';

/**
 * PILOT-LIVE-1：
 * - C1 入口收窄——composer 一次只承载一份文件；文件夹 / 多文件 / 已有附件再添一律清空 + 引导，
 *   不误当单文件静默处理（核心不变量四）。
 * - A2 读取失败显式态——ingestFiles 内 readFileBytes 抛错不得让整批附件静默消失。
 */

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function render(node: Parameters<NonNullable<typeof root>['render']>[0]) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
  return container;
}

const okConvert = async (input: ConvertInput): Promise<ReadingViewOutcome> => ({
  status: 'ok',
  fileId: input.fileId,
  fileName: input.fileName,
  view: { fileId: input.fileId, markdown: `# ${input.fileName}`, paragraphs: [] },
});

function chipEls(host: HTMLElement) {
  return [...host.querySelectorAll('[data-testid^="attachment-chip-"]')];
}

/** 微任务队列彻底排空（较 3× await Promise.resolve() 更稳，覆盖任意深度的 promise 链）。 */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** 构造一次携文件的 window 级 drop 事件；directoryAt 标记哪些下标的条目命中 webkitGetAsEntry().isDirectory。 */
function dispatchDrop(files: File[], directoryAt: number[] = []) {
  const items = files.map((_, index) => ({
    webkitGetAsEntry: () => ({ isDirectory: directoryAt.includes(index) }),
  }));
  const event = new Event('drop', { bubbles: true, cancelable: true }) as unknown as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { files, items, types: ['Files'] },
  });
  window.dispatchEvent(event);
}

describe('Composer：C1 入口收窄 + 引导态', () => {
  it('drop 目录（webkitGetAsEntry().isDirectory=true）→ 零 chip + composer-entry-guidance 可见', async () => {
    const host = render(createElement(Composer, { convert: okConvert }));
    // type/size 均非空，隔离出 webkitGetAsEntry 是唯一命中信号（不误吞进疑似目录兜底路径）。
    const folderLikeFile = new File(['x'], 'MyFolder', { type: 'application/octet-stream' });

    await act(async () => {
      dispatchDrop([folderLikeFile], [0]);
      await flush();
    });

    expect(chipEls(host)).toHaveLength(0);
    expect(host.querySelector('[data-testid="composer-entry-guidance"]')).not.toBeNull();
  });

  it('drop 两个文件 → 零 chip + 引导', async () => {
    const host = render(createElement(Composer, { convert: okConvert }));
    const a = new File(['alpha'], 'a.md', { type: 'text/markdown' });
    const b = new File(['beta'], 'b.md', { type: 'text/markdown' });

    await act(async () => {
      dispatchDrop([a, b]);
      await flush();
    });

    expect(chipEls(host)).toHaveLength(0);
    expect(host.querySelector('[data-testid="composer-entry-guidance"]')).not.toBeNull();
  });

  it('已有一枚附件再 drop 一个 → 仍一枚 + 引导（不吞、不覆盖）', async () => {
    const host = render(createElement(Composer, { convert: okConvert }));
    const first = new File(['first-body'], 'first.md', { type: 'text/markdown' });

    await act(async () => {
      dispatchDrop([first]);
      await flush();
    });
    expect(chipEls(host)).toHaveLength(1);
    expect(host.querySelector('[data-testid="composer-entry-guidance"]')).toBeNull();

    const second = new File(['second-body'], 'second.md', { type: 'text/markdown' });
    await act(async () => {
      dispatchDrop([second]);
      await flush();
    });

    expect(chipEls(host)).toHaveLength(1);
    expect(chipEls(host)[0].textContent).toContain('first.md');
    expect(host.querySelector('[data-testid="composer-entry-guidance"]')).not.toBeNull();
  });
});

describe('Composer：A2 读取失败显式态', () => {
  it('readFileBytes 抛错（File.arrayBuffer reject）→ 一枚 failed chip 显式文案（非静默消失）', async () => {
    const host = render(createElement(Composer, { convert: okConvert }));
    const broken = new File(['ignored'], 'broken.md', { type: 'text/markdown' });
    Object.defineProperty(broken, 'arrayBuffer', {
      value: () => Promise.reject(new Error('simulated host read failure')),
    });

    await act(async () => {
      dispatchDrop([broken]);
      await flush();
    });

    const chips = chipEls(host);
    expect(chips).toHaveLength(1);
    expect(chips[0].getAttribute('data-status')).toBe('failed');
    expect(chips[0].textContent).toContain('读取失败');
  });
});
