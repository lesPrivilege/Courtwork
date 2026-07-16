import { describe, expect, it, vi } from 'vitest';
import appSource from '../App.tsx?raw';
import {
  assembleRequestContent,
  createAttachmentShell,
  resolveAttachmentUpload,
  withResolvedStatus,
} from './process-upload.js';
import type { ComposerAttachment } from './types.js';
import { DEFAULT_MODEL_CONFIG } from '../provider/model-config';
import { sendChatTurn } from '../provider/chat-client';
import { TurnProtocolClient, createLocalStorageTurnJournalBackend } from '../provider/turn-protocol-client';

const LEGACY_ATTACHMENT_PLACEHOLDER = ['（', '附文件', '）'].join('');

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function protocolClient() {
  return new TurnProtocolClient(createLocalStorageTurnJournalBackend(new MemoryStorage()));
}

function sseResponse(lines: string[], status = 200): Response {
  return new Response(`${lines.join('\n\n')}\n\n`, {
    status,
    headers: { 'content-type': 'text/event-stream' },
  });
}

function readyAttachment(fileName: string, markdown: string, id = `att-${fileName}`): ComposerAttachment {
  return {
    id,
    fileName,
    fileKind: 'md',
    scope: 'message_only',
    status: { kind: 'ready' },
    bytes: new Uint8Array(),
    readingMarkdown: markdown,
  };
}

describe('process-upload', () => {
  it('creates shells in message_only scope with uploading status', () => {
    const bytes = new TextEncoder().encode('# hi');
    const shell = createAttachmentShell('说明.md', bytes, 'att-1', 1_000);
    expect(shell.scope).toBe('message_only');
    expect(shell.fileKind).toBe('md');
    expect(shell.status).toEqual({ kind: 'uploading', startedAt: 1_000 });
  });

  it('resolves ok outcomes with content to ready and keeps markdown', async () => {
    const shell = createAttachmentShell('说明.md', new TextEncoder().encode('# hi'), 'att-1');
    const convert = vi.fn(async () => ({
      status: 'ok' as const,
      fileId: 'att-1',
      fileName: '说明.md',
      view: { fileId: 'att-1', markdown: '# hi', paragraphs: [] },
    }));
    const resolved = await resolveAttachmentUpload(shell, convert);
    expect(resolved.kind).toBe('ready');
    expect(resolved.readingMarkdown).toBe('# hi');
    expect(withResolvedStatus(shell, resolved).status.kind).toBe('ready');
  });

  it('reading-view 空文件（ok + 空 markdown）阻断为 failed·empty，不再冒充 ready', async () => {
    const shell = createAttachmentShell('空.md', new TextEncoder().encode(''), 'att-e');
    const convert = vi.fn(async () => ({
      status: 'ok' as const,
      fileId: 'att-e',
      fileName: '空.md',
      view: { fileId: 'att-e', markdown: '', paragraphs: [] },
    }));
    const resolved = await resolveAttachmentUpload(shell, convert);
    expect(resolved.kind).toBe('failed');
    if (resolved.kind !== 'failed') throw new Error('unreachable');
    expect(resolved.reason).toBe('empty');
    expect(resolved.retryable).toBe(false);
    expect(resolved.readingMarkdown).toBeUndefined();
    expect(resolved.message).not.toMatch(/OCR|markdown|json/i);
  });

  it('仅空白 markdown 同样判为空内容阻断', async () => {
    const convert = vi.fn(async () => ({
      status: 'ok' as const,
      fileId: 'w',
      fileName: 'w.md',
      view: { fileId: 'w', markdown: '   \n\t', paragraphs: [] },
    }));
    const resolved = await resolveAttachmentUpload(createAttachmentShell('w.md', new Uint8Array(), 'w'), convert);
    expect(resolved.kind).toBe('failed');
    if (resolved.kind !== 'failed') throw new Error('unreachable');
    expect(resolved.reason).toBe('empty');
  });

  it('needs_ocr 以类型级 reason 判别（非文案），仍呈失败态', async () => {
    const shell = createAttachmentShell('scan.png', new Uint8Array([1, 2, 3]), 'att-2');
    const convert = vi.fn(async () => ({
      status: 'needs_ocr' as const,
      fileId: 'att-2',
      fileName: 'scan.png',
    }));
    const resolved = await resolveAttachmentUpload(shell, convert);
    expect(resolved.kind).toBe('failed');
    if (resolved.kind !== 'failed') throw new Error('unreachable');
    expect(resolved.reason).toBe('needs_ocr');
    expect(resolved.message).toContain('文字识别');
    expect(resolved.retryable).toBe(false);
  });

  it('resolves disabled outcomes through failure copy with reason error', async () => {
    const shell = createAttachmentShell('x.docm', new Uint8Array([1]), 'att-3');
    const convert = vi.fn(async () => ({
      status: 'disabled' as const,
      fileId: 'att-3',
      fileName: 'x.docm',
      reason: 'unsupported_format' as const,
    }));
    const resolved = await resolveAttachmentUpload(shell, convert);
    expect(resolved.kind).toBe('failed');
    if (resolved.kind !== 'failed') throw new Error('unreachable');
    expect(resolved.reason).toBe('error');
    expect(resolved.message).toContain('暂不支持');
  });
});

