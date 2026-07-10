import { describe, expect, it } from 'vitest';
import { FileOpsVerbEnum } from '@courtwork/schemas';
import { createToolExecutor } from './contract.js';
import { createMemoryFileOpsHost, hashBytes } from './file-ops-host.js';
import { createFileOpsExecutor } from './file-ops-executor.js';
import {
  createCopyFileTool,
  createMkdirTool,
  createMockCopyFileAdapter,
  createMockMkdirAdapter,
} from './file-ops-lossless.js';

const ROOT = '/tmp/courtwork-cases/整理案';

function enc(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe('file-ops redline — 销毁级永不', () => {
  it('verb enum never includes delete/overwrite', () => {
    expect(FileOpsVerbEnum.options).not.toContain('delete');
    expect(FileOpsVerbEnum.options).not.toContain('overwrite');
    expect(FileOpsVerbEnum.safeParse('delete').success).toBe(false);
  });

  it('executor surface has no deleteLog', () => {
    const host = createMemoryFileOpsHost();
    const executor = createFileOpsExecutor(host);
    expect('deleteLog' in executor).toBe(false);
    expect('clearLog' in executor).toBe(false);
    expect(typeof executor.undo).toBe('function');
    expect(typeof executor.execute).toBe('function');
  });
});

describe('lossless copy/mkdir', () => {
  it('copies a file inside case folder and refuses overwrite', async () => {
    const host = createMemoryFileOpsHost({
      [`${ROOT}/原件/a.pdf`]: enc('hello-a'),
      [`${ROOT}/产出`]: 'dir',
    });
    const tool = createCopyFileTool(createMockCopyFileAdapter(host));
    const result = await createToolExecutor().execute(tool, {
      sourcePath: `${ROOT}/原件/a.pdf`,
      targetPath: `${ROOT}/产出/a-副本.pdf`,
      caseRoot: ROOT,
    });
    expect(result.verified).toBe(true);
    if (result.verified) {
      expect(result.data.feedbackMessage).toContain('已复制');
      expect(result.data.contentHash).toBe(hashBytes(enc('hello-a')));
    }

    const deny = await createToolExecutor().execute(tool, {
      sourcePath: `${ROOT}/原件/a.pdf`,
      targetPath: `${ROOT}/产出/a-副本.pdf`,
      caseRoot: ROOT,
    });
    expect(deny.verified).toBe(false);
  });

  it('mkdir under case folder', async () => {
    const host = createMemoryFileOpsHost({ [ROOT]: 'dir' });
    const tool = createMkdirTool(createMockMkdirAdapter(host));
    const result = await createToolExecutor().execute(tool, {
      path: `${ROOT}/重复项`,
      caseRoot: ROOT,
    });
    expect(result.verified).toBe(true);
  });

  it('rejects out-of-case copy', async () => {
    const host = createMemoryFileOpsHost({ [`${ROOT}/a.pdf`]: enc('x') });
    const tool = createCopyFileTool(createMockCopyFileAdapter(host));
    const result = await createToolExecutor().execute(tool, {
      sourcePath: `${ROOT}/a.pdf`,
      targetPath: '/etc/evil.pdf',
      caseRoot: ROOT,
    });
    expect(result.verified).toBe(false);
  });
});

describe('FileOpsPlan executor + undo byte identity', () => {
  it('executes selected entries and undoes to exact prior snapshot', async () => {
    const host = createMemoryFileOpsHost({
      [`${ROOT}/inbox`]: 'dir',
      [`${ROOT}/inbox/合同v2.pdf`]: enc('contract-bytes-v2'),
      [`${ROOT}/原件`]: 'dir',
    });
    const before = host.snapshot();
    const executor = createFileOpsExecutor(host);

    const plan = {
      id: 'plan-undo-1',
      caseId: 'case-1',
      caseRoot: ROOT,
      createdAt: '2026-07-10T12:00:00.000Z',
      title: '入库',
      entries: [
        {
          id: 'e-mkdir',
          verb: 'mkdir' as const,
          targetPath: `${ROOT}/重复项`,
          reason: '隔离重复',
          selected: true,
        },
        {
          id: 'e-move',
          verb: 'move' as const,
          sourcePath: `${ROOT}/inbox/合同v2.pdf`,
          targetPath: `${ROOT}/原件/设备采购合同.pdf`,
          reason: '归入原件并规范命名',
          selected: true,
          originalFileName: '合同v2.pdf',
        },
        {
          id: 'e-skip',
          verb: 'copy' as const,
          sourcePath: `${ROOT}/原件/设备采购合同.pdf`,
          targetPath: `${ROOT}/产出/x.pdf`,
          reason: '未勾选',
          selected: false,
        },
      ],
    };

    const report = await executor.execute(plan);
    expect(report.failed).toEqual([]);
    expect(report.applied).toHaveLength(2);
    expect(report.skipped).toHaveLength(1);
    expect(await host.exists(`${ROOT}/原件/设备采购合同.pdf`)).toBe(true);
    expect(await host.exists(`${ROOT}/inbox/合同v2.pdf`)).toBe(false);

    const moveRecord = report.applied.find((r) => r.verb === 'move');
    expect(moveRecord?.contentHashBefore).toBe(moveRecord?.contentHashAfter);
    expect(moveRecord?.contentHashBefore).toBe(hashBytes(enc('contract-bytes-v2')));

    // 日志不可删
    expect(executor.getLog('plan-undo-1')?.records.length).toBe(2);

    const undo = await executor.undo('plan-undo-1');
    expect(undo.failed).toEqual([]);
    expect(undo.txnLog.undoneAt).toBeTruthy();
    // 撤销后日志仍在
    expect(executor.getLog('plan-undo-1')).toBeDefined();
    expect(executor.listLogIds()).toContain('plan-undo-1');

    const after = host.snapshot();
    expect(after.size).toBe(before.size);
    for (const [path, content] of before) {
      const restored = after.get(path);
      if (content === null) {
        expect(restored).toBeNull();
      } else {
        expect(restored).toBeInstanceOf(Uint8Array);
        expect([...(restored as Uint8Array)]).toEqual([...content]);
      }
    }
  });

  it('refuses overwrite on move target', async () => {
    const host = createMemoryFileOpsHost({
      [`${ROOT}/a.pdf`]: enc('a'),
      [`${ROOT}/b.pdf`]: enc('b'),
    });
    const executor = createFileOpsExecutor(host);
    const report = await executor.execute({
      id: 'plan-ow',
      caseId: 'c',
      caseRoot: ROOT,
      createdAt: '2026-07-10T12:00:00.000Z',
      entries: [
        {
          id: 'e1',
          verb: 'move',
          sourcePath: `${ROOT}/a.pdf`,
          targetPath: `${ROOT}/b.pdf`,
          reason: '覆盖？',
          selected: true,
        },
      ],
    });
    expect(report.failed[0]?.message).toContain('拒绝覆盖');
    expect(await host.exists(`${ROOT}/a.pdf`)).toBe(true);
  });

  it('single-file move still goes through plan confirmation shape (selected)', async () => {
    const host = createMemoryFileOpsHost({
      [`${ROOT}/x.pdf`]: enc('x'),
      [`${ROOT}/原件`]: 'dir',
    });
    const executor = createFileOpsExecutor(host);
    const unselected = await executor.execute({
      id: 'plan-light',
      caseId: 'c',
      caseRoot: ROOT,
      createdAt: '2026-07-10T12:00:00.000Z',
      entries: [
        {
          id: 'e1',
          verb: 'move',
          sourcePath: `${ROOT}/x.pdf`,
          targetPath: `${ROOT}/原件/x.pdf`,
          reason: '单文件也过计划',
          selected: false,
        },
      ],
    });
    expect(unselected.applied).toHaveLength(0);
    expect(unselected.skipped).toHaveLength(1);

    const selected = await executor.execute({
      id: 'plan-light-2',
      caseId: 'c',
      caseRoot: ROOT,
      createdAt: '2026-07-10T12:00:00.000Z',
      entries: [
        {
          id: 'e1',
          verb: 'move',
          sourcePath: `${ROOT}/x.pdf`,
          targetPath: `${ROOT}/原件/x.pdf`,
          reason: '确认后执行',
          selected: true,
        },
      ],
    });
    expect(selected.applied).toHaveLength(1);
  });
});
