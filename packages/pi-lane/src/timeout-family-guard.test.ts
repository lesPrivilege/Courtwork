import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * PI-TIMEOUT-SWEEP-1 机器形态守卫。
 *
 * 族定义（票面「静态枚举『无显式 timeout 且判据本体为重计算或真 I/O』的用例」）：一枚
 * `it(...)` 的判据本体以 `.repeat(...)` 或 `Array.from({ length: ... })` 构造与某个
 * `MAX_*` 生产边界常量同量级的字符串/数组（真实字节量级构造，不是「凑个大数」的便利值），
 * 却没有给该测试显式的第三参数超时——这正是 `PI-SCAN-TIMEOUT-1/2` 与本票已诊断、处置过的
 * 病根（真实计算量对赌 vitest 5000ms 缺省超时）。
 *
 * 本门只做**候选枚举 + 登记表比对**，不代替人工判据本体核定：新出现的候选（结构匹配但未
 * 登记）一律判红——不认识的候选不允许被静默跳过（判例「终局形态：fail-closed 扫描，不认识
 * 的判据表达式判红而非跳过」）。登记表 `EXEMPT_WITHOUT_TIMEOUT` 只收本票逐条核定过「结构
 * 匹配但无需处置」的成员，且每条必须带理由；新增候选若判定不需处置，必须先进这张表而非让
 * 门放行式沉默。
 *
 * `sidecar.test.ts` 整体豁免：它是全仓唯一真发网络往返的测试（`PI-LANE-SIDECAR-HANG-1`
 * 在案），fail-fast 机制是请求级显式 `AbortSignal.timeout(ROUND_TRIP_BUDGET_MS)`，不是
 * `it()` 级超时——按 PI-TIMEOUT-SWEEP-1 票面边界②，其红须独立归因，不与本超时族合并处置，
 * 本门不对该文件的 `it()` 缺显式超时判红。
 */

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

const HEAVY_MARKER = /\.repeat\(\s*[^)]*\bMAX_[A-Z0-9_]+\b[^)]*\)|length:\s*[^,}]*\bMAX_[A-Z0-9_]+\b/;

/**
 * 第二族形状（`tools.test.ts` 的 `scan`/`hits` fixture）：判据本体不是在 `it()` 体内内联
 * `.repeat(MAX_*)`，而是共享 `beforeAll` 用真实字面量规模的 `createFiles(dir, N, …)`
 * 建真实磁盘文件树（真实 `writeFile` × N 次），`it()` 只以变量名引用该 fixture——
 * `HEAVY_MARKER` 结构性照不到这类（本文件「候选族成员必须有显式 timeout」测试的 born-red
 * 反例已实证：撤 `grep 满 2000 份扫描` 的显式 timeout 后，仅第一族扫描面不会触红）。
 *
 * 判据刻意收窄到 `createFiles(` 这一具名 helper（`tools.test.ts` 独有，见其定义），
 * 不用通用 `.repeat(N)` 数值阈值——本包大量边界测试用 `.repeat(255)`/`.repeat(1024)` 等
 * 构造**单个**小字符串（`MAX_SEGMENT_BYTES`=255、`MAX_LOGICAL_PATH_BYTES`=1024 一类的
 * 边界值探针），量级远非「真」heavy，通用数值阈值在这批语料上产生了两位数假阳性
 * （实测：阈值 200 的 `.repeat(N)` 通用判据一次扫出 40+ 条与磁盘 I/O 无关的边界字面量
 * 测试，是本门实现过程中的真实反例，登记在 SPEC）。`createFiles(dir, N, …)` 精确对应
 * 「真实建 N 份磁盘文件」这一动作，不会与边界字面量语料混淆。
 *
 * 粒度收在**变量名引用**而非「整个 describe 作用域」：`单次调用上限` describe 内另有
 * `未触任一来源…`／`grep 单文件内命中超限` 两枚 `it()`，各自只碰自建的小 sandbox／
 * `longFile`（后者仅 250 行单文件，同一 `.repeat(250)` 但只读一次，非 N 份独立文件），
 * SCAN-1/2 判定它们不需处置（`ACCEPTANCE.md`/`PI-SCAN-TIMEOUT-1/2.md` 从未给它们加
 * timeout）——若按整个 describe 一刀切，会把这两枚也错判为候选，与既有裁定不一致。
 */