describe('assembleRequestContent（回显/请求同源正文组装）', () => {
  it('用户文本、就绪附件 readingMarkdown 与粘贴块逐字纳入，无占位符', () => {
    const attachments = [
      readyAttachment('a.md', 'ALPHA-BODY', 'a1'),
      readyAttachment('b.md', 'BETA-BODY', 'b1'),
    ];
    const pasteBlocks = ['GAMMA-BLOCK', 'DELTA-BLOCK'];
    const content = assembleRequestContent({ text: 'lead text', attachments, pasteBlocks });
    expect(content).toContain('lead text');
    for (const block of pasteBlocks) expect(content).toContain(block);
    for (const att of attachments) expect(content).toContain(att.readingMarkdown!);
    expect(content).not.toContain(LEGACY_ATTACHMENT_PLACEHOLDER);
  });

  it('只纳入就绪附件内容；失败/需OCR/空态附件被跳过', () => {
    const blocked: ComposerAttachment = {
      id: 'f',
      fileName: 'x.png',
      fileKind: 'image',
      scope: 'message_only',
      status: { kind: 'failed', reason: 'needs_ocr', message: '需要文字识别', retryable: false },
      bytes: new Uint8Array(),
      readingMarkdown: undefined,
    };
    const content = assembleRequestContent({ text: '', attachments: [blocked], pasteBlocks: [] });
    expect(content).toBe('');
  });

  it('捕获真实请求体：就绪附件内容与粘贴块逐字进入 messages[].content', async () => {
    const mdMarker = `MD-${crypto.randomUUID()}`;
    const pasteMarker = `PASTE-${crypto.randomUUID()}`;
    const textMarker = `TEXT-${crypto.randomUUID()}`;
    const content = assembleRequestContent({
      text: textMarker,
      attachments: [readyAttachment('合同.md', `# 合同\n${mdMarker}`)],
      pasteBlocks: [`console.log('${pasteMarker}')`],
    });

    const captured: { body?: Record<string, unknown> } = {};
    const fetchImpl: typeof fetch = async (_input, init) => {
      captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return sseResponse(['data: {"choices":[{"delta":{"content":"收到"}}]}', 'data: [DONE]']);
    };

    await sendChatTurn(protocolClient(), DEFAULT_MODEL_CONFIG, [{ role: 'user', content }], { fetchImpl });
    const serialized = JSON.stringify(captured.body);
    expect(serialized).toContain(mdMarker);
    expect(serialized).toContain(pasteMarker);
    expect(serialized).toContain(textMarker);
  });

  it('App 请求、首轮留存与后续 history 共用 requestContent，不得绕开唯一组装点', () => {
    // UI-SURFACE-1：sendChatTurn 提交核心自 handleChatSend 抽出为 submitChatContent（重试共用），
    // 断言随之拆两段：handleChatSend 只需把同一个 requestContent 变量原样递给 submitChatContent；
    // submitChatContent 内部把其 content 形参原样递给 sendChatTurn——链路仍不可绕开、不可分叉。
    const submitStart = appSource.indexOf('const submitChatContent =');
    const handleStart = appSource.indexOf('const handleChatSend =');
    const handleEnd = appSource.indexOf('const stopChatTurn =', handleStart);
    expect(submitStart).toBeGreaterThanOrEqual(0);
    expect(handleStart).toBeGreaterThan(submitStart);
    expect(handleEnd).toBeGreaterThan(handleStart);

    const submitFn = appSource.slice(submitStart, handleStart);
    const handler = appSource.slice(handleStart, handleEnd);

    expect(handler).toContain('const requestContent = assembleRequestContent({');
    expect(handler).toMatch(/role: 'user',\s*text: payload\.text,\s*content: requestContent/);
    expect(handler).toMatch(/submitChatContent\(requestContent,/);
    expect(handler).not.toContain(LEGACY_ATTACHMENT_PLACEHOLDER);

    expect(submitFn).toMatch(/sendChatTurn\([\s\S]*content \}/);
    expect(submitFn).not.toContain(LEGACY_ATTACHMENT_PLACEHOLDER);
  });
});
