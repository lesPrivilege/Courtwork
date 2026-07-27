import { describe, expect, it, vi } from 'vitest';
import type { StoredMaterial } from './material-ref';
import {
  ingestAuthorizedFolder,
  ingestComposerUploads,
  selectDossierUploads,
  type CaseIngestDeps,
  type ComposerUpload,
} from './case-ingest';

const CASE_ID = 'case-1';
const GRANT_ID = 'grant-1';

function upload(fileName: string, scope: ComposerUpload['scope'], kind: 'ready' | 'uploading' = 'ready'): ComposerUpload {
  return {
    fileName,
    bytes: new TextEncoder().encode(`# ${fileName}`),
    scope,
    status: kind === 'ready' ? { kind: 'ready' } : { kind: 'uploading', startedAt: 0 },
  };
}

function storedMaterial(fileName: string): StoredMaterial {
  return {
    materialId: `mat-${fileName}`,
    caseId: CASE_ID,
    fileName,
    mediaType: 'text/markdown',
    byteLength: 8,
    contentSha256: 'sha',
    readingViewVersion: 'reading-view-material@1',
    readingViewSha256: 'rsha',
    readingMarkdown: '正文',
    blocks: [],
    status: 'ready',
  };
}

interface Harness {
  deps: CaseIngestDeps;
  listDir: ReturnType<typeof vi.fn>;
  readSource: ReturnType<typeof vi.fn>;
  ingest: ReturnType<typeof vi.fn>;
  listForCase: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
  feedback: ReturnType<typeof vi.fn>;
  listed: ReturnType<typeof vi.fn>;
}

function harness(listing: StoredMaterial[] = []): Harness {
  const listDir = vi.fn(async () => ({ status: 'listed' as const, entries: [] }));
  // 缺省：项目文件夹内没有同名原件（走写入分支）。
  const readSource = vi.fn(async () => ({ status: 'failed' as const, reason: 'unavailable' as const }));
  const ingest = vi.fn(async (_caseId: string, source: { fileName: string }) => ({
    status: 'ingested' as const,
    material: storedMaterial(source.fileName),
  }));
  const listForCase = vi.fn(async () => listing);
  const writeFile = vi.fn(async () => ({ status: 'wrote' as const, byteLength: 8 }));
  const feedback = vi.fn();
  const listed = vi.fn();
  return {
    deps: {
      materials: { listDir, readSource, ingest, listForCase },
      writeFile,
      sink: { feedback, listed },
    } as unknown as CaseIngestDeps,
    listDir,
    readSource,
    ingest,
    listForCase,
    writeFile,
    feedback,
    listed,
  };
}

