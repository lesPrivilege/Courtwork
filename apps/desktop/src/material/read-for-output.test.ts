import { describe, expect, it, vi } from 'vitest';
import type { ReadingViewOutcome } from '@courtwork/reading-view';
import { compileDraftToDocx } from '@courtwork/output';
import type { StoredMaterial } from './material-ref';
import { MaterialStore, NOT_DOCX_COPY, type HostReadResult, type MaterialHostPort } from './material-store';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O5：output 读取必须以**一次** host `readOriginal` 得到的同一份
 * bytes 完成全部复验后才返回。先 `resolveForProvider` 再第二次读原件会在两次读取之间留下
 * TOCTOU 窗口——那正是本组要结构性封死的东西。
 */
const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const CASE_ID = 'case-x';
const MATERIAL_ID = 'mat-primary';

/** 最小合法 DOCX 字节：借 output 既有的 draft 编译器铸一份真 docx，不在测试里另造 zip 工具。 */
function minimalDocxBytes(): Uint8Array {
  return new Uint8Array(compileDraftToDocx({ title: '设备采购合同', paragraphs: ['第六条 违约金按日计。'] }));
}

async function sha256Of(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const READING_MARKDOWN = '# 合同\n\n第六条 违约金按日计。';

function readingViewOk(): ReadingViewOutcome {
  return {
    status: 'converted',
    view: {
      markdown: READING_MARKDOWN,
      paragraphs: [
        {
          index: 0,
          anchor: {
            fileId: MATERIAL_ID,
            quote: '第六条 违约金按日计。',
            textRange: { start: 0, end: 11 },
            textLayerVersion: 'docx-text@1+abc',
          },
        },
      ],
    },
  } as unknown as ReadingViewOutcome;
}

interface HarnessOptions {
  stored?: Partial<StoredMaterial> | null;
  read?: () => Promise<HostReadResult>;
  convert?: () => Promise<ReadingViewOutcome>;
}

async function harness(options: HarnessOptions = {}) {
  const bytes = minimalDocxBytes();
  const contentSha256 = await sha256Of(bytes);
  const readingViewSha256 = await sha256Of(new TextEncoder().encode(READING_MARKDOWN));
  const stored: StoredMaterial | null =
    options.stored === null
      ? null
      : {
          materialId: MATERIAL_ID,
          caseId: CASE_ID,
          fileName: '设备采购合同.docx',
          mediaType: DOCX_MEDIA_TYPE,
          byteLength: bytes.byteLength,
          contentSha256,
          readingViewVersion: 'reading-view-material@1',
          readingViewSha256,
          status: 'ready',
          readingMarkdown: READING_MARKDOWN,
          blocks: [],
          ...options.stored,
        };
  const readOriginal = vi.fn(options.read ?? (async (): Promise<HostReadResult> => ({ status: 'read', bytes })));
  const host: MaterialHostPort = {
    listDir: vi.fn(),
    readSource: vi.fn(),
    put: vi.fn(),
    get: vi.fn(async () => stored),
    readOriginal,
    list: vi.fn(async () => []),
  } as unknown as MaterialHostPort;
  const convert = vi.fn(options.convert ?? (async () => readingViewOk()));
  return { store: new MaterialStore(host, convert), readOriginal, convert, bytes, contentSha256 };
}

describe('readForOutput · exactly-one host read', () => {
  it('成功路径：host read 计数恰为 1，返回 fileName/bytes/contentSha256', async () => {
    const h = await harness();
    const result = await h.store.readForOutput(CASE_ID, MATERIAL_ID);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('unreachable');
    expect(h.readOriginal).toHaveBeenCalledTimes(1);
    expect(result.fileName).toBe('设备采购合同.docx');
    expect(result.contentSha256).toBe(h.contentSha256);
    expect(Array.from(result.bytes)).toEqual(Array.from(h.bytes));
  });

  it('返回的是防御性复制：改动返回值不影响后续读取', async () => {
    const h = await harness();
    const first = await h.store.readForOutput(CASE_ID, MATERIAL_ID);
    if (first.status !== 'ready') throw new Error('unreachable');
    first.bytes[0] = 0xff;
    const second = await h.store.readForOutput(CASE_ID, MATERIAL_ID);
    if (second.status !== 'ready') throw new Error('unreachable');
    expect(second.bytes[0]).not.toBe(0xff);
  });

  it('宿主在复验后、返回前替换 bytes：read 计数仍为 1，返回值与被复验的 snapshot 同源', async () => {
    const good = minimalDocxBytes();
    let handedOut: Uint8Array | undefined;
    const h = await harness({
      read: async () => {
        handedOut = new Uint8Array(good);
        return { status: 'read', bytes: handedOut };
      },
    });
    const result = await h.store.readForOutput(CASE_ID, MATERIAL_ID);
    if (result.status !== 'ready') throw new Error('unreachable');
    // 宿主事后篡改它交出的那块内存：返回值已是复验时刻的副本，不受影响。
    handedOut!.fill(0);
    expect(h.readOriginal).toHaveBeenCalledTimes(1);
    expect(await sha256Of(result.bytes)).toBe(h.contentSha256);
  });
});

describe('readForOutput · fail-closed 次序', () => {
  it('demo case 直接 out_of_scope，零 host read', async () => {
    const h = await harness();
    const result = await h.store.readForOutput('demo-linjiang', MATERIAL_ID);
    expect(result).toEqual({ status: 'blocked', reason: 'out_of_scope' });
    expect(h.readOriginal).not.toHaveBeenCalled();
  });

  it('未知/跨 case → not_found，零 host read', async () => {
    const h = await harness({ stored: null });
    expect(await h.store.readForOutput(CASE_ID, MATERIAL_ID)).toEqual({ status: 'blocked', reason: 'not_found' });
    expect(h.readOriginal).not.toHaveBeenCalled();
  });

  it('needs_ocr / rejected 各自映射，零 host read', async () => {
    for (const [status, reason] of [['needs_ocr', 'needs_ocr'], ['rejected', 'rejected']] as const) {
      const h = await harness({ stored: { status } });
      expect(await h.store.readForOutput(CASE_ID, MATERIAL_ID)).toEqual({ status: 'blocked', reason });
      expect(h.readOriginal).not.toHaveBeenCalled();
    }
  });

  it('非 DOCX 主合同 → not_docx，且**先于** host read 判定', async () => {
    const h = await harness({ stored: { mediaType: 'application/pdf', fileName: '合同.pdf' } });
    const result = await h.store.readForOutput(CASE_ID, MATERIAL_ID);
    expect(result).toEqual({ status: 'blocked', reason: 'not_docx' });
    expect(h.readOriginal).not.toHaveBeenCalled();
  });

  it('not_docx 的产品文案逐字冻结，不挪用 rejected 假报材料内容失败', () => {
    expect(NOT_DOCX_COPY).toBe('主合同不是 Word 文档 · 请重新选择一份 DOCX 主合同');
  });

  it('宿主读取失败按既有闭集映射，不抛裸异常', async () => {
    for (const [hostReason, expected] of [
      ['unavailable', 'unavailable'],
      ['out_of_scope', 'out_of_scope'],
      ['denied', 'revoked'],
      ['revoked', 'revoked'],
    ] as const) {
      const h = await harness({ read: async () => ({ status: 'failed', reason: hostReason }) });
      expect(await h.store.readForOutput(CASE_ID, MATERIAL_ID)).toEqual({ status: 'blocked', reason: expected });
    }
  });

  it('content hash 漂移 → content_drift', async () => {
    const other = new TextEncoder().encode('别的字节');
    const h = await harness({ read: async () => ({ status: 'read', bytes: other }) });
    expect(await h.store.readForOutput(CASE_ID, MATERIAL_ID)).toEqual({ status: 'blocked', reason: 'content_drift' });
  });

  it('ReadingView 重派生漂移 → reading_drift', async () => {
    const h = await harness({
      convert: async () => {
        const drifted = readingViewOk() as unknown as { view: { markdown: string } };
        drifted.view.markdown = '# 合同\n\n条款已被改写。';
        return drifted as unknown as ReadingViewOutcome;
      },
    });
    expect(await h.store.readForOutput(CASE_ID, MATERIAL_ID)).toEqual({ status: 'blocked', reason: 'reading_drift' });
  });

  it('converter 判 needs_ocr / disabled 分别映射，不外泄异常', async () => {
    const ocr = await harness({ convert: async () => ({ status: 'needs_ocr' }) as unknown as ReadingViewOutcome });
    expect(await ocr.store.readForOutput(CASE_ID, MATERIAL_ID)).toEqual({ status: 'blocked', reason: 'needs_ocr' });

    const disabled = await harness({ convert: async () => ({ status: 'disabled' }) as unknown as ReadingViewOutcome });
    expect(await disabled.store.readForOutput(CASE_ID, MATERIAL_ID)).toEqual({ status: 'blocked', reason: 'rejected' });
  });

  it('共享 DOCX 预检拒绝（不是合法 ZIP 容器）→ rejected，零裸异常、零路径泄漏', async () => {
    // content hash 与 ReadingView 都对得上，唯独字节过不了共享 DOCX 预检——证明预检确实在链上，
    // 而不是靠前面某道门顺带挡住的。
    const notAZip = new TextEncoder().encode('PK-lookalike but not a zip container at all');
    const h = await harness({
      stored: { contentSha256: await sha256Of(notAZip) },
      read: async () => ({ status: 'read', bytes: notAZip }),
      convert: async () => readingViewOk(),
    });
    const result = await h.store.readForOutput(CASE_ID, MATERIAL_ID);
    expect(result).toEqual({ status: 'blocked', reason: 'rejected' });
  });
});
