import { beforeEach, describe, expect, it } from 'vitest';
import {
  MaterialStore,
  createBrowserMaterialHost,
  installMaterialHostTestHooks,
  type MaterialHostPort,
} from './material-store';
import { sha256Hex } from './sha256';

const GRANT = 'grant-a';
const CASE_A = 'case-a';
const CASE_B = 'case-b';

const MD_BYTES = new TextEncoder().encode('# 设备采购合同\n\n第一条 付款：买方于验收后 30 日内付清。\n\n第二条 验收标准。');
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

interface Harness {
  store: MaterialStore;
  host: MaterialHostPort;
  hooks: ReturnType<typeof installMaterialHostTestHooks>;
}

function makeHarness(): Harness {
  const host = createBrowserMaterialHost();
  const hooks = installMaterialHostTestHooks();
  hooks.reset();
  let seq = 0;
  const store = new MaterialStore(host, undefined, () => `mat-${(seq += 1)}`);
  return { store, host, hooks };
}

async function ingestMd(h: Harness, caseId = CASE_A, relativePath = '合同.md'): Promise<string> {
  h.hooks.setFile(GRANT, relativePath, MD_BYTES);
  const result = await h.store.ingest(caseId, { grantId: GRANT, relativePath, fileName: relativePath });
  if (result.status !== 'ingested') throw new Error(`ingest failed: ${JSON.stringify(result)}`);
  return result.material.materialId;
}

describe('MaterialStore · ingest', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('ingests a markdown original: ready, real content hash, non-empty view + blocks', async () => {
    h.hooks.setFile(GRANT, '合同.md', MD_BYTES);
    const result = await h.store.ingest(CASE_A, { grantId: GRANT, relativePath: '合同.md', fileName: '合同.md' });
    expect(result.status).toBe('ingested');
    if (result.status !== 'ingested') return;
    const m = result.material;
    expect(m.status).toBe('ready');
    expect(m.caseId).toBe(CASE_A);
    expect(m.contentSha256).toBe(await sha256Hex(MD_BYTES));
    expect(m.byteLength).toBe(MD_BYTES.byteLength);
    expect(m.readingMarkdown.length).toBeGreaterThan(0);
    expect(m.blocks.length).toBeGreaterThan(0);
    expect(m.mediaType).toBe('text/markdown');
    // source-neutral：持久投影绝不携带 provenance
    expect(m).not.toHaveProperty('grantId');
    expect(m).not.toHaveProperty('relativePath');
  });

  it('marks an image original needs_ocr (blocked from request; no OCR done here)', async () => {
    h.hooks.setFile(GRANT, '印章页.png', PNG_BYTES);
    const result = await h.store.ingest(CASE_A, { grantId: GRANT, relativePath: '印章页.png', fileName: '印章页.png' });
    expect(result.status).toBe('ingested');
    if (result.status !== 'ingested') return;
    expect(result.material.status).toBe('needs_ocr');
    expect(result.material.readingMarkdown).toBe('');
  });

  it('fails structurally when the original cannot be read (not silent)', async () => {
    const result = await h.store.ingest(CASE_A, { grantId: GRANT, relativePath: '缺失.md', fileName: '缺失.md' });
    expect(result).toEqual({ status: 'failed', reason: 'unavailable' });
  });

  it('refuses to ingest a demo case (production store bidirectional isolation)', async () => {
    h.hooks.setFile(GRANT, '合同.md', MD_BYTES);
    await expect(
      h.store.ingest('demo-linjiang', { grantId: GRANT, relativePath: '合同.md', fileName: '合同.md' }),
    ).rejects.toThrow();
  });
});

describe('MaterialStore · resolveForProvider (provider-front verification)', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('resolves a ready material with freshly re-verified content', async () => {
    const id = await ingestMd(h);
    const resolved = await h.store.resolveForProvider(CASE_A, id);
    expect(resolved.status).toBe('ready');
    if (resolved.status !== 'ready') return;
    expect(resolved.material.readingMarkdown.length).toBeGreaterThan(0);
  });

  it('blocks when the original bytes drift (hash mismatch) before provider', async () => {
    const id = await ingestMd(h);
    // 改一字节：原件内容漂移
    h.hooks.setFile(GRANT, '合同.md', new TextEncoder().encode('# 设备采购合同（被篡改）'));
    const resolved = await h.store.resolveForProvider(CASE_A, id);
    expect(resolved).toEqual({ status: 'blocked', reason: 'content_drift' });
  });

  it('blocks explicitly when the original is deleted / volume unmounted', async () => {
    const id = await ingestMd(h);
    h.hooks.deleteFile(GRANT, '合同.md');
    const resolved = await h.store.resolveForProvider(CASE_A, id);
    expect(resolved).toEqual({ status: 'blocked', reason: 'unavailable' });
  });

  it('blocks a needs_ocr material from entering the request', async () => {
    h.hooks.setFile(GRANT, '印章页.png', PNG_BYTES);
    const ingest = await h.store.ingest(CASE_A, { grantId: GRANT, relativePath: '印章页.png', fileName: '印章页.png' });
    if (ingest.status !== 'ingested') throw new Error('setup');
    const resolved = await h.store.resolveForProvider(CASE_A, ingest.material.materialId);
    expect(resolved).toEqual({ status: 'blocked', reason: 'needs_ocr' });
  });

  it('fails closed on cross-case reference (case A material used under case B)', async () => {
    const id = await ingestMd(h, CASE_A);
    const resolved = await h.store.resolveForProvider(CASE_B, id);
    expect(resolved).toEqual({ status: 'blocked', reason: 'not_found' });
  });

  it('blocks on ReadingView hash drift (persisted derived hash tampered)', async () => {
    const id = await ingestMd(h);
    h.hooks.patchRecord(id, { readingViewSha256: 'deadbeef-tampered' });
    const resolved = await h.store.resolveForProvider(CASE_A, id);
    expect(resolved).toEqual({ status: 'blocked', reason: 'reading_drift' });
  });

  it('remains verifiable after restart (records persist; new store instance)', async () => {
    const id = await ingestMd(h);
    // 模拟重启：新建 MaterialStore 实例，复用同一持久 host（records + files 仍在）
    const restarted = new MaterialStore(h.host);
    const resolved = await restarted.resolveForProvider(CASE_A, id);
    expect(resolved.status).toBe('ready');
  });

  it('refuses a demo case at the provider gate (isolation)', async () => {
    const resolved = await h.store.resolveForProvider('demo-linjiang', 'mat-anything');
    expect(resolved).toEqual({ status: 'blocked', reason: 'out_of_scope' });
  });

  it('blocks an unknown material as not_found', async () => {
    const resolved = await h.store.resolveForProvider(CASE_A, 'mat-nope');
    expect(resolved).toEqual({ status: 'blocked', reason: 'not_found' });
  });
});

describe('MaterialStore · listForCase', () => {
  it('lists only this case materials, source-neutral', async () => {
    const h = makeHarness();
    await ingestMd(h, CASE_A, 'a1.md');
    await ingestMd(h, CASE_A, 'a2.md');
    await ingestMd(h, CASE_B, 'b1.md');
    const listA = await h.store.listForCase(CASE_A);
    expect(listA.map((m) => m.fileName).sort()).toEqual(['a1.md', 'a2.md']);
    const listB = await h.store.listForCase(CASE_B);
    expect(listB).toHaveLength(1);
    for (const m of listA) {
      expect(m).not.toHaveProperty('grantId');
      expect(m).not.toHaveProperty('relativePath');
    }
  });
});