describe('DEBT-DOSSIER-1 件一 · 入库判据（scope 的唯一真源）', () => {
  it('只取 scope=dossier 且 ready 的上传——message_only 与未就绪一律不入库判据', () => {
    const picked = selectDossierUploads([
      upload('卷宗件.md', 'dossier'),
      upload('随手问.md', 'message_only'),
      upload('还在处理.md', 'dossier', 'uploading'),
    ]);
    expect(picked.map((item) => item.fileName)).toEqual(['卷宗件.md']);
  });

  it('全为 message_only 时判据为空集（不是「全部」也不是「第一件」）', () => {
    expect(selectDossierUploads([upload('a.md', 'message_only'), upload('b.md', 'message_only')])).toEqual([]);
  });

  it('message-only 上传：零写授权目录、零 MaterialStore 记录、零计数反馈', async () => {
    const h = harness();
    await ingestComposerUploads(h.deps, CASE_ID, GRANT_ID, [upload('随手问.md', 'message_only')]);
    expect(h.writeFile).not.toHaveBeenCalled();
    expect(h.ingest).not.toHaveBeenCalled();
    expect(h.listForCase).not.toHaveBeenCalled();
    expect(h.listed).not.toHaveBeenCalled();
    expect(h.feedback).not.toHaveBeenCalled();
  });

  it('双 scope 同批：dossier 件恰一件入库，message-only 件零写零入库', async () => {
    const h = harness([storedMaterial('卷宗件.md')]);
    await ingestComposerUploads(h.deps, CASE_ID, GRANT_ID, [
      upload('卷宗件.md', 'dossier'),
      upload('随手问.md', 'message_only'),
    ]);
    expect(h.writeFile).toHaveBeenCalledTimes(1);
    expect(h.writeFile.mock.calls[0]?.[0]).toMatchObject({ grantId: GRANT_ID, relativePath: '卷宗件.md', overwrite: false });
    expect(h.ingest).toHaveBeenCalledTimes(1);
    expect(h.ingest.mock.calls[0]?.[1]).toMatchObject({ fileName: '卷宗件.md' });
    expect(h.listed).toHaveBeenCalledWith(CASE_ID, [storedMaterial('卷宗件.md')]);
  });

  it('计数只由 listForCase 回灌——入库件数与列表长度失配时以列表为准（不自增、不猜数）', async () => {
    const h = harness([storedMaterial('a.md'), storedMaterial('b.md'), storedMaterial('c.md')]);
    await ingestComposerUploads(h.deps, CASE_ID, GRANT_ID, [upload('a.md', 'dossier')]);
    expect(h.listed).toHaveBeenCalledTimes(1);
    expect(h.listed.mock.calls[0]?.[1]).toHaveLength(3);
  });

  it('同名同内容：跳过写入、就地入库（不重复上传）', async () => {
    const h = harness();
    const bytes = new TextEncoder().encode('# 卷宗件.md');
    h.readSource.mockResolvedValue({ status: 'read', bytes });
    await ingestComposerUploads(h.deps, CASE_ID, GRANT_ID, [upload('卷宗件.md', 'dossier')]);
    expect(h.writeFile).not.toHaveBeenCalled();
    expect(h.ingest).toHaveBeenCalledTimes(1);
  });

  it('同名异内容：显式拒绝不覆写，零入库（原件只读红线）', async () => {
    const h = harness();
    h.readSource.mockResolvedValue({ status: 'read', bytes: new TextEncoder().encode('完全不同的既有原件') });
    await ingestComposerUploads(h.deps, CASE_ID, GRANT_ID, [upload('卷宗件.md', 'dossier')]);
    expect(h.writeFile).not.toHaveBeenCalled();
    expect(h.ingest).not.toHaveBeenCalled();
    expect(h.feedback).toHaveBeenCalledWith(expect.stringContaining('同名'), false);
  });

  it('写入失败：显式呈现，不静默吞', async () => {
    const h = harness();
    h.writeFile.mockResolvedValue({ status: 'failed', reason: 'revoked' });
    await ingestComposerUploads(h.deps, CASE_ID, GRANT_ID, [upload('卷宗件.md', 'dossier')]);
    expect(h.ingest).not.toHaveBeenCalled();
    expect(h.feedback).toHaveBeenCalledWith(expect.stringContaining('未能入库'), false);
  });

  it('入库失败：显式呈现，不静默吞', async () => {
    const h = harness();
    h.ingest.mockResolvedValue({ status: 'failed', reason: 'unavailable' });
    await ingestComposerUploads(h.deps, CASE_ID, GRANT_ID, [upload('卷宗件.md', 'dossier')]);
    expect(h.feedback).toHaveBeenCalledWith(expect.stringContaining('未能入库'), false);
  });
});

describe('DEBT-DOSSIER-1 件一 · 整夹入库仍走同一计数出口', () => {
  it('枚举 → 逐件入库 → 以 listForCase 结果回灌计数', async () => {
    const h = harness([storedMaterial('一.md'), storedMaterial('二.md')]);
    h.listDir.mockResolvedValue({
      status: 'listed',
      entries: [
        { relativePath: '一.md', fileName: '一.md' },
        { relativePath: '二.md', fileName: '二.md' },
      ],
    });
    await ingestAuthorizedFolder(h.deps, CASE_ID, GRANT_ID, '案卷夹');
    expect(h.ingest).toHaveBeenCalledTimes(2);
    expect(h.listed).toHaveBeenCalledWith(CASE_ID, [storedMaterial('一.md'), storedMaterial('二.md')]);
    expect(h.feedback).toHaveBeenCalledWith(expect.stringContaining('已从〔案卷夹〕入库 2 件'), true);
  });

  it('枚举失败：显式反馈且零入库、零计数回灌', async () => {
    const h = harness();
    h.listDir.mockResolvedValue({ status: 'failed', reason: 'revoked' });
    await ingestAuthorizedFolder(h.deps, CASE_ID, GRANT_ID, '案卷夹');
    expect(h.ingest).not.toHaveBeenCalled();
    expect(h.listed).not.toHaveBeenCalled();
    expect(h.feedback).toHaveBeenCalledWith(expect.stringContaining('授权'), false);
  });
});
