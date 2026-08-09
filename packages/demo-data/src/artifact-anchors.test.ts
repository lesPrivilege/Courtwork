import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * DEMO-ANCHOR-2：样板案 timeline / party-graph / review-matrix 三面产物的锚点结构真值。
 *
 * 承 `DEMO-ANCHOR-1` 的判断：**判别力的真座位在消费端 resolver**（desktop 的
 * `resolveLegalDemoSource` × `resolveReaderFocus`），本包只看守自己拥有的东西——
 * 锚点确实指向语料里那段字。故此处不复制 FNV-1a、不复制坐标算法，只做切片等式与形态判据。
 *
 * 文件名不写进本谱：`fileId` 从产物读出，语料路径由目录扫描解析（语料墙）。
 */

const dataRoot = join(import.meta.dirname, '..', 'data');
const corpusDirs = [join(dataRoot, 'dossier'), join(dataRoot, 'contracts', 'variants')];

const corpusIndex = new Map<string, string>();
for (const dir of corpusDirs) {
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.md')) corpusIndex.set(entry, join(dir, entry));
  }
}

const sources = new Map<string, string>();
function corpusSource(fileId: string): string {
  const cached = sources.get(fileId);
  if (cached !== undefined) return cached;
  const path = corpusIndex.get(fileId);
  if (!path) throw new Error(`语料里没有 fileId：${fileId}`);
  const text = readFileSync(path, 'utf8');
  sources.set(fileId, text);
  return text;
}

interface Anchor {
  fileId: string;
  quote: string;
  textRange?: { start: number; end: number };
  textLayerVersion?: string;
}

interface Located {
  label: string;
  anchor: Anchor;
}

function collect(artifact: string): Located[] {
  const doc: unknown = JSON.parse(
    readFileSync(join(dataRoot, 'artifacts', `${artifact}.json`), 'utf8'),
  );
  const found: Located[] = [];
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}[${index}]`));
      return;
    }
    if (node === null || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (typeof record.fileId === 'string' && typeof record.quote === 'string') {
      found.push({ label: `${path} · ${record.fileId}`, anchor: record as unknown as Anchor });
      return;
    }
    for (const [key, value] of Object.entries(record)) walk(value, `${path}/${key}`);
  };
  walk(doc, artifact);
  return found;
}

/**
 * 显示安全段：阅读面按行渲染并把 `**强调**` 拆成片段（见 desktop `ReaderPane`）。
 * 一枚锚点若跨行或跨 `**` 边界，就会被切成多处高亮——故锚点区间必须整段落在同一片段内。
 * 该判据同时蕴含「quote 不含 `**`」（否则切片等式必然把标记吃进引语）。
 */
function displaySafeSegments(text: string): Array<[number, number]> {
  const segments: Array<[number, number]> = [];
  let lineStart = 0;
  for (const line of text.split('\n')) {
    let cursor = lineStart;
    for (const part of line.split(/(\*\*)/g)) {
      if (part === '**') {
        cursor += 2;
        continue;
      }
      segments.push([cursor, cursor + part.length]);
      cursor += part.length;
    }
    lineStart += line.length + 1;
  }
  return segments;
}

const ARTIFACTS: Array<[string, number]> = [
  ['timeline', 49],
  ['party-graph', 18],
  ['review-matrix', 70],
];

describe.each(ARTIFACTS)('%s.json 锚点对齐样板案原文（结构真值）', (artifact, expectedCount) => {
  const anchors = collect(artifact);

  it(`恰 ${expectedCount} 枚锚点，且逐枚携 textLayerVersion（零占位）`, () => {
    expect(anchors).toHaveLength(expectedCount);
    for (const { label, anchor } of anchors) {
      expect(anchor.textLayerVersion, `${label}: textLayerVersion 必须存在且非空`).toBeTruthy();
    }
  });

  it.each(anchors.map((a) => [a.label, a] as const))('%s: slice===quote、start>0、end≤length', (_label, located) => {
    const source = corpusSource(located.anchor.fileId);
    const range = located.anchor.textRange;
    expect(range, '锚点必须携 textRange').toBeDefined();
    const { start, end } = range!;
    expect(Number.isInteger(start) && Number.isInteger(end)).toBe(true);
    expect(start, 'start 不得恒为 0（退役占位区间）').toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(end, 'end 不得越界').toBeLessThanOrEqual(source.length);
    expect(source.slice(start, end), `offset [${start},${end}) 切片必须逐字等于 quote`)
      .toBe(located.anchor.quote);
  });

  it('每枚锚点整段落在单行单 `**` 片段内（阅读面恰一处高亮）', () => {
    for (const { label, anchor } of anchors) {
      const segments = displaySafeSegments(corpusSource(anchor.fileId));
      const { start, end } = anchor.textRange!;
      const inside = segments.some(([from, to]) => start >= from && end <= to);
      expect(inside, `${label}: 区间跨行或跨 ** 边界，阅读面会裂成多处高亮`).toBe(true);
      expect(anchor.quote).not.toContain('**');
      expect(anchor.quote).not.toContain('\n');
    }
  });

  it('同一 fileId 的锚点共用一个 textLayerVersion，且版本内含长度与语料现读一致', () => {
    const byFile = new Map<string, Set<string>>();
    for (const { anchor } of anchors) {
      const versions = byFile.get(anchor.fileId) ?? new Set<string>();
      versions.add(anchor.textLayerVersion!);
      byFile.set(anchor.fileId, versions);
    }
    expect(byFile.size).toBeGreaterThan(0);
    for (const [fileId, versions] of byFile) {
      expect(versions.size, `${fileId}: 同一原件不得出现两个文本层版本`).toBe(1);
      const version = [...versions][0]!;
      // 版本形如 `source-text@1:<utf16Length>:<hash>`；长度位由本包核，hash 由消费端 resolver 核。
      const declaredLength = Number(version.split(':')[1]);
      expect(declaredLength, `${fileId}: 版本串长度位必须等于语料现读长度`)
        .toBe(corpusSource(fileId).length);
    }
  });

  it('quote 非退化：长度 > 2 且不含控制字符', () => {
    for (const { label, anchor } of anchors) {
      expect(anchor.quote.length, `${label}: 引语过短`).toBeGreaterThan(2);
      // eslint-disable-next-line no-control-regex
      expect(anchor.quote).not.toMatch(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
    }
  });
});
