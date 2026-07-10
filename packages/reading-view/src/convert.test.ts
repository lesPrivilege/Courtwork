import { describe, expect, it } from 'vitest';
import { convertToReadingView, withTimeout } from './convert.js';

describe('withTimeout', () => {
  it('任务在超时前完成时正常返回结果', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('任务超过 timeoutMs 未完成时 reject（用永不 resolve 的 promise 保证不受机器速度影响）', async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toThrow(/超时/);
  });
});

describe('convertToReadingView 格式分发', () => {
  it('.md 扩展名分发到 md 转换器', async () => {
    const outcome = await convertToReadingView({
      fileId: 'f1',
      fileName: 'a.md',
      data: new TextEncoder().encode('# 标题'),
    });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.markdown).toBe('# 标题');
  });

  it('.txt 扩展名分发到 txt 转换器', async () => {
    const outcome = await convertToReadingView({ fileId: 'f2', fileName: 'a.txt', data: new TextEncoder().encode('段落') });
    expect(outcome.status).toBe('ok');
  });

  it('显式 format 覆盖优先于文件名推断', async () => {
    const outcome = await convertToReadingView({
      fileId: 'f3',
      fileName: 'no-extension-name',
      format: 'txt',
      data: new TextEncoder().encode('段落'),
    });
    expect(outcome.status).toBe('ok');
  });

  it('jpg/png 短路为 needs_ocr，不进入任何解析路径', async () => {
    const jpg = await convertToReadingView({ fileId: 'f4', fileName: 'scan.jpg', data: new Uint8Array([1, 2, 3]) });
    const png = await convertToReadingView({ fileId: 'f5', fileName: 'scan.png', data: new Uint8Array([1, 2, 3]) });
    expect(jpg.status).toBe('needs_ocr');
    expect(png.status).toBe('needs_ocr');
  });

  it('.docm 扩展名（宏使能）判定为 unsupported_format，不尝试解析', async () => {
    const outcome = await convertToReadingView({ fileId: 'f6', fileName: 'a.docm', data: new Uint8Array([1, 2, 3]) });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'unsupported_format' });
  });

  it('未知扩展名判定为 unsupported_format', async () => {
    const outcome = await convertToReadingView({ fileId: 'f7', fileName: 'a.xyz', data: new Uint8Array([1]) });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'unsupported_format' });
  });

  it('文件大小超限时在解析前就判定 file_too_large（不进入任何格式转换器）', async () => {
    const outcome = await convertToReadingView(
      { fileId: 'f8', fileName: 'a.txt', data: new Uint8Array(1000) },
      { maxFileSizeBytes: 10 },
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'file_too_large' });
  });

  it('契约上永不 throw：即便传入完全不合法的输入也返回 disabled 而不是抛异常', async () => {
    // @ts-expect-error 故意传入运行时非法值验证兜底
    const outcome = await convertToReadingView({ fileId: 'f9', fileName: 'a.docx', data: null });
    expect(outcome.status).toBe('disabled');
  });
});