const HEAVY_FIXTURE_THRESHOLD = 200; // 与已治理族最小生产常量 MAX_MATCHES=200 同阈值
const HEAVY_FIXTURE_VAR_ASSIGN = /\(\{\s*(?:root:\s*\w+,\s*)?context:\s*(\w+)\s*\}\s*=\s*await sandbox\(/;
const CREATE_FILES_CALL = /createFiles\([^,]+,\s*(\d[\d_]*)\s*,/;
const LOOKAHEAD_LINES = 8; // sandbox(...) 回调体距其 createFiles 调用的最大行距，够本文件现有体例用

/** 一枚 `describe(...)` 块：标题、起止行、原始文本（含其内全部 `it()`，不递归剥离嵌套 describe）。 */
interface DescribeBlock {
  readonly file: string;
  readonly title: string;
  readonly startLine: number;
  readonly text: string;
}

/**
 * 与 `extractItBlocks` 同体例假设（缩进锚定闭合行，非通用 JS 解析器）——`describe(...)` 在
 * 本仓一律以 `});`（与起始同缩进）收尾。刻意不用逐字符括号计数：字符串/模板字面量里的
 * `{`/`}`（如本包多处 `{"pad":""}` JSON 语料）会让括号计数在无关内容处失配，一次真实事故
 * 已实证（本门实现过程中，逐字符计数版本把 `product-protocol.test.ts` 整段扫飞到文件
 * 中段才收尾，误把上百枚无关 `it()` 划进候选）。缩进锚定在此仓库的 eslint/prettier 体例下更稳。
 */
function extractDescribeBlocks(file: string, source: string): DescribeBlock[] {
  const lines = source.split('\n');
  const blocks: DescribeBlock[] = [];
  const startRe = /^(\s*)describe\(\s*(['"`])(.*)\2\s*,/;
  for (let i = 0; i < lines.length; i += 1) {
    const m = startRe.exec(lines[i]);
    if (!m) continue;
    const indent = m[1];
    const title = m[3];
    const closeBrace = `${indent}});`;
    let j = i;
    let end = lines.length - 1;
    for (; j < lines.length; j += 1) {
      if (j > i && lines[j].replace(/\s+$/, '') === closeBrace) {
        end = j;
        break;
      }
    }
    blocks.push({ file, title, startLine: i + 1, text: lines.slice(i, end + 1).join('\n') });
    i = end;
  }
  return blocks;
}

/** 在一个 describe 块文本里找出经 `createFiles(dir, N>=阈值, …)` 建真实磁盘文件树的
 * fixture 变量名集合。 */
function findHeavyFixtureVarNames(describeText: string): Set<string> {
  const lines = describeText.split('\n');
  const names = new Set<string>();
  const sandboxClose = /\}\)\)\s*;?\s*$/;
  for (let i = 0; i < lines.length; i += 1) {
    const assign = HEAVY_FIXTURE_VAR_ASSIGN.exec(lines[i]);
    if (!assign) continue;
    const varName = assign[1];
    // 只在本枚 `sandbox(...)` 调用自己的回调体内找 `createFiles`——遇到该调用自身的收尾
    // `}));` 或下一枚 fixture 赋值行即停，不许越界吃进下一枚 fixture（真实事故：`longFile`
    // 曾借邻近 `scan` 那行的 `createFiles(directory, 2001, …)` 被误判为 heavy，见 SPEC 附）。
    for (let k = i; k < Math.min(lines.length, i + LOOKAHEAD_LINES); k += 1) {
      if (k > i && (sandboxClose.test(lines[k]) || HEAVY_FIXTURE_VAR_ASSIGN.test(lines[k]))) break;
      const call = CREATE_FILES_CALL.exec(lines[k]);
      if (call && Number(call[1].replace(/_/g, '')) >= HEAVY_FIXTURE_THRESHOLD) {
        names.add(varName);
        break;
      }
    }
  }
  return names;
}

/** 一枚 `it(...)`/`it.each(...)(...)` 调用块：标题、起止行、原始文本。 */
export interface ItBlock {
  readonly file: string;
  readonly title: string;
  readonly startLine: number;
  readonly text: string;
}

/**
 * 按行扫描，逐枚提取 `it('title', ...)` 调用块。假定本仓既有 eslint/prettier 体例
 * （闭合 `);`/`});` 缩进与调用起始同级）——扫描器本身以此体例为前提，非通用 JS 解析器；
 * 前提被打破（缩进漂移）会导致块提取失败而不是误判，故仍不构成「静默跳过」。
 */
export function extractItBlocks(file: string, source: string): ItBlock[] {
  const lines = source.split('\n');
  const blocks: ItBlock[] = [];
  const startRe = /^(\s*)it(?:\.each\([^\n]*\))?\(\s*$/;
  const startInlineRe = /^(\s*)it(?:\.each\([^\n]*\))?\(\s*(['"`])(.*)\2\s*,/;
  for (let i = 0; i < lines.length; i += 1) {
    const inline = startInlineRe.exec(lines[i]);
    const bare = startRe.exec(lines[i]);
    if (!inline && !bare) continue;
    const indent = (inline ?? bare)![1];
    let title = inline ? inline[3] : null;
    let j = i;
    const closeExact = `${indent});`;
    const closeBrace = `${indent}});`;
    while (j < lines.length) {
      if (title === null) {
        const titleMatch = /^\s*(['"`])(.*)\1\s*,\s*$/.exec(lines[j]);
        if (titleMatch) title = titleMatch[2];
      }
      const trimmedEnd = lines[j].replace(/\s+$/, '');
      if (j > i && (trimmedEnd === closeExact || trimmedEnd === closeBrace || /^\s*\},\s*[\d_]+\s*\);\s*$/.test(lines[j]))) {
        break;
      }
      j += 1;
    }
    if (title === null) continue; // 未见得的标题：多半是本扫描器体例假设失效，交给下方全局候选核对兜底
    blocks.push({ file, title, startLine: i + 1, text: lines.slice(i, j + 1).join('\n') });
    i = j;
  }
  return blocks;
}

export function hasHeavyMarker(block: ItBlock): boolean {
  return HEAVY_MARKER.test(block.text);
}

export function hasExplicitTimeout(block: ItBlock): boolean {
  // 两种体例：多行三参数（末尾独立一行 `60_000,`）与单行合并（`}, 60_000);`）。
  if (/\},\s*[\d_]+\s*\)\s*;?\s*$/.test(block.text.trimEnd())) return true;
  const nonEmpty = block.text.split('\n').filter((l) => l.trim().length > 0);
  const last = nonEmpty[nonEmpty.length - 1] ?? '';
  const secondLast = nonEmpty[nonEmpty.length - 2] ?? '';
  if (/^\s*\);\s*$/.test(last) && /^\s*[\d_]+,?\s*$/.test(secondLast)) return true;
  return false;
}

/** 结构匹配但本票逐条核定为「无需处置」的成员——每条必须带理由，新增须同批登记。 */
const EXEMPT_WITHOUT_TIMEOUT: ReadonlySet<string> = new Set([
  // sidecar.test.ts 全文件豁免（见文件顶注释），不在此逐条登记。
]);

function isExempt(block: ItBlock): boolean {
  if (path.basename(block.file) === 'sidecar.test.ts') return true;
  return EXEMPT_WITHOUT_TIMEOUT.has(`${path.basename(block.file)}::${block.title}`);
}

/** 本文件自身含用于自证的合成 `it(...)` 字面量字符串，扫描真实候选时须排除自身，
 * 否则那些字面量会被同一扫描器误当成真实候选（自我污染）。 */
const GUARD_FILE_BASENAME = 'timeout-family-guard.test.ts';

function scanRealFiles(): ItBlock[] {
  const files = readdirSync(SRC_DIR)
    .filter((name) => name.endsWith('.test.ts') && name !== GUARD_FILE_BASENAME)
    .map((name) => path.join(SRC_DIR, name));
  const blocks: ItBlock[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    blocks.push(...extractItBlocks(file, source));
  }
  return blocks;
}

/** 第二族（heavy fixture 变量引用）扫描：逐 `describe` 找出 `findHeavyFixtureVarNames`
 * 命中的 fixture 变量名，取其内**引用了该变量**的 `it()`（见判据本体核定：粒度收在变量名
 * 引用而非整个 describe）作为候选。 */
function scanHeavyFixtureScopedItBlocks(): ItBlock[] {
  const files = readdirSync(SRC_DIR)
    .filter((name) => name.endsWith('.test.ts') && name !== GUARD_FILE_BASENAME)
    .map((name) => path.join(SRC_DIR, name));
  const blocks: ItBlock[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const describes = extractDescribeBlocks(file, source);
    for (const d of describes) {
      const heavyVars = findHeavyFixtureVarNames(d.text);
      if (heavyVars.size === 0) continue;
      for (const b of extractItBlocks(file, d.text)) {
        // 只收「it() 体内以独立标识符引用了某个 heavy fixture 变量」的成员——不是整个
        // describe 一刀切（见上方判据本体核定）。
        const referencesHeavyVar = [...heavyVars].some((v) => new RegExp(`\\b${v}\\b`).test(b.text));
        if (!referencesHeavyVar) continue;
        blocks.push({ ...b, startLine: d.startLine + b.startLine - 1 });
      }
    }
  }
  return blocks;
}

describe('检测器自证（born-red 能力，先证门本身能红）', () => {
  it('合成候选：MAX_ 驱动的 repeat 且无显式 timeout → 判红', () => {
    const synthetic: ItBlock = {
      file: 'synthetic.test.ts',
      title: '合成:新族成员',
      startLine: 1,
      text: [
        "  it('合成:新族成员', () => {",
        "    const big = 'a'.repeat(MAX_SYNTHETIC_BYTES);",
        '    expect(big.length).toBeGreaterThan(0);',
        '  });',
      ].join('\n'),
    };
    expect(hasHeavyMarker(synthetic)).toBe(true);
    expect(hasExplicitTimeout(synthetic)).toBe(false);
  });

  it('合成候选：同一族成员一旦带显式 timeout（多行三参数体例）→ 判定已达标', () => {
    const synthetic: ItBlock = {
      file: 'synthetic.test.ts',
      title: '合成:已处置',
      startLine: 1,
      text: [
        '  it(',
        "    '合成:已处置',",
        '    () => {',
        "      const big = 'a'.repeat(MAX_SYNTHETIC_BYTES);",
        '      expect(big.length).toBeGreaterThan(0);',
        '    },',
        '    60_000,',
        '  );',
      ].join('\n'),
    };
    expect(hasHeavyMarker(synthetic)).toBe(true);
    expect(hasExplicitTimeout(synthetic)).toBe(true);
  });

  it('合成候选：同一族成员带显式 timeout（单行合并体例 `}, N);`）→ 判定已达标', () => {
    const synthetic: ItBlock = {
      file: 'synthetic.test.ts',
      title: '合成:已处置-单行',
      startLine: 1,
      text: [
        "  it('合成:已处置-单行', () => {",
        "    const big = 'a'.repeat(MAX_SYNTHETIC_BYTES);",
        '    expect(big.length).toBeGreaterThan(0);',
        '  }, 60_000);',
      ].join('\n'),
    };
    expect(hasHeavyMarker(synthetic)).toBe(true);
    expect(hasExplicitTimeout(synthetic)).toBe(true);
  });

  it('合成候选：零 MAX_ 标记的普通用例不算候选，即便没有 timeout', () => {
    const synthetic: ItBlock = {
      file: 'synthetic.test.ts',
      title: '合成:普通用例',
      startLine: 1,
      text: ["  it('合成:普通用例', () => {", "    expect(1 + 1).toBe(2);", '  });'].join('\n'),
    };
    expect(hasHeavyMarker(synthetic)).toBe(false);
  });

  it('提取器：真实文件里已处置的 raw cap 用例（多行三参数体例）确被识别为候选且判定已达标', () => {
    const source = readFileSync(path.join(SRC_DIR, 'product-protocol.test.ts'), 'utf8');
    const blocks = extractItBlocks('product-protocol.test.ts', source);
    const target = blocks.find((b) => b.title === 'raw cap 内的最坏编码膨胀仍在 framing 内：C0 / 引号 / 反斜杠 / 多字节');
    expect(target).toBeDefined();
    expect(hasHeavyMarker(target!)).toBe(true);
    expect(hasExplicitTimeout(target!)).toBe(true);
  });
});

function allHeavyCandidates(): ItBlock[] {
  const inline = scanRealFiles().filter(hasHeavyMarker);
  const fixtureScoped = scanHeavyFixtureScopedItBlocks();
  // 去重：同一 (file,title) 可能被两条扫描面同时命中（如某 it 自身既内联 MAX_* 又住在
  // heavy-fixture describe 里），只保留一份，按 file+title 归并。
  const seen = new Set<string>();
  const merged: ItBlock[] = [];
  for (const b of [...inline, ...fixtureScoped]) {
    const key = `${path.basename(b.file)}::${b.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(b);
  }
  return merged;
}

describe('本包 it() 全量候选普查', () => {
  it('候选族成员必须有显式 timeout：结构匹配但未登记 exempt 且无 timeout 的一律判红', () => {
    const heavy = allHeavyCandidates();
    expect(heavy.length).toBeGreaterThan(0); // 反哨兵：扫描器若失效（提取不到块），下面的空集断言会假绿

    const violations = heavy.filter((b) => !isExempt(b) && !hasExplicitTimeout(b));
    if (violations.length > 0) {
      const detail = violations.map((b) => `${path.basename(b.file)}:${b.startLine} 「${b.title}」`).join('\n');
      throw new Error(
        `发现 ${violations.length} 枚候选族成员缺显式 timeout（无显式 timeout 且判据本体为 MAX_* 量级重计算/真实磁盘 I/O 构造）：\n${detail}\n` +
          '处置：按 PI-SCAN-TIMEOUT-1/2 与 PI-TIMEOUT-SWEEP-1 范式加显式超时上界；若判定确实不需要，' +
          '须先在本文件 EXEMPT_WITHOUT_TIMEOUT 登记 `<basename>::<title>` 并写明理由，不得让门静默放行。',
      );
    }
  });

  it('EXEMPT_WITHOUT_TIMEOUT 零陈旧登记：表内每条必须仍能在扫描结果里找到对应候选', () => {
    const heavyKeys = new Set(allHeavyCandidates().map((b) => `${path.basename(b.file)}::${b.title}`));
    const stale = [...EXEMPT_WITHOUT_TIMEOUT].filter((key) => !heavyKeys.has(key));
    expect(stale, `陈旧登记（候选已不存在或已改名，应清理）：${stale.join('；')}`).toEqual([]);
  });

  it('第二族扫描面（heavy fixture describe 作用域）确能覆盖 tools.test.ts 的 scan/hits fixture 族', () => {
    const fixtureScoped = scanHeavyFixtureScopedItBlocks();
    const titles = new Set(fixtureScoped.filter((b) => path.basename(b.file) === 'tools.test.ts').map((b) => b.title));
    expect(titles.has('grep 满 2000 份扫描：只置 truncated，命中上限未触发')).toBe(true);
    expect(titles.has('glob 满 2000 份扫描：只置 truncated，命中上限未触发')).toBe(true);
    expect(titles.has('grep 满 200 条命中：置 matchesTruncated 并具名，扫描上限未触发')).toBe(true);
    expect(titles.has('glob 满 200 条命中：置 matchesTruncated 并具名，扫描上限未触发')).toBe(true);
  });
});
