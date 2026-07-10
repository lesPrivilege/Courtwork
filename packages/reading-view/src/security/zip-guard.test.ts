import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { readZipCentralDirectory, checkZipBomb, ZipInspectionError } from './zip-guard.js';

describe('readZipCentralDirectory', () => {
  it('正确读出正常 zip 的每个 entry 的压缩/未压缩大小', () => {
    const content = strToU8('hello world '.repeat(50));
    const zipped = zipSync({ 'a.txt': content, 'b.txt': strToU8('x') }, { level: 6 });
    const entries = readZipCentralDirectory(zipped);
    expect(entries.map((e) => e.name).sort()).toEqual(['a.txt', 'b.txt']);
    const a = entries.find((e) => e.name === 'a.txt')!;
    expect(a.uncompressedSize).toBe(content.byteLength);
  });

  it('高压缩比内容的未压缩大小如实反映真实体积（不需要真的解压就能读到）', () => {
    const huge = new Uint8Array(5 * 1024 * 1024); // 全零，deflate 下极易压缩
    const zipped = zipSync({ 'word/document.xml': huge }, { level: 9 });
    const entries = readZipCentralDirectory(zipped);
    const entry = entries.find((e) => e.name === 'word/document.xml')!;
    expect(entry.uncompressedSize).toBe(5 * 1024 * 1024);
    expect(entry.compressedSize).toBeLessThan(10_000);
  });

  it('不是合法 zip 时抛 ZipInspectionError，不是静默返回空数组', () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5]);
    expect(() => readZipCentralDirectory(garbage)).toThrow(ZipInspectionError);
  });
});

describe('checkZipBomb', () => {
  it('比例与总量均未超限时判定不可疑', () => {
    const result = checkZipBomb(
      [{ name: 'a', compressedSize: 100, uncompressedSize: 200 }],
      { maxDecompressionRatio: 100, maxUncompressedBytes: 1_000_000 },
    );
    expect(result.suspicious).toBe(false);
  });

  it('单个 entry 解压比例超限时判定可疑', () => {
    const result = checkZipBomb(
      [{ name: 'word/document.xml', compressedSize: 100, uncompressedSize: 1_000_000 }],
      { maxDecompressionRatio: 100, maxUncompressedBytes: 1_000_000_000 },
    );
    expect(result.suspicious).toBe(true);
    expect(result.detail).toContain('word/document.xml');
  });

  it('单个 entry 比例达标但总未压缩量超限时判定可疑', () => {
    const result = checkZipBomb(
      [
        { name: 'a', compressedSize: 1000, uncompressedSize: 1000 },
        { name: 'b', compressedSize: 1000, uncompressedSize: 1000 },
      ],
      { maxDecompressionRatio: 100, maxUncompressedBytes: 1500 },
    );
    expect(result.suspicious).toBe(true);
    expect(result.detail).toMatch(/总解压体积/);
  });

  it('compressedSize 为 0 但 uncompressedSize 非零时视为极端比例，判定可疑', () => {
    const result = checkZipBomb(
      [{ name: 'a', compressedSize: 0, uncompressedSize: 500 }],
      { maxDecompressionRatio: 100, maxUncompressedBytes: 1_000_000 },
    );
    expect(result.suspicious).toBe(true);
  });
});
