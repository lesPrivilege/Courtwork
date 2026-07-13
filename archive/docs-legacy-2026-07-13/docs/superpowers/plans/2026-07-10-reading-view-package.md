# packages/reading-view (W3.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/reading-view`，把 docx/md/txt/含文本层 PDF 转成 md 阅读视图 + 段落级 `SourceAnchor` 映射，扫描件/无文本层显式判 `needs_ocr`，复杂/可疑文件显式判 `disabled`，永不吐半坏的 md、永不 throw。

**Architecture:** 顶层 `convertToReadingView(input, options)` 按扩展名分发到四个格式专属转换器（txt 纯分块、md 用 remark/remark-gfm 拿精确字符偏移、docx 手写复用 output 的 fflate+xmldom 技术路线、pdf 用 pdfjs-dist 逐页取文本层）。安全基线（zip 解压比例、XXE、宏、大小、超时）是独立的 `security/` 模块，docx 路径在解压前先做零成本的 zip 中央目录探测。`textLayerVersion` 由转换器版本号+文本层内容哈希组成，docx/pdf 必填，md/txt 因直接指向原始字节而可不填。

**Tech Stack:** TypeScript（复用根 tsconfig 严格模式）、fflate（zip）、@xmldom/xmldom（XML）、pdfjs-dist（`legacy/build/pdf.mjs`，Node 专用入口）、unified + remark-parse + remark-gfm（md 块级 AST + 精确偏移）、vitest（测试，含 `it.each` 与内置快照）、`@courtwork/schemas`（`SourceAnchor`/`IngestStatus`）、`@courtwork/demo-data`（仅测试引入，golden 语料来源）。

**关键 API 已预先验证**（本计划里的每处调用都已用 tsx 探测脚本实测通过，不是猜测）：
- `pdfjs-dist` 在 Node 下必须从 `'pdfjs-dist/legacy/build/pdf.mjs'` 导入（裸 `pdfjs-dist` 在 Node 下会报 `DOMMatrix is not defined`）；`getDocument({data, useWorkerFetch:false, isEvalSupported:false, verbosity: VerbosityLevel.ERRORS})` 消除多余的字体警告日志。
- `unified().use(remarkParse).use(remarkGfm).parse(source)` 的每个顶层块节点都带 `position.start.offset`/`position.end.offset`，精确到字符，`source.slice(start,end)` 能拿回原文子串（含多行表格）。需要显式加 `@types/mdast` devDependency，否则 `tsc` 的 declaration-emit 会报"推断类型无法被命名"。
- `@xmldom/xmldom` 的 `new DOMParser({ onError: onErrorStopParsing })` 会在标签不匹配/属性重复/未闭合等情况下同步抛 `ParseError`；但**裸 `<!DOCTYPE>`（不含 ENTITY）默认不会被拒绝**——必须自己做字符串级探测，不能只信任 xmldom 的默认行为。
- 手写的 ZIP 中央目录读取器（只读 EOCD + 中央目录头，不调用 `unzipSync`）能正确拿到每个 entry 的声明压缩/未压缩大小；5MB 全零内容在 deflate level 9 下压到 5377 字节，真实压缩比 975:1，足够触发默认 100:1 上限的测试。

---

## Task 1: 包骨架收尾与提交

**Files:**
- Modify: `packages/reading-view/package.json`（已在设计验证阶段创建，本任务核对内容并提交）
- Modify: `packages/reading-view/tsconfig.json`（已创建，核对）
- Modify: `packages/reading-view/src/index.ts`（当前是占位 `export {};`，本任务保持占位，Task 18 再补真实导出）

- [ ] **Step 1: 核对 package.json 内容**

确认 `/Users/lesprivilege/Projects/Courtwork/packages/reading-view/package.json` 内容如下（如与此不同，改成此内容）：

```json
{
  "name": "@courtwork/reading-view",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@courtwork/schemas": "workspace:*",
    "@xmldom/xmldom": "^0.9.10",
    "fflate": "^0.8.3",
    "pdfjs-dist": "^5.4.296",
    "remark-gfm": "^4.0.0",
    "remark-parse": "^11.0.0",
    "unified": "^11.0.5",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@courtwork/demo-data": "workspace:*",
    "@types/mdast": "^4.0.4",
    "@types/node": "^26.1.1"
  }
}
```

- [ ] **Step 2: 核对 tsconfig.json 内容**

确认内容如下：

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 确认依赖已安装**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm install`
Expected: `Already up to date` 或成功安装，无 error（peer dependency 警告是 `eval/` 既有问题，与本包无关，忽略）。

- [ ] **Step 4: 提交包骨架**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/package.json packages/reading-view/tsconfig.json packages/reading-view/src/index.ts pnpm-lock.yaml
git commit -m "chore(reading-view): 包骨架 + 依赖声明"
```

---

## Task 2: 核心类型 types.ts

**Files:**
- Create: `packages/reading-view/src/types.ts`
- Test: `packages/reading-view/src/types.test.ts`

- [ ] **Step 1: 写失败测试（先验证类型可构造、可判别）**

```typescript
// packages/reading-view/src/types.test.ts
import { describe, expect, it } from 'vitest';
import type { ReadingViewOutcome, DisabledReason } from './types.js';

describe('ReadingViewOutcome 判别联合', () => {
  it('ok 分支携带 view 与可选 pageCount', () => {
    const outcome: ReadingViewOutcome = {
      status: 'ok',
      fileId: 'f1',
      fileName: 'a.md',
      view: { fileId: 'f1', markdown: 'hello', paragraphs: [] },
      pageCount: 3,
    };
    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') {
      expect(outcome.view.markdown).toBe('hello');
    }
  });

  it('needs_ocr 分支不携带 view', () => {
    const outcome: ReadingViewOutcome = { status: 'needs_ocr', fileId: 'f2', fileName: 'a.pdf' };
    expect(outcome.status).toBe('needs_ocr');
  });

  it('disabled 分支必须携带 reason', () => {
    const reason: DisabledReason = 'zip_bomb_suspected';
    const outcome: ReadingViewOutcome = { status: 'disabled', fileId: 'f3', fileName: 'a.docx', reason };
    expect(outcome.status).toBe('disabled');
    if (outcome.status === 'disabled') {
      expect(outcome.reason).toBe('zip_bomb_suspected');
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view`
Expected: FAIL，报 `Cannot find module './types.js'`（`types.ts` 还不存在）。

- [ ] **Step 3: 实现 types.ts**

```typescript
// packages/reading-view/src/types.ts
import type { SourceAnchor } from '@courtwork/schemas';

export interface ReadingViewParagraph {
  index: number;
  /** 渲染给模型/UI 的 md 片段，可能含 #、**、| 等 md 语法装饰。 */
  markdown: string;
  /** 指向原件（fileId + page?/bbox?/textRange?/quote?），quote 是原件真实子串，不是 markdown 字段的子串。 */
  anchor: SourceAnchor;
}

export interface ReadingView {
  fileId: string;
  /** 全文拼接，模型阅读的"母语"。 */
  markdown: string;
  paragraphs: ReadingViewParagraph[];
}

export type DisabledReason =
  | 'unsupported_format'
  | 'file_too_large'
  | 'zip_bomb_suspected'
  | 'malicious_content'
  | 'corrupt_file'
  | 'fidelity_insufficient';

export type ReadingViewOutcome =
  | { status: 'ok'; fileId: string; fileName: string; view: ReadingView; pageCount?: number }
  | { status: 'needs_ocr'; fileId: string; fileName: string; detail?: string }
  | { status: 'disabled'; fileId: string; fileName: string; reason: DisabledReason; detail?: string };

export type SupportedFormat = 'docx' | 'md' | 'txt' | 'pdf' | 'jpg' | 'png';

export interface ConvertInput {
  fileId: string;
  fileName: string;
  /** 原始字节，不接受文件路径——保持包纯净、不假设 Node fs 可用。 */
  data: Uint8Array;
  /** 缺省时从 fileName 后缀推断；显式提供时完全信任调用方，不再看扩展名（.docm 拦截只在推断路径生效）。 */
  format?: SupportedFormat;
}

export interface ConvertOptions {
  maxFileSizeBytes?: number;
  maxDecompressionRatio?: number;
  maxUncompressedBytes?: number;
  timeoutMs?: number;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view`
Expected: PASS，3 例全绿。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/types.ts packages/reading-view/src/types.test.ts
git commit -m "feat(reading-view): 核心类型 ReadingView/ReadingViewOutcome"
```

---

## Task 3: 安全基线 — limits.ts

**Files:**
- Create: `packages/reading-view/src/security/limits.ts`
- Test: `packages/reading-view/src/security/limits.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/security/limits.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, resolveLimits } from './limits.js';

describe('resolveLimits', () => {
  it('无 options 时返回默认值', () => {
    expect(resolveLimits()).toEqual(DEFAULT_LIMITS);
  });

  it('部分覆盖时其余字段仍取默认值', () => {
    const resolved = resolveLimits({ maxFileSizeBytes: 1024 });
    expect(resolved.maxFileSizeBytes).toBe(1024);
    expect(resolved.timeoutMs).toBe(DEFAULT_LIMITS.timeoutMs);
    expect(resolved.maxDecompressionRatio).toBe(DEFAULT_LIMITS.maxDecompressionRatio);
    expect(resolved.maxUncompressedBytes).toBe(DEFAULT_LIMITS.maxUncompressedBytes);
  });

  it('全部覆盖时全部生效', () => {
    const resolved = resolveLimits({
      maxFileSizeBytes: 1,
      maxDecompressionRatio: 2,
      maxUncompressedBytes: 3,
      timeoutMs: 4,
    });
    expect(resolved).toEqual({ maxFileSizeBytes: 1, maxDecompressionRatio: 2, maxUncompressedBytes: 3, timeoutMs: 4 });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/security`
Expected: FAIL，`Cannot find module './limits.js'`。

- [ ] **Step 3: 实现 limits.ts**

```typescript
// packages/reading-view/src/security/limits.ts
import type { ConvertOptions } from '../types.js';

export interface ResolvedLimits {
  maxFileSizeBytes: number;
  maxDecompressionRatio: number;
  maxUncompressedBytes: number;
  timeoutMs: number;
}

export const DEFAULT_LIMITS: ResolvedLimits = {
  maxFileSizeBytes: 50 * 1024 * 1024,
  maxDecompressionRatio: 100,
  maxUncompressedBytes: 200 * 1024 * 1024,
  timeoutMs: 30_000,
};

export function resolveLimits(options?: ConvertOptions): ResolvedLimits {
  return {
    maxFileSizeBytes: options?.maxFileSizeBytes ?? DEFAULT_LIMITS.maxFileSizeBytes,
    maxDecompressionRatio: options?.maxDecompressionRatio ?? DEFAULT_LIMITS.maxDecompressionRatio,
    maxUncompressedBytes: options?.maxUncompressedBytes ?? DEFAULT_LIMITS.maxUncompressedBytes,
    timeoutMs: options?.timeoutMs ?? DEFAULT_LIMITS.timeoutMs,
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/security`
Expected: PASS，3 例。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/security/limits.ts packages/reading-view/src/security/limits.test.ts
git commit -m "feat(reading-view): 安全基线可配置上限 limits.ts"
```

---

## Task 4: 安全基线 — zip-guard.ts（中央目录读取 + 解压比例上限）

**Files:**
- Create: `packages/reading-view/src/security/zip-guard.ts`
- Test: `packages/reading-view/src/security/zip-guard.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/security/zip-guard.test.ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/security/zip-guard`
Expected: FAIL，`Cannot find module './zip-guard.js'`。

- [ ] **Step 3: 实现 zip-guard.ts**

```typescript
// packages/reading-view/src/security/zip-guard.ts
/**
 * 只读 ZIP 的 EOCD（结束目录记录）与中央目录头，拿到每个 entry 声明的压缩/未压缩大小——
 * 不调用 unzipSync，不触发任何实际解压。这是"解压比例检测必须在解压前完成"这条安全
 * 纪律的字面落点：可疑 zip 在这一步就会被挡下，永远不会进入 fflate 的实际 inflate 路径。
 */

export class ZipInspectionError extends Error {}

export interface ZipCentralDirectoryEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_LENGTH = 65535;
const ZIP64_SENTINEL_32 = 0xffffffff;
const ZIP64_SENTINEL_16 = 0xffff;

export function readZipCentralDirectory(data: Uint8Array): ZipCentralDirectoryEntry[] {
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);

  let eocdOffset = -1;
  const searchStart = Math.max(0, buf.length - EOCD_MIN_SIZE - MAX_COMMENT_LENGTH);
  for (let i = buf.length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new ZipInspectionError('未找到 ZIP 结束目录记录（EOCD），不是合法 zip 文件');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buf.readUInt32LE(eocdOffset + 16);
  if (centralDirectoryOffset === ZIP64_SENTINEL_32 || totalEntries === ZIP64_SENTINEL_16) {
    throw new ZipInspectionError('检测到 ZIP64 格式哨兵值，本包不支持（普通 docx 不会用到 ZIP64，视为可疑文件）');
  }

  const entries: ZipCentralDirectoryEntry[] = [];
  let pointer = centralDirectoryOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (pointer + 46 > buf.length || buf.readUInt32LE(pointer) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new ZipInspectionError(`中央目录第 ${i} 条记录签名不合法（偏移量 ${pointer}）`);
    }
    const compressedSize = buf.readUInt32LE(pointer + 20);
    const uncompressedSize = buf.readUInt32LE(pointer + 24);
    const nameLength = buf.readUInt16LE(pointer + 28);
    const extraLength = buf.readUInt16LE(pointer + 30);
    const commentLength = buf.readUInt16LE(pointer + 32);
    if (compressedSize === ZIP64_SENTINEL_32 || uncompressedSize === ZIP64_SENTINEL_32) {
      throw new ZipInspectionError('检测到 ZIP64 大小字段哨兵值，本包不支持');
    }
    const name = buf.toString('utf-8', pointer + 46, pointer + 46 + nameLength);
    entries.push({ name, compressedSize, uncompressedSize });
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export interface ZipBombCheckResult {
  suspicious: boolean;
  detail?: string;
}

export function checkZipBomb(
  entries: ZipCentralDirectoryEntry[],
  limits: { maxDecompressionRatio: number; maxUncompressedBytes: number },
): ZipBombCheckResult {
  let totalUncompressed = 0;
  for (const entry of entries) {
    totalUncompressed += entry.uncompressedSize;
    const ratio = entry.compressedSize === 0 ? entry.uncompressedSize : entry.uncompressedSize / entry.compressedSize;
    if (ratio > limits.maxDecompressionRatio) {
      return {
        suspicious: true,
        detail: `entry ${entry.name} 解压比例 ${ratio.toFixed(1)}:1 超过上限 ${limits.maxDecompressionRatio}:1`,
      };
    }
  }
  if (totalUncompressed > limits.maxUncompressedBytes) {
    return {
      suspicious: true,
      detail: `总解压体积 ${totalUncompressed} 字节超过上限 ${limits.maxUncompressedBytes} 字节`,
    };
  }
  return { suspicious: false };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/security/zip-guard`
Expected: PASS，7 例。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/security/zip-guard.ts packages/reading-view/src/security/zip-guard.test.ts
git commit -m "feat(reading-view): zip 中央目录读取 + 解压比例上限防护"
```

---

## Task 5: 安全基线 — xml-guard.ts（禁 XXE + 严格解析）

**Files:**
- Create: `packages/reading-view/src/security/xml-guard.ts`
- Test: `packages/reading-view/src/security/xml-guard.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/security/xml-guard.test.ts
import { describe, expect, it } from 'vitest';
import { assertNoDangerousMarkup, parseXmlStrict, XmlSecurityError, XmlParseError } from './xml-guard.js';

describe('assertNoDangerousMarkup', () => {
  it('普通 XML 不抛错', () => {
    expect(() => assertNoDangerousMarkup('<root><a>1</a></root>')).not.toThrow();
  });

  it('含 DOCTYPE 声明时抛 XmlSecurityError', () => {
    expect(() => assertNoDangerousMarkup('<!DOCTYPE foo><root/>')).toThrow(XmlSecurityError);
  });

  it('含 ENTITY 声明时抛 XmlSecurityError', () => {
    const xxe = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>';
    expect(() => assertNoDangerousMarkup(xxe)).toThrow(XmlSecurityError);
  });
});

describe('parseXmlStrict', () => {
  it('合法 XML 正常解析', () => {
    const doc = parseXmlStrict('<root><a>1</a></root>');
    expect(doc.documentElement?.nodeName).toBe('root');
  });

  it('标签不匹配时抛 XmlParseError（不是静默返回半解析结果）', () => {
    expect(() => parseXmlStrict('<root><a>1</b></root>')).toThrow(XmlParseError);
  });

  it('截断的 XML 抛 XmlParseError', () => {
    expect(() => parseXmlStrict('<root><a>1</a>')).toThrow(XmlParseError);
  });

  it('重复属性抛 XmlParseError', () => {
    expect(() => parseXmlStrict('<root a="1" a="2">x</root>')).toThrow(XmlParseError);
  });

  it('含 DOCTYPE 时在字符串级检测阶段就抛 XmlSecurityError（不会走到底层解析器）', () => {
    expect(() => parseXmlStrict('<!DOCTYPE foo><root>x</root>')).toThrow(XmlSecurityError);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/security/xml-guard`
Expected: FAIL，`Cannot find module './xml-guard.js'`。

- [ ] **Step 3: 实现 xml-guard.ts**

```typescript
// packages/reading-view/src/security/xml-guard.ts
import { DOMParser, onErrorStopParsing } from '@xmldom/xmldom';
import type { Document } from '@xmldom/xmldom';

export class XmlSecurityError extends Error {}
export class XmlParseError extends Error {}

/**
 * 真实的 Word/WPS 导出的 document.xml/styles.xml 等部件永远不会含 DOCTYPE/ENTITY 声明。
 * 字符串级探测是双保险——不单纯信任 @xmldom/xmldom 的默认解析行为（实测其默认配置下
 * 裸 DOCTYPE 不会被当作错误拒绝，必须自己挡）。
 */
const DANGEROUS_MARKUP_PATTERN = /<!DOCTYPE|<!ENTITY/i;

export function assertNoDangerousMarkup(xmlText: string): void {
  if (DANGEROUS_MARKUP_PATTERN.test(xmlText)) {
    throw new XmlSecurityError('XML 内容包含 DOCTYPE/ENTITY 声明，拒绝解析（XXE 防护）');
  }
}

/**
 * onError: onErrorStopParsing 让 error/fatalError 级别的问题同步抛出 ParseError，
 * 而不是像默认配置那样只把 fatalError 抛出、error 只打日志继续解析——
 * 本包需要"任何解析异常都不产出半解析结果"的严格保证。
 */
export function parseXmlStrict(xmlText: string): Document {
  assertNoDangerousMarkup(xmlText);
  try {
    return new DOMParser({ onError: onErrorStopParsing }).parseFromString(xmlText, 'text/xml');
  } catch (err) {
    throw new XmlParseError(`XML 解析失败：${err instanceof Error ? err.message : String(err)}`);
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/security/xml-guard`
Expected: PASS，8 例。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/security/xml-guard.ts packages/reading-view/src/security/xml-guard.test.ts
git commit -m "feat(reading-view): XXE 防护 + 严格 XML 解析包装"
```

---

## Task 6: 共享工具 text-layer-version.ts

**Files:**
- Create: `packages/reading-view/src/text-layer-version.ts`
- Test: `packages/reading-view/src/text-layer-version.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/text-layer-version.test.ts
import { describe, expect, it } from 'vitest';
import { computeTextLayerVersion } from './text-layer-version.js';

describe('computeTextLayerVersion', () => {
  it('相同命名空间与文本产出相同结果（确定性）', () => {
    const a = computeTextLayerVersion('reading-view-docx@1', '正文内容');
    const b = computeTextLayerVersion('reading-view-docx@1', '正文内容');
    expect(a).toBe(b);
  });

  it('文本不同则结果不同（内容哈希起效）', () => {
    const a = computeTextLayerVersion('reading-view-docx@1', '正文内容一');
    const b = computeTextLayerVersion('reading-view-docx@1', '正文内容二');
    expect(a).not.toBe(b);
  });

  it('命名空间不同则结果不同（转换器版本号起效）', () => {
    const a = computeTextLayerVersion('reading-view-docx@1', '正文内容');
    const b = computeTextLayerVersion('reading-view-docx@2', '正文内容');
    expect(a).not.toBe(b);
  });

  it('结果以命名空间为前缀，人肉可读', () => {
    const version = computeTextLayerVersion('reading-view-pdf@1+pdfjs5.4.296', '正文');
    expect(version.startsWith('reading-view-pdf@1+pdfjs5.4.296+')).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/text-layer-version`
Expected: FAIL，`Cannot find module './text-layer-version.js'`。

- [ ] **Step 3: 实现 text-layer-version.ts**

```typescript
// packages/reading-view/src/text-layer-version.ts
import { createHash } from 'node:crypto';

/**
 * SourceAnchor.textLayerVersion = 转换器语义版本 + 该文本层内容的短哈希。docx/PDF 的
 * textRange 相对的是本包派生出的线性化文本层，转换器版本一变或库升级一次，偏移量就
 * 可能整体漂移——这个字段就是用来标记"这段偏移量是相对哪一版文本层算的"。
 * 短哈希（sha256 前 16 位十六进制）只用于漂移检测，不是安全用途，碰撞风险可接受。
 */
export function computeTextLayerVersion(namespace: string, text: string): string {
  const hash = createHash('sha256').update(text, 'utf-8').digest('hex').slice(0, 16);
  return `${namespace}+${hash}`;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/text-layer-version`
Expected: PASS，4 例。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/text-layer-version.ts packages/reading-view/src/text-layer-version.test.ts
git commit -m "feat(reading-view): textLayerVersion 计算工具"
```

---

## Task 7: txt 转换器

**Files:**
- Create: `packages/reading-view/src/text/text-to-reading-view.ts`
- Test: `packages/reading-view/src/text/text-to-reading-view.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/text/text-to-reading-view.test.ts
import { describe, expect, it } from 'vitest';
import {
  splitBlankLineBlocks,
  escapeBlockLeadingMarker,
  convertTextToReadingView,
} from './text-to-reading-view.js';

describe('splitBlankLineBlocks', () => {
  it('单段落文本返回一个块，偏移量能精确 slice 回原文', () => {
    const text = '只有一段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(text.slice(blocks[0]!.start, blocks[0]!.end)).toBe(blocks[0]!.text);
  });

  it('LF 空行分隔的多段落，每块偏移量都能精确 slice 回原文', () => {
    const text = '第一段。\n\n第二段第一行。\n第二段第二行。\n\n第三段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。', '第二段第一行。\n第二段第二行。', '第三段。']);
    for (const block of blocks) {
      expect(text.slice(block.start, block.end)).toBe(block.text);
    }
  });

  it('CRLF 空行分隔同样正确切分（解析必须吃原始字节，不能先归一化换行符）', () => {
    const text = '第一段。\r\n\r\n第二段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。', '第二段。']);
    for (const block of blocks) {
      expect(text.slice(block.start, block.end)).toBe(block.text);
    }
  });

  it('多个连续空行（含仅含空格的"空行"）视为一个分隔符', () => {
    const text = '第一段。\n   \n\n\n第二段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。', '第二段。']);
  });

  it('首尾空白不产生空块', () => {
    const text = '\n\n第一段。\n\n';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。']);
  });

  it('全空白文本返回空数组', () => {
    expect(splitBlankLineBlocks('   \n\n  ')).toEqual([]);
  });
});

describe('escapeBlockLeadingMarker', () => {
  it('井号开头转义为标题标记', () => {
    expect(escapeBlockLeadingMarker('# 不是标题')).toBe('\\# 不是标题');
  });

  it('数字加点开头转义为有序列表标记', () => {
    expect(escapeBlockLeadingMarker('1. 不是列表')).toBe('1\\. 不是列表');
  });

  it('连字符加空格开头转义为无序列表标记', () => {
    expect(escapeBlockLeadingMarker('- 不是列表')).toBe('\\- 不是列表');
  });

  it('普通文本不受影响', () => {
    expect(escapeBlockLeadingMarker('普通段落文本')).toBe('普通段落文本');
  });

  it('数字后面不是点号/右括号时不转义（如日期）', () => {
    expect(escapeBlockLeadingMarker('2024年8月17日')).toBe('2024年8月17日');
  });

  it('连字符后紧跟数字（非列表语法）不转义', () => {
    expect(escapeBlockLeadingMarker('-5000元的违约金')).toBe('-5000元的违约金');
  });
});

describe('convertTextToReadingView', () => {
  it('多段落 txt 产出 ok 状态与逐段锚点，md/txt 路径不填 textLayerVersion', async () => {
    const text = '第一段。\n\n第二段。';
    const outcome = await convertTextToReadingView({
      fileId: 'f1',
      fileName: 'a.txt',
      data: new TextEncoder().encode(text),
    });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs).toHaveLength(2);
    expect(outcome.view.paragraphs[0]!.anchor.textLayerVersion).toBeUndefined();
    expect(outcome.view.paragraphs[0]!.anchor.quote).toBe('第一段。');
    expect(outcome.view.paragraphs[0]!.anchor.textRange).toEqual({ start: 0, end: 4 });
  });

  it('非法 UTF-8 字节判定为 disabled/corrupt_file', async () => {
    const outcome = await convertTextToReadingView({
      fileId: 'f2',
      fileName: 'bad.txt',
      data: new Uint8Array([0xff, 0xfe, 0xfd]),
    });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('空文件返回 ok 状态与空段落列表，不是 disabled', async () => {
    const outcome = await convertTextToReadingView({ fileId: 'f3', fileName: 'empty.txt', data: new Uint8Array() });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/text`
Expected: FAIL，`Cannot find module './text-to-reading-view.js'`。

- [ ] **Step 3: 实现 text-to-reading-view.ts**

```typescript
// packages/reading-view/src/text/text-to-reading-view.ts
import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';

export interface TextBlock {
  text: string;
  start: number;
  end: number;
}

/**
 * 以"至少一整行空白"为界切分段落块。用 \r?\n(?:[ \t]*\r?\n)+ 而不是简单的 \n\n，
 * 是为了同时正确处理 LF/CRLF 与"看似空实则含空格/制表符"的空行——原文不做任何
 * 归一化预处理，正则直接吃原始字符串，偏移量因此天然精确对应原文。
 */
const BLANK_LINE_SEPARATOR = /\r?\n(?:[ \t]*\r?\n)+/g;

export function splitBlankLineBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const pushTrimmedBlock = (rawStart: number, rawEnd: number) => {
    const raw = text.slice(rawStart, rawEnd);
    const leading = raw.match(/^\s*/)![0]!.length;
    const trailing = raw.match(/\s*$/)![0]!.length;
    const start = rawStart + leading;
    const end = rawEnd - trailing;
    if (start < end) blocks.push({ text: text.slice(start, end), start, end });
  };

  let cursor = 0;
  let match: RegExpExecArray | null;
  BLANK_LINE_SEPARATOR.lastIndex = 0;
  while ((match = BLANK_LINE_SEPARATOR.exec(text))) {
    pushTrimmedBlock(cursor, match.index);
    cursor = BLANK_LINE_SEPARATOR.lastIndex;
  }
  pushTrimmedBlock(cursor, text.length);
  return blocks;
}

const LEADING_MARKER_PATTERN = /^([ \t]*)((?:[#>*+-])(?=[ \t]|$)|\d+[.)](?=[ \t]|$))/;

/**
 * 只转义每块首行的前导标记，不做穷尽的 CommonMark 转义——纯文本几乎不会在后续行
 * 里重新起一个块级标记，这个已知边界记入 SPEC，不是当期缺口。
 */
export function escapeBlockLeadingMarker(blockText: string): string {
  const match = blockText.match(LEADING_MARKER_PATTERN);
  if (!match) return blockText;
  const [full, leadingSpace, marker] = match as [string, string, string];
  const escaped = marker.length === 1 ? `\\${marker}` : `${marker.slice(0, -1)}\\${marker.slice(-1)}`;
  return leadingSpace + escaped + blockText.slice(full.length);
}

export async function convertTextToReadingView(input: ConvertInput): Promise<ReadingViewOutcome> {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(input.data);
  } catch {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: '不是合法的 UTF-8 文本',
    };
  }

  const blocks = splitBlankLineBlocks(text);
  const paragraphs: ReadingViewParagraph[] = blocks.map((block, index) => ({
    index,
    markdown: escapeBlockLeadingMarker(block.text),
    anchor: {
      fileId: input.fileId,
      textRange: { start: block.start, end: block.end },
      quote: block.text,
    },
  }));

  const view: ReadingView = {
    fileId: input.fileId,
    markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
    paragraphs,
  };
  return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/text`
Expected: PASS，15 例。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/text/
git commit -m "feat(reading-view): txt 转换器（空行分块 + 前导标记转义）"
```

---

## Task 8: md 转换器（remark + remark-gfm）

**Files:**
- Create: `packages/reading-view/src/markdown/markdown-to-reading-view.ts`
- Test: `packages/reading-view/src/markdown/markdown-to-reading-view.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/markdown/markdown-to-reading-view.test.ts
import { describe, expect, it } from 'vitest';
import { convertMarkdownToReadingView } from './markdown-to-reading-view.js';

describe('convertMarkdownToReadingView', () => {
  it('标题/段落/表格各自成块，markdown 字段与原文子串逐字相同', async () => {
    const source = '# 证据清单\n\n案号：(2025)云章03民初472号\n\n| 序号 | 证据名称 |\n|------|----------|\n| 1 | 采购询价函 |\n';
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f1',
      fileName: '03-证据清单.md',
      data: new TextEncoder().encode(source),
    });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    const { paragraphs } = outcome.view;
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]!.markdown).toBe('# 证据清单');
    expect(paragraphs[1]!.markdown).toBe('案号：(2025)云章03民初472号');
    expect(paragraphs[2]!.markdown).toContain('| 序号 | 证据名称 |');
  });

  it('每个段落的 anchor.textRange 精确对应原文子串（textRange 相对原始字节，不是渲染后的 markdown）', async () => {
    const source = '第一段。\n\n第二段。';
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f2',
      fileName: 'a.md',
      data: new TextEncoder().encode(source),
    });
    if (outcome.status !== 'ok') throw new Error('unreachable');
    for (const p of outcome.view.paragraphs) {
      const { start, end } = p.anchor.textRange!;
      expect(source.slice(start, end)).toBe(p.anchor.quote);
    }
  });

  it('md/txt 路径不填 textLayerVersion（原件本身即文本层，无派生漂移风险）', async () => {
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f3',
      fileName: 'a.md',
      data: new TextEncoder().encode('段落。'),
    });
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.anchor.textLayerVersion).toBeUndefined();
  });

  it('非法 UTF-8 字节判定为 disabled/corrupt_file', async () => {
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f4',
      fileName: 'bad.md',
      data: new Uint8Array([0xff, 0xfe, 0xfd]),
    });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/markdown`
Expected: FAIL，`Cannot find module './markdown-to-reading-view.js'`。

- [ ] **Step 3: 实现 markdown-to-reading-view.ts**

```typescript
// packages/reading-view/src/markdown/markdown-to-reading-view.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent } from 'mdast';
import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';

function blockRange(node: RootContent): { start: number; end: number } | null {
  if (!node.position) return null;
  const { start, end } = node.position;
  if (start.offset === undefined || end.offset === undefined) return null;
  return { start: start.offset, end: end.offset };
}

export async function convertMarkdownToReadingView(input: ConvertInput): Promise<ReadingViewOutcome> {
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(input.data);
  } catch {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: '不是合法的 UTF-8 文本',
    };
  }

  let tree: Root;
  try {
    tree = unified().use(remarkParse).use(remarkGfm).parse(source) as Root;
  } catch (err) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const paragraphs: ReadingViewParagraph[] = [];
  let index = 0;
  for (const node of tree.children) {
    const range = blockRange(node);
    if (!range) continue;
    // markdown 字段就是原文子串本身——input 已经是 md，不需要重新序列化，
    // 这样 markdown 与 anchor.quote 永远逐字一致，不存在两者对不上的风险。
    const text = source.slice(range.start, range.end);
    paragraphs.push({
      index: index++,
      markdown: text,
      anchor: { fileId: input.fileId, textRange: range, quote: text },
    });
  }

  const view: ReadingView = {
    fileId: input.fileId,
    markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
    paragraphs,
  };
  return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/markdown`
Expected: PASS，4 例。

- [ ] **Step 5: Typecheck（remark 的类型依赖 @types/mdast，需要单独确认一次）**

Run: `cd /Users/lesprivilege/Projects/Courtwork/packages/reading-view && npx tsc --noEmit -p tsconfig.json`
Expected: 无输出（无 error）。

- [ ] **Step 6: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/markdown/
git commit -m "feat(reading-view): md 转换器（remark+remark-gfm 精确块级偏移）"
```

---

## Task 9: 测试 fixture 构造器 — build-docx-fixture.ts

**Files:**
- Create: `packages/reading-view/src/test-fixtures/build-docx-fixture.ts`

不含独立测试文件——本构造器的正确性由 Task 10/11/16 里"用它构造 fixture 喂给真实转换器、断言转换结果符合预期"的测试间接但确定地验证（若构造器本身有 bug，后续任务的测试会失败，能立刻定位）。

- [ ] **Step 1: 实现 build-docx-fixture.ts**

```typescript
// packages/reading-view/src/test-fixtures/build-docx-fixture.ts
/**
 * 测试专用：手工拼装最小 docx（合法 zip + 最小 OOXML 部件），不依赖任何 docx 写入库。
 * 与 packages/output 的"手写 OOXML"技术路线保持同一哲学，且刻意保持最小——
 * 只包含本包转换器实际会读的部件。
 */
import { zipSync, strToU8 } from 'fflate';

export const DOCX_WORD_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export interface FixtureParagraph {
  text: string;
  bold?: boolean;
}
export interface FixtureTable {
  rows: string[][];
  /** true 时给第一行第一个单元格加 gridSpan，模拟合并单元格。 */
  merged?: boolean;
}
export type FixtureBlock = { type: 'paragraph'; paragraph: FixtureParagraph } | { type: 'table'; table: FixtureTable };

export interface BuildDocxOptions {
  blocks: FixtureBlock[];
  contentTypesOverride?: string;
  includeVbaProject?: boolean;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderParagraphXml(p: FixtureParagraph): string {
  const rPr = p.bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(p.text)}</w:t></w:r></w:p>`;
}

function renderTableXml(t: FixtureTable): string {
  const rows = t.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cellText, cellIndex) => {
          const tcPr = t.merged && rowIndex === 0 && cellIndex === 0 ? '<w:tcPr><w:gridSpan w:val="2"/></w:tcPr>' : '';
          return `<w:tc>${tcPr}<w:p><w:r><w:t xml:space="preserve">${escapeXml(cellText)}</w:t></w:r></w:p></w:tc>`;
        })
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');
  return `<w:tbl>${rows}</w:tbl>`;
}

const DEFAULT_CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';

export function buildDocxFixture(options: BuildDocxOptions): Uint8Array {
  const bodyXml = options.blocks
    .map((b) => (b.type === 'paragraph' ? renderParagraphXml(b.paragraph) : renderTableXml(b.table)))
    .join('');
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${DOCX_WORD_NAMESPACE}">` +
    `<w:body>${bodyXml}</w:body></w:document>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(options.contentTypesOverride ?? DEFAULT_CONTENT_TYPES),
    'word/document.xml': strToU8(documentXml),
  };
  if (options.includeVbaProject) {
    files['word/vbaProject.bin'] = new Uint8Array([0, 1, 2, 3]);
  }
  return zipSync(files, { level: 6 });
}

/** XXE 探测专用 fixture：document.xml 本身携带 DOCTYPE + ENTITY 声明。 */
export function buildDocxWithDoctype(): Uint8Array {
  const documentXml =
    `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` +
    `<w:document xmlns:w="${DOCX_WORD_NAMESPACE}"><w:body><w:p><w:r><w:t>&xxe;</w:t></w:r></w:p></w:body></w:document>`;
  return zipSync(
    { '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': strToU8(documentXml) },
    { level: 6 },
  );
}

/** 解压比例上限探测专用 fixture：5MB 全零内容在 deflate level 9 下压出 ~975:1 的真实比例。 */
export function buildZipBombFixture(): Uint8Array {
  const huge = new Uint8Array(5 * 1024 * 1024);
  return zipSync(
    { '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': huge },
    { level: 9 },
  );
}

/** 损坏文件探测专用 fixture：不是合法 zip。 */
export function buildCorruptDocx(): Uint8Array {
  return new Uint8Array([0x50, 0x4b, 0x00, 0x00, 1, 2, 3, 4, 5]);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/test-fixtures/build-docx-fixture.ts
git commit -m "test(reading-view): docx 测试 fixture 构造器"
```

---

## Task 10: docx 读取器 — docx-reader.ts

**Files:**
- Create: `packages/reading-view/src/docx/docx-reader.ts`
- Test: `packages/reading-view/src/docx/docx-reader.test.ts`

**职责边界（写代码前务必确认）：** `readDocxBlocks` 只做机械抽取 + 安全类拒绝（zip 炸弹/XXE/宏 → 抛 `DocxReadError`），**不做"是否要降级"的策略判断**——表格是否含合并单元格只负责如实上报 `merged: boolean`，由 Task 11 的 `docx-to-markdown.ts` 决定要不要因此整文件降级。

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/docx/docx-reader.test.ts
import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { readDocxBlocks, DocxReadError } from './docx-reader.js';
import { DEFAULT_LIMITS } from '../security/limits.js';
import {
  buildDocxFixture,
  buildDocxWithDoctype,
  buildZipBombFixture,
  buildCorruptDocx,
} from '../test-fixtures/build-docx-fixture.js';

describe('readDocxBlocks', () => {
  it('按文档序抽取段落，加粗段落标记 heading:true', () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '标题段落', bold: true } },
        { type: 'paragraph', paragraph: { text: '正文段落' } },
      ],
    });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks).toEqual([
      { kind: 'paragraph', text: '标题段落', heading: true },
      { kind: 'paragraph', text: '正文段落', heading: false },
    ]);
  });

  it('表格按行列抽取纯文本，未合并单元格时 merged:false', () => {
    const data = buildDocxFixture({
      blocks: [{ type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']] } }],
    });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks).toEqual([
      { kind: 'table', rows: [['期次', '金额'], ['预付款', '114万']], merged: false },
    ]);
  });

  it('表格含合并单元格时 merged:true（不在这一层降级，只如实上报）', () => {
    const data = buildDocxFixture({
      blocks: [{ type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']], merged: true } }],
    });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks[0]).toMatchObject({ kind: 'table', merged: true });
  });

  it('空段落（无文本内容）被跳过', () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '' } }] });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks).toEqual([]);
  });

  it('含 word/vbaProject.bin 时抛 DocxReadError(malicious_content)', () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }], includeVbaProject: true });
    expect(() => readDocxBlocks(data, DEFAULT_LIMITS)).toThrow(DocxReadError);
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
    } catch (err) {
      expect((err as DocxReadError).reason).toBe('malicious_content');
    }
  });

  it('[Content_Types].xml 声明宏使能类型时抛 DocxReadError(malicious_content)', () => {
    const macroContentTypes =
      '<Types><Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>';
    const data = buildDocxFixture({
      blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }],
      contentTypesOverride: macroContentTypes,
    });
    expect(() => readDocxBlocks(data, DEFAULT_LIMITS)).toThrow(DocxReadError);
  });

  it('document.xml 含 DOCTYPE/ENTITY 时抛 DocxReadError(malicious_content)', () => {
    const data = buildDocxWithDoctype();
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('malicious_content');
    }
  });

  it('解压比例超限时抛 DocxReadError(zip_bomb_suspected)，且在解压前拒绝', () => {
    const data = buildZipBombFixture();
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('zip_bomb_suspected');
    }
  });

  it('不合法的 zip 抛 DocxReadError(corrupt_file)', () => {
    const data = buildCorruptDocx();
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('corrupt_file');
    }
  });

  it('合法 zip 但缺少 word/document.xml 时抛 DocxReadError(corrupt_file)', () => {
    const data = zipSync({ '[Content_Types].xml': strToU8('<Types/>') }, { level: 6 });
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('corrupt_file');
    }
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/docx/docx-reader`
Expected: FAIL，`Cannot find module './docx-reader.js'`。

- [ ] **Step 3: 实现 docx-reader.ts**

```typescript
// packages/reading-view/src/docx/docx-reader.ts
import { unzipSync, strFromU8 } from 'fflate';
import { readZipCentralDirectory, checkZipBomb } from '../security/zip-guard.js';
import { assertNoDangerousMarkup, parseXmlStrict } from '../security/xml-guard.js';
import type { ResolvedLimits } from '../security/limits.js';
import type { DisabledReason } from '../types.js';

export class DocxReadError extends Error {
  constructor(
    public readonly reason: DisabledReason,
    message: string,
  ) {
    super(message);
    this.name = 'DocxReadError';
  }
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export type DocxBlock =
  | { kind: 'paragraph'; text: string; heading: boolean }
  | { kind: 'table'; rows: string[][]; merged: boolean };

export function readDocxBlocks(data: Uint8Array, limits: ResolvedLimits): DocxBlock[] {
  let entries;
  try {
    entries = readZipCentralDirectory(data);
  } catch (err) {
    throw new DocxReadError('corrupt_file', err instanceof Error ? err.message : String(err));
  }

  const bombCheck = checkZipBomb(entries, limits);
  if (bombCheck.suspicious) {
    throw new DocxReadError('zip_bomb_suspected', bombCheck.detail ?? '解压比例超过配置上限');
  }

  if (entries.some((e) => e.name === 'word/vbaProject.bin')) {
    throw new DocxReadError('malicious_content', '检测到 word/vbaProject.bin（宏工程），拒绝解析');
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch (err) {
    throw new DocxReadError('corrupt_file', `zip 解压失败：${err instanceof Error ? err.message : String(err)}`);
  }

  const contentTypesBytes = files['[Content_Types].xml'];
  if (contentTypesBytes && /macroEnabled/i.test(strFromU8(contentTypesBytes))) {
    throw new DocxReadError('malicious_content', '[Content_Types].xml 声明宏使能内容类型，拒绝解析');
  }

  const documentXmlBytes = files['word/document.xml'];
  if (!documentXmlBytes) {
    throw new DocxReadError('corrupt_file', 'docx 缺少 word/document.xml');
  }
  const documentXmlText = strFromU8(documentXmlBytes);

  try {
    assertNoDangerousMarkup(documentXmlText);
  } catch (err) {
    throw new DocxReadError('malicious_content', err instanceof Error ? err.message : String(err));
  }

  let doc;
  try {
    doc = parseXmlStrict(documentXmlText);
  } catch (err) {
    throw new DocxReadError('corrupt_file', err instanceof Error ? err.message : String(err));
  }

  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) {
    throw new DocxReadError('corrupt_file', 'document.xml 缺少 w:body');
  }

  return walkBody(body);
}

function localName(node: { nodeType: number; localName?: string | null } | null): string | null {
  return node && node.nodeType === 1 ? (node.localName ?? null) : null;
}

function children(node: Element, tag: string): Element[] {
  const out: Element[] = [];
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (localName(c as unknown as { nodeType: number; localName?: string | null }) === tag) out.push(c as unknown as Element);
  }
  return out;
}

function textOf(node: Element): string {
  let text = '';
  const walk = (n: Node) => {
    if (n.nodeType === 1 && (n as unknown as { localName?: string }).localName === 't') {
      text += n.textContent ?? '';
    }
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  };
  walk(node as unknown as Node);
  return text;
}

/** 是否加粗——与 packages/output 完全一致的启发式（不解析 w:pStyle），读写两侧判断口径统一。 */
function isBoldParagraph(p: Element): boolean {
  for (const r of children(p, 'r')) {
    const rPr = children(r, 'rPr')[0];
    if (rPr && children(rPr, 'b').length > 0) return true;
  }
  return false;
}

function tableHasMergedCells(tbl: Element): boolean {
  for (const tr of children(tbl, 'tr')) {
    for (const tc of children(tr, 'tc')) {
      const tcPr = children(tc, 'tcPr')[0];
      if (!tcPr) continue;
      if (children(tcPr, 'gridSpan').length > 0 || children(tcPr, 'vMerge').length > 0) return true;
    }
  }
  return false;
}

function walkBody(body: Element): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  for (let c = body.firstChild; c; c = c.nextSibling) {
    const tag = localName(c as unknown as { nodeType: number; localName?: string | null });
    if (tag === 'p') {
      const text = textOf(c as unknown as Element);
      if (text.trim().length === 0) continue;
      blocks.push({ kind: 'paragraph', text, heading: isBoldParagraph(c as unknown as Element) });
    } else if (tag === 'tbl') {
      const tbl = c as unknown as Element;
      const rows = children(tbl, 'tr').map((tr) => children(tr, 'tc').map((tc) => children(tc, 'p').map(textOf).join(' ')));
      blocks.push({ kind: 'table', rows, merged: tableHasMergedCells(tbl) });
    }
  }
  return blocks;
}
```

**实现注意：** `@xmldom/xmldom` 的 `Element`/`Node` 类型与 lib.dom 的同名类型在 TS 严格模式下可能出现细微不兼容（`localName` 可空性、`nodeType` 字面量等）——如果按上述写法 `tsc` 报类型错误，改为从 `@xmldom/xmldom` 显式 `import type { Element, Node } from '@xmldom/xmldom'` 替换所有裸 `Element`/`Node` 引用（`packages/output/src/apply-instructions.ts` 就是这么做的，可直接参考其 import 写法），不要用 `any` 绕过。

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/docx/docx-reader`
Expected: PASS，10 例。

- [ ] **Step 5: Typecheck**

Run: `cd /Users/lesprivilege/Projects/Courtwork/packages/reading-view && npx tsc --noEmit -p tsconfig.json`
Expected: 无输出。若有 `Element`/`Node` 类型不兼容错误，按上方"实现注意"调整 import。

- [ ] **Step 6: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/docx/docx-reader.ts packages/reading-view/src/docx/docx-reader.test.ts
git commit -m "feat(reading-view): docx 低层读取器（段落/表格抽取 + 安全拒绝）"
```

---

## Task 11: docx 转换器 — docx-to-markdown.ts

**Files:**
- Create: `packages/reading-view/src/docx/docx-to-markdown.ts`
- Test: `packages/reading-view/src/docx/docx-to-markdown.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/docx/docx-to-markdown.test.ts
import { describe, expect, it } from 'vitest';
import { convertDocxToReadingView } from './docx-to-markdown.js';
import { DEFAULT_LIMITS } from '../security/limits.js';
import { buildDocxFixture, buildCorruptDocx } from '../test-fixtures/build-docx-fixture.js';

describe('convertDocxToReadingView', () => {
  it('加粗段落渲染为二级标题，正文段落原样渲染', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第二条 付款方式', bold: true } },
        { type: 'paragraph', paragraph: { text: '预付款：合同总价30%。' } },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f1', fileName: 'contract.docx', data },
      DEFAULT_LIMITS,
    );
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.markdown).toBe('## 第二条 付款方式');
    expect(outcome.view.paragraphs[1]!.markdown).toBe('预付款：合同总价30%。');
  });

  it('简单表格渲染为 md 表格语法（内容取自样板案主合同第二条付款方式，验证真实合同场景）', async () => {
    // 样板案 main-contract.md 第二条以行内编号列举付款方式（预付款30%/验收款60%/
    // 质保金10%，见 packages/demo-data/data/contracts/main-contract.md）；真实 Word
    // 合同里这类条款极常见以表格排版，本 fixture 用同样的条款数据构造一份"如果这份
    // 合同是用表格写付款条款"的 docx，验证表格转出路径而非重新发明测试内容。
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第二条 付款方式', bold: true } },
        {
          type: 'table',
          table: {
            rows: [
              ['期次', '比例', '金额', '支付时点'],
              ['预付款', '30%', '1,140,000元', '合同签订后7日内'],
              ['验收款', '60%', '2,280,000元', '设备验收合格后15日内'],
              ['质保金', '10%', '380,000元', '质保期（12个月）届满后'],
            ],
          },
        },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f2', fileName: 'contract.docx', data },
      DEFAULT_LIMITS,
    );
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.markdown).toBe('## 第二条 付款方式');
    const tableMd = outcome.view.paragraphs[1]!.markdown;
    expect(tableMd).toBe(
      [
        '| 期次 | 比例 | 金额 | 支付时点 |',
        '| --- | --- | --- | --- |',
        '| 预付款 | 30% | 1,140,000元 | 合同签订后7日内 |',
        '| 验收款 | 60% | 2,280,000元 | 设备验收合格后15日内 |',
        '| 质保金 | 10% | 380,000元 | 质保期（12个月）届满后 |',
      ].join('\n'),
    );
    // 静默丢内容是硬禁区：确认全部四期付款信息都真实出现在渲染结果里，不是被截断或摘要。
    expect(tableMd).toContain('1,140,000元');
    expect(tableMd).toContain('2,280,000元');
    expect(tableMd).toContain('380,000元');
  });

  it('含合并单元格表格的文档整文件降级为 disabled/fidelity_insufficient（不静默丢表格内容）', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '第二条 付款方式', bold: true } },
        { type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']], merged: true } },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f3', fileName: 'contract.docx', data },
      DEFAULT_LIMITS,
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
  });

  it('每个段落 anchor 都携带 textLayerVersion，且同一文件内全部一致', async () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '段落一' } },
        { type: 'paragraph', paragraph: { text: '段落二' } },
      ],
    });
    const outcome = await convertDocxToReadingView(
      { fileId: 'f4', fileName: 'a.docx', data },
      DEFAULT_LIMITS,
    );
    if (outcome.status !== 'ok') throw new Error('unreachable');
    const versions = outcome.view.paragraphs.map((p) => p.anchor.textLayerVersion);
    expect(versions[0]).toBeDefined();
    expect(versions[0]).toBe(versions[1]);
  });

  it('docx 的 anchor 不填 page（无固定分页概念）', async () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '段落' } }] });
    const outcome = await convertDocxToReadingView({ fileId: 'f5', fileName: 'a.docx', data }, DEFAULT_LIMITS);
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.anchor.page).toBeUndefined();
  });

  it('损坏文件透传 docx-reader 抛出的 reason，映射为 disabled', async () => {
    const data = buildCorruptDocx();
    const outcome = await convertDocxToReadingView({ fileId: 'f6', fileName: 'bad.docx', data }, DEFAULT_LIMITS);
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/docx/docx-to-markdown`
Expected: FAIL，`Cannot find module './docx-to-markdown.js'`。

- [ ] **Step 3: 实现 docx-to-markdown.ts**

```typescript
// packages/reading-view/src/docx/docx-to-markdown.ts
import { readDocxBlocks, DocxReadError, type DocxBlock } from './docx-reader.js';
import { computeTextLayerVersion } from '../text-layer-version.js';
import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';
import type { ResolvedLimits } from '../security/limits.js';

const CONVERTER_NAMESPACE = 'reading-view-docx@1';

function renderMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  const escapeCell = (cell: string) => cell.replace(/\|/g, '\\|');
  const header = rows[0]!.map(escapeCell);
  const separator = header.map(() => '---');
  const bodyRows = rows.slice(1).map((r) => r.map(escapeCell));
  return [header, separator, ...bodyRows].map((r) => `| ${r.join(' | ')} |`).join('\n');
}

function plainTextOf(block: DocxBlock): string {
  return block.kind === 'paragraph' ? block.text : block.rows.map((r) => r.join(' ')).join('\n');
}

export async function convertDocxToReadingView(
  input: ConvertInput,
  limits: ResolvedLimits,
): Promise<ReadingViewOutcome> {
  let blocks: DocxBlock[];
  try {
    blocks = readDocxBlocks(input.data, limits);
  } catch (err) {
    if (err instanceof DocxReadError) {
      return { status: 'disabled', fileId: input.fileId, fileName: input.fileName, reason: err.reason, detail: err.message };
    }
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (blocks.some((b) => b.kind === 'table' && b.merged)) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'fidelity_insufficient',
      detail: '文档包含合并单元格的表格，md 表格语法无法安全表达，整文件降级（不静默丢表格内容）',
    };
  }

  // 单一权威来源：先把每个块的纯文本形态按文档序线性拼接（\n 分隔）成文本层，
  // 边拼接边记录每块在这份文本层里的 [start,end)——textRange 与 textLayerVersion
  // 的哈希都读同一份 plainTexts，不会出现"拼接逻辑改了一处忘了改另一处"的偏移漂移。
  const plainTexts = blocks.map(plainTextOf);
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const plain of plainTexts) {
    const start = cursor;
    const end = start + plain.length;
    ranges.push({ start, end });
    cursor = end + 1;
  }
  const plainTextLayer = plainTexts.join('\n');
  const textLayerVersion = computeTextLayerVersion(CONVERTER_NAMESPACE, plainTextLayer);

  const paragraphs: ReadingViewParagraph[] = blocks.map((block, i) => ({
    index: i,
    markdown:
      block.kind === 'paragraph'
        ? block.heading
          ? `## ${block.text}`
          : block.text
        : renderMarkdownTable(block.rows),
    anchor: {
      fileId: input.fileId,
      textRange: ranges[i]!,
      quote: plainTexts[i]!,
      textLayerVersion,
    },
  }));

  const view: ReadingView = {
    fileId: input.fileId,
    markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
    paragraphs,
  };
  return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/docx`
Expected: PASS，共 16 例（docx-reader 10 + docx-to-markdown 6）。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/docx/docx-to-markdown.ts packages/reading-view/src/docx/docx-to-markdown.test.ts
git commit -m "feat(reading-view): docx→md 渲染（表格转出/合并单元格整降级/textLayerVersion）"
```

---

## Task 12: 测试 fixture 构造器 — build-pdf-fixture.ts

**Files:**
- Create: `packages/reading-view/src/test-fixtures/build-pdf-fixture.ts`

同 Task 9，不含独立测试文件，正确性由 Task 13/16 间接验证。

- [ ] **Step 1: 实现 build-pdf-fixture.ts**

```typescript
// packages/reading-view/src/test-fixtures/build-pdf-fixture.ts
/**
 * 测试专用：手工拼装最小 PDF（PDF 1.4，逐字节精确计算 xref 偏移量），已用 pdfjs-dist
 * 实测验证可正确解析、可正确提取文本、无内容流的页面确实返回空文本。
 */

export function buildPdfFixture(pageContentStreams: string[]): Uint8Array {
  const chunks: string[] = [];
  let byteLength = 0;
  const push = (s: string) => {
    chunks.push(s);
    byteLength += Buffer.byteLength(s, 'latin1');
  };

  push('%PDF-1.4\n');

  const pageCount = pageContentStreams.length;
  const fontObjNum = 3 + 2 * pageCount;
  const kids = Array.from({ length: pageCount }, (_, i) => `${3 + i} 0 R`).join(' ');

  const objs: string[] = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>'); // obj 1
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`); // obj 2
  for (let i = 0; i < pageCount; i++) {
    objs.push(
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /MediaBox [0 0 200 200] /Contents ${3 + pageCount + i} 0 R >>`,
    ); // obj 3..2+pageCount
  }
  for (const content of pageContentStreams) {
    objs.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
  } // obj 3+pageCount..2+2*pageCount
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); // obj fontObjNum

  const offsets: number[] = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(byteLength);
    push(`${i + 1} 0 obj\n${objs[i]}\nendobj\n`);
  }

  const xrefOffset = byteLength;
  const total = objs.length + 1;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let i = 1; i < total; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Uint8Array(Buffer.from(chunks.join(''), 'latin1'));
}

export function buildPdfWithTextLayer(text = 'Hello World'): Uint8Array {
  return buildPdfFixture([`BT /F1 24 Tf 20 100 Td (${text}) Tj ET`]);
}

export function buildPdfWithoutTextLayer(): Uint8Array {
  return buildPdfFixture(['']);
}

/** 混合场景：第一页有文本、第二页没有——用于验证"只要有一页有文本仍判 ok"。 */
export function buildPdfWithMixedTextLayers(): Uint8Array {
  return buildPdfFixture(['BT /F1 24 Tf 20 100 Td (Page One Text) Tj ET', '']);
}

export function buildCorruptPdf(): Uint8Array {
  return new Uint8Array(Buffer.from('%PDF-1.4\nnot a real pdf body', 'latin1'));
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/test-fixtures/build-pdf-fixture.ts
git commit -m "test(reading-view): pdf 测试 fixture 构造器"
```

---

## Task 13: pdf 转换器

**Files:**
- Create: `packages/reading-view/src/pdf/pdf-to-reading-view.ts`
- Test: `packages/reading-view/src/pdf/pdf-to-reading-view.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/pdf/pdf-to-reading-view.test.ts
import { describe, expect, it } from 'vitest';
import { convertPdfToReadingView } from './pdf-to-reading-view.js';
import {
  buildPdfWithTextLayer,
  buildPdfWithoutTextLayer,
  buildPdfWithMixedTextLayers,
  buildCorruptPdf,
} from '../test-fixtures/build-pdf-fixture.js';

describe('convertPdfToReadingView', () => {
  it('含文本层的单页 PDF 判定为 ok，anchor 携带 page 与 textLayerVersion', async () => {
    const data = buildPdfWithTextLayer('Hello World');
    const outcome = await convertPdfToReadingView({ fileId: 'f1', fileName: 'a.pdf', data });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.pageCount).toBe(1);
    expect(outcome.view.paragraphs[0]!.markdown).toContain('Hello World');
    expect(outcome.view.paragraphs[0]!.anchor.page).toBe(1);
    expect(outcome.view.paragraphs[0]!.anchor.textLayerVersion).toBeDefined();
  });

  it('全篇无文本层的 PDF 判定为 needs_ocr', async () => {
    const data = buildPdfWithoutTextLayer();
    const outcome = await convertPdfToReadingView({ fileId: 'f2', fileName: 'scan.pdf', data });
    expect(outcome.status).toBe('needs_ocr');
  });

  it('部分页面有文本、部分没有时仍判定为 ok（只要有一页有文本）', async () => {
    const data = buildPdfWithMixedTextLayers();
    const outcome = await convertPdfToReadingView({ fileId: 'f3', fileName: 'mixed.pdf', data });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs).toHaveLength(1);
    expect(outcome.view.paragraphs[0]!.anchor.page).toBe(1);
  });

  it('损坏的 PDF 判定为 disabled/corrupt_file，不抛异常', async () => {
    const data = buildCorruptPdf();
    const outcome = await convertPdfToReadingView({ fileId: 'f4', fileName: 'bad.pdf', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/pdf`
Expected: FAIL，`Cannot find module './pdf-to-reading-view.js'`。

- [ ] **Step 3: 实现 pdf-to-reading-view.ts**

```typescript
// packages/reading-view/src/pdf/pdf-to-reading-view.ts
// 注意：Node 环境必须从 legacy 入口导入，裸 'pdfjs-dist' 在 Node 下会因缺少浏览器
// 全局对象（如 DOMMatrix）而报错——这一点已用探测脚本实测确认，不是习惯性写法。
import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { computeTextLayerVersion } from '../text-layer-version.js';
import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';

const CONVERTER_NAMESPACE = 'reading-view-pdf@1';

export async function convertPdfToReadingView(input: ConvertInput): Promise<ReadingViewOutcome> {
  let doc;
  try {
    doc = await getDocument({
      data: input.data,
      useWorkerFetch: false,
      isEvalSupported: false,
      verbosity: VerbosityLevel.ERRORS,
    }).promise;
  } catch (err) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const paragraphs: ReadingViewParagraph[] = [];
    let hasAnyText = false;
    let index = 0;

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join('');
      if (pageText.trim().length === 0) continue;
      hasAnyText = true;
      const textLayerVersion = computeTextLayerVersion(CONVERTER_NAMESPACE, pageText);
      paragraphs.push({
        index: index++,
        markdown: pageText,
        anchor: {
          fileId: input.fileId,
          page: pageNumber,
          textRange: { start: 0, end: pageText.length },
          quote: pageText,
          textLayerVersion,
        },
      });
    }

    if (!hasAnyText) {
      return { status: 'needs_ocr', fileId: input.fileId, fileName: input.fileName, detail: '全部页面均无可提取文本层' };
    }

    const view: ReadingView = {
      fileId: input.fileId,
      markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
      paragraphs,
    };
    return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view, pageCount: doc.numPages };
  } finally {
    await doc.destroy();
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/pdf`
Expected: PASS，4 例。

- [ ] **Step 5: Typecheck**

Run: `cd /Users/lesprivilege/Projects/Courtwork/packages/reading-view && npx tsc --noEmit -p tsconfig.json`
Expected: 无输出。

- [ ] **Step 6: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/pdf/
git commit -m "feat(reading-view): pdf 转换器（逐页文本层 + 扫描件检测）"
```

---

## Task 14: 顶层分发 convert.ts

**Files:**
- Create: `packages/reading-view/src/convert.ts`
- Test: `packages/reading-view/src/convert.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/convert.test.ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/convert.test.ts`
Expected: FAIL，`Cannot find module './convert.js'`。

- [ ] **Step 3: 实现 convert.ts**

```typescript
// packages/reading-view/src/convert.ts
import { resolveLimits, type ResolvedLimits } from './security/limits.js';
import { convertTextToReadingView } from './text/text-to-reading-view.js';
import { convertMarkdownToReadingView } from './markdown/markdown-to-reading-view.js';
import { convertDocxToReadingView } from './docx/docx-to-markdown.js';
import { convertPdfToReadingView } from './pdf/pdf-to-reading-view.js';
import type { ConvertInput, ConvertOptions, ReadingViewOutcome, SupportedFormat } from './types.js';

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`转换超时（>${timeoutMs}ms）`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

function inferFormat(fileName: string): SupportedFormat | undefined {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'docx':
      return 'docx';
    case 'md':
    case 'markdown':
      return 'md';
    case 'txt':
      return 'txt';
    case 'pdf':
      return 'pdf';
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'png':
      return 'png';
    default:
      return undefined;
  }
}

async function runConversion(input: ConvertInput, limits: ResolvedLimits): Promise<ReadingViewOutcome> {
  if (input.data.byteLength > limits.maxFileSizeBytes) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'file_too_large',
      detail: `文件 ${input.data.byteLength} 字节超过上限 ${limits.maxFileSizeBytes} 字节`,
    };
  }

  const format = input.format ?? inferFormat(input.fileName);
  switch (format) {
    case 'jpg':
    case 'png':
      return { status: 'needs_ocr', fileId: input.fileId, fileName: input.fileName, detail: '图片格式无文本层，需要 OCR' };
    case 'txt':
      return convertTextToReadingView(input);
    case 'md':
      return convertMarkdownToReadingView(input);
    case 'docx':
      return convertDocxToReadingView(input, limits);
    case 'pdf':
      return convertPdfToReadingView(input);
    default:
      return {
        status: 'disabled',
        fileId: input.fileId,
        fileName: input.fileName,
        reason: 'unsupported_format',
        detail: `不支持的文件格式：${input.fileName}`,
      };
  }
}

/**
 * 契约：永不 throw。任何内部异常（包括调用方传入运行时非法输入）都兜底为
 * disabled/corrupt_file，而不是让异常冒泡——调用方永远只需要处理三态判别联合，
 * 不需要额外包 try/catch。
 */
export async function convertToReadingView(
  input: ConvertInput,
  options?: ConvertOptions,
): Promise<ReadingViewOutcome> {
  const limits = resolveLimits(options);
  try {
    return await withTimeout(runConversion(input, limits), limits.timeoutMs);
  } catch (err) {
    return {
      status: 'disabled',
      fileId: input?.fileId ?? 'unknown',
      fileName: input?.fileName ?? 'unknown',
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/convert.test.ts`
Expected: PASS，10 例。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/convert.ts packages/reading-view/src/convert.test.ts
git commit -m "feat(reading-view): 顶层分发 convertToReadingView（格式路由+大小前置检查+超时+永不 throw）"
```

---

## Task 15: CaseFile 投影 manifest/to-case-file-entry.ts

**Files:**
- Create: `packages/reading-view/src/manifest/to-case-file-entry.ts`
- Test: `packages/reading-view/src/manifest/to-case-file-entry.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// packages/reading-view/src/manifest/to-case-file-entry.test.ts
import { describe, expect, it } from 'vitest';
import { toCaseFileEntryProjection } from './to-case-file-entry.js';
import type { ReadingViewOutcome } from '../types.js';

describe('toCaseFileEntryProjection', () => {
  it('ok 状态投影为 done，携带 pageCount', () => {
    const outcome: ReadingViewOutcome = {
      status: 'ok',
      fileId: 'f1',
      fileName: 'a.pdf',
      view: { fileId: 'f1', markdown: '', paragraphs: [] },
      pageCount: 5,
    };
    expect(toCaseFileEntryProjection(outcome)).toEqual({
      fileId: 'f1',
      fileName: 'a.pdf',
      ingestStatus: 'done',
      pageCount: 5,
    });
  });

  it('needs_ocr 状态无损投影为 needs_ocr（schemas 已同步扩展枚举）', () => {
    const outcome: ReadingViewOutcome = { status: 'needs_ocr', fileId: 'f2', fileName: 'scan.pdf' };
    expect(toCaseFileEntryProjection(outcome)).toEqual({
      fileId: 'f2',
      fileName: 'scan.pdf',
      ingestStatus: 'needs_ocr',
    });
  });

  it('disabled 状态（任意 reason）统一投影为 failed', () => {
    const outcome: ReadingViewOutcome = {
      status: 'disabled',
      fileId: 'f3',
      fileName: 'bad.docx',
      reason: 'zip_bomb_suspected',
    };
    expect(toCaseFileEntryProjection(outcome)).toEqual({
      fileId: 'f3',
      fileName: 'bad.docx',
      ingestStatus: 'failed',
    });
  });

  it('投影结果不含 documentType 字段（分类不是本包职责，留给未来装配点）', () => {
    const outcome: ReadingViewOutcome = { status: 'needs_ocr', fileId: 'f4', fileName: 'a.jpg' };
    const projection = toCaseFileEntryProjection(outcome);
    expect('documentType' in projection).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/manifest`
Expected: FAIL，`Cannot find module './to-case-file-entry.js'`。

- [ ] **Step 3: 实现 to-case-file-entry.ts**

```typescript
// packages/reading-view/src/manifest/to-case-file-entry.ts
import type { IngestStatus } from '@courtwork/schemas';
import type { ReadingViewOutcome } from '../types.js';

/**
 * 契约取子集，本包结果存全集：CaseFileEntry.documentType 必填，但文书分类是
 * ingest 分类器（W8）的职责，本包不产出、也不猜测占位。投影责任留给未来的
 * 装配点（沿用 demo-data/tools 已验证过的先例）——调用方拿到这个投影后自行
 * 补上 documentType 才能得到合法的 CaseFileEntry。
 */
export interface CaseFileEntryProjection {
  fileId: string;
  fileName: string;
  ingestStatus: IngestStatus;
  pageCount?: number;
}

export function toCaseFileEntryProjection(outcome: ReadingViewOutcome): CaseFileEntryProjection {
  switch (outcome.status) {
    case 'ok':
      return {
        fileId: outcome.fileId,
        fileName: outcome.fileName,
        ingestStatus: 'done',
        pageCount: outcome.pageCount,
      };
    case 'needs_ocr':
      return { fileId: outcome.fileId, fileName: outcome.fileName, ingestStatus: 'needs_ocr' };
    case 'disabled':
      return { fileId: outcome.fileId, fileName: outcome.fileName, ingestStatus: 'failed' };
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/manifest`
Expected: PASS，4 例。

- [ ] **Step 5: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/manifest/
git commit -m "feat(reading-view): ReadingViewOutcome -> CaseFile 清单条目无损投影"
```

---

## Task 16: 恶意/损坏样本降级路径集成测试

**Files:**
- Create: `packages/reading-view/src/malformed-inputs.test.ts`

本任务不新增生产代码，只新增一个贯穿 `convertToReadingView` 公开入口的集成测试文件，把 Task 9/12 的 fixture 构造器与 Task 4/5/10/11/13/14 已实现的各处降级路径串起来验证——这是"一个刻意构造的坏文件走降级路径有测试"这条验收要求的直接落点，且覆盖数量超过其字面的"一个"下限。

- [ ] **Step 1: 写测试（这些路径的生产代码均已在前面任务实现，本任务是纯验证，预期直接通过）**

```typescript
// packages/reading-view/src/malformed-inputs.test.ts
import { describe, expect, it } from 'vitest';
import { convertToReadingView } from './convert.js';
import {
  buildDocxFixture,
  buildDocxWithDoctype,
  buildZipBombFixture,
  buildCorruptDocx,
} from './test-fixtures/build-docx-fixture.js';
import { buildCorruptPdf, buildPdfWithoutTextLayer } from './test-fixtures/build-pdf-fixture.js';

describe('刻意构造的坏文件：降级路径贯穿顶层入口', () => {
  it('zip 炸弹形态的 docx 判定为 disabled/zip_bomb_suspected', async () => {
    const outcome = await convertToReadingView({ fileId: 'f1', fileName: 'bomb.docx', data: buildZipBombFixture() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'zip_bomb_suspected' });
  });

  it('含 DOCTYPE/ENTITY 的 docx 判定为 disabled/malicious_content', async () => {
    const outcome = await convertToReadingView({ fileId: 'f2', fileName: 'xxe.docx', data: buildDocxWithDoctype() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'malicious_content' });
  });

  it('含 vbaProject.bin 的 docx 判定为 disabled/malicious_content', async () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }], includeVbaProject: true });
    const outcome = await convertToReadingView({ fileId: 'f3', fileName: 'macro.docx', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'malicious_content' });
  });

  it('.docm 扩展名判定为 disabled/unsupported_format，不进入解析（扩展名级拦截先于内容检查）', async () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }] });
    const outcome = await convertToReadingView({ fileId: 'f4', fileName: 'contract.docm', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'unsupported_format' });
  });

  it('含合并单元格表格的 docx 判定为 disabled/fidelity_insufficient', async () => {
    const data = buildDocxFixture({
      blocks: [{ type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']], merged: true } }],
    });
    const outcome = await convertToReadingView({ fileId: 'f5', fileName: 'merged.docx', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
  });

  it('不合法 zip 的 docx 判定为 disabled/corrupt_file', async () => {
    const outcome = await convertToReadingView({ fileId: 'f6', fileName: 'bad.docx', data: buildCorruptDocx() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('损坏的 PDF 判定为 disabled/corrupt_file', async () => {
    const outcome = await convertToReadingView({ fileId: 'f7', fileName: 'broken.pdf', data: buildCorruptPdf() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('超过大小上限的文件判定为 disabled/file_too_large', async () => {
    const outcome = await convertToReadingView(
      { fileId: 'f8', fileName: 'huge.txt', data: new Uint8Array(1024) },
      { maxFileSizeBytes: 100 },
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'file_too_large' });
  });

  it('非法 UTF-8 字节的 txt 判定为 disabled/corrupt_file', async () => {
    const outcome = await convertToReadingView({ fileId: 'f9', fileName: 'bad-encoding.txt', data: new Uint8Array([0xff, 0xfe, 0xfd]) });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('未知扩展名判定为 disabled/unsupported_format', async () => {
    const outcome = await convertToReadingView({ fileId: 'f10', fileName: 'weird.xyz', data: new Uint8Array([1]) });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'unsupported_format' });
  });

  it('jpg 扩展名短路为 needs_ocr（缺口三态里的禁用态，非 disabled）', async () => {
    const outcome = await convertToReadingView({ fileId: 'f11', fileName: 'scan.jpg', data: new Uint8Array([1, 2, 3]) });
    expect(outcome.status).toBe('needs_ocr');
  });

  it('无文本层的 PDF 判定为 needs_ocr', async () => {
    const outcome = await convertToReadingView({ fileId: 'f12', fileName: 'scan.pdf', data: buildPdfWithoutTextLayer() });
    expect(outcome.status).toBe('needs_ocr');
  });
});
```

- [ ] **Step 2: 运行确认全部通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/malformed-inputs.test.ts`
Expected: PASS，12 例全绿（若有失败，说明前面某个任务的降级路径实现与本任务的预期不一致，回到对应任务排查，不要在本任务里改生产代码掩盖）。

- [ ] **Step 3: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/malformed-inputs.test.ts
git commit -m "test(reading-view): 恶意/损坏文件降级路径贯穿顶层入口的集成测试"
```

---

## Task 17: golden 测试 — 样板案语料全量跑通 md 阅读视图路径

**Files:**
- Create: `packages/reading-view/src/golden/demo-data-corpus.test.ts`

**背景：** `@courtwork/demo-data` 的 20 份 dossier 文书 + `main-contract.md` 目前都是 `.md` 文件（没有对应的 docx/pdf 二进制版本），所以"样板案 20 份 dossier 文书 + 主合同全量跑通"这条验收要求字面对应的是 md 路径的全量语料测试，docx/pdf 路径的语料覆盖已在 Task 10/11/13/16 用手工构造的 fixture（含从 main-contract 内容派生的表格场景）达成，二者互补，不是同一件事的重复。

- [ ] **Step 1: 写测试**

```typescript
// packages/reading-view/src/golden/demo-data-corpus.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { convertToReadingView } from '../convert.js';

interface CorpusFile {
  fileId: string;
  fileName: string;
  content: string;
}

function demoDataRoot(): string {
  const resolved = import.meta.resolve('@courtwork/demo-data');
  return dirname(dirname(fileURLToPath(resolved)));
}

function loadCorpusFiles(): CorpusFile[] {
  const root = demoDataRoot();
  const dossierDir = join(root, 'data', 'dossier');
  const dossierFiles = readdirSync(dossierDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => ({ fileId: name, fileName: name, content: readFileSync(join(dossierDir, name), 'utf-8') }));

  const mainContractPath = join(root, 'data', 'contracts', 'main-contract.md');
  const mainContract: CorpusFile = {
    fileId: 'main-contract.md',
    fileName: 'main-contract.md',
    content: readFileSync(mainContractPath, 'utf-8'),
  };

  return [...dossierFiles, mainContract];
}

describe('样板案语料全量 golden：md 阅读视图路径', () => {
  const corpus = loadCorpusFiles();

  it('样板案恰好 20 份 dossier 文书 + 1 份主合同，共 21 个文件', () => {
    expect(corpus.length).toBe(21);
    expect(corpus.filter((f) => f.fileName.startsWith('main-contract')).length).toBe(1);
  });

  it.each(corpus)('$fileName 转换为阅读视图并产出稳定快照', async ({ fileId, fileName, content }) => {
    const outcome = await convertToReadingView({ fileId, fileName, data: new TextEncoder().encode(content) });
    expect(outcome.status).toBe('ok');
    expect(outcome).toMatchSnapshot();
  });

  it.each(corpus)('$fileName 每个段落的 anchor.textRange 都能精确 slice 回原文', ({ fileId, fileName, content }) => {
    return convertToReadingView({ fileId, fileName, data: new TextEncoder().encode(content) }).then((outcome) => {
      if (outcome.status !== 'ok') throw new Error(`${fileName} 应为 ok 状态，实际是 ${outcome.status}`);
      for (const paragraph of outcome.view.paragraphs) {
        const { start, end } = paragraph.anchor.textRange!;
        expect(content.slice(start, end)).toBe(paragraph.anchor.quote);
      }
    });
  });
});
```

- [ ] **Step 2: 运行测试，首次运行会自动生成快照文件**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/golden`
Expected: PASS，共 43 例（1 例文件数量断言 + 21 例快照 + 21 例 textRange 精确性），并在 `packages/reading-view/src/golden/__snapshots__/demo-data-corpus.test.ts.snap` 生成快照文件。

- [ ] **Step 3: 人工检查快照内容**

Run: `head -100 packages/reading-view/src/golden/__snapshots__/demo-data-corpus.test.ts.snap`
Expected: 能看到类似 `01-起诉状.md` 这样的快照条目，`status: "ok"`，`paragraphs` 数组包含合理数量的段落，每个 `markdown` 字段是可读的中文法律文本（不是乱码或空字符串）。若发现异常（如某个真实文件被误判为 `disabled`），回到对应格式转换器排查，不要在本任务里放宽断言掩盖。

- [ ] **Step 4: Commit（快照文件一并提交，golden files 是本包验收契约的一部分）**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/golden/
git commit -m "test(reading-view): 样板案 21 份真实语料全量 golden 快照（md 阅读视图路径）"
```

---

## Task 18: index.ts 桶导出 + 全仓验证 + SPEC.md 验收记录

**Files:**
- Modify: `packages/reading-view/src/index.ts`
- Create: `packages/reading-view/src/index.test.ts`
- Modify: `packages/reading-view/SPEC.md`

- [ ] **Step 1: 写失败测试（验证公开 API 从包根可用）**

```typescript
// packages/reading-view/src/index.test.ts
import { describe, expect, it } from 'vitest';
import { convertToReadingView, toCaseFileEntryProjection, DEFAULT_LIMITS } from './index.js';

describe('包根导出', () => {
  it('convertToReadingView 可从包根直接调用并端到端跑通', async () => {
    const outcome = await convertToReadingView({
      fileId: 'f1',
      fileName: 'a.md',
      data: new TextEncoder().encode('# 标题\n\n正文段落。'),
    });
    expect(outcome.status).toBe('ok');
  });

  it('toCaseFileEntryProjection 可从包根直接调用', async () => {
    const outcome = await convertToReadingView({ fileId: 'f2', fileName: 'a.jpg', data: new Uint8Array([1]) });
    expect(toCaseFileEntryProjection(outcome)).toEqual({ fileId: 'f2', fileName: 'a.jpg', ingestStatus: 'needs_ocr' });
  });

  it('DEFAULT_LIMITS 可从包根读取', () => {
    expect(DEFAULT_LIMITS.maxFileSizeBytes).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/index.test.ts`
Expected: FAIL（`index.ts` 目前是空占位 `export {};`，上述具名导入全部报错）。

- [ ] **Step 3: 实现 index.ts**

```typescript
// packages/reading-view/src/index.ts
export { convertToReadingView } from './convert.js';
export type {
  ConvertInput,
  ConvertOptions,
  ReadingView,
  ReadingViewParagraph,
  ReadingViewOutcome,
  DisabledReason,
  SupportedFormat,
} from './types.js';
export { toCaseFileEntryProjection } from './manifest/to-case-file-entry.js';
export type { CaseFileEntryProjection } from './manifest/to-case-file-entry.js';
export { DEFAULT_LIMITS } from './security/limits.js';
export type { ResolvedLimits } from './security/limits.js';
```

- [ ] **Step 4: 运行确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && npx vitest run packages/reading-view/src/index.test.ts`
Expected: PASS，3 例。

- [ ] **Step 5: 全仓测试 + lint + build**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm test`
Expected: 全绿，无 failing。记下总用例数，写进下一步的验收记录。

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm lint`
Expected: 无 error（`packages/reading-view` 下所有新文件遵循根 `eslint.config.js` 规则；若报错，修正后重跑，不要禁用规则绕过）。

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm -r run build`
Expected: 全部 workspace 包（含 `@courtwork/reading-view`）build 成功，`packages/reading-view/dist/` 生成 `.js`/`.d.ts`。

- [ ] **Step 6: 干净环境复核（不采信增量安装的假绿）**

```bash
cd /Users/lesprivilege/Projects/Courtwork
rm -rf node_modules packages/*/node_modules apps/*/node_modules eval/node_modules
pnpm install
pnpm test
pnpm lint
pnpm -r run build
```

Expected: 全部命令成功，测试全绿，与 Step 5 的用例数一致。

- [ ] **Step 7: 更新 SPEC.md 状态区与验收记录**

把 `packages/reading-view/SPEC.md` 顶部的状态行：

```
状态：设计完成，待实现（承接 `docs/41-MVP缺口盘点与路由声明.md` 的衍生工单"W3.0 阅读视图管线"，架构会话已批准本设计，见 2026-07-10 对话记录）
```

改为：

```
状态：已完成
```

把文末的 `## 验收记录` 一节从 `（实现完成后填写）` 改为实际交付内容——写清楚：`pnpm test` 最终用例总数（含全仓，不只本包）与本包自身用例数拆分（security 若干 + text/markdown/docx/pdf 若干 + convert 若干 + manifest 若干 + malformed-inputs 12 + golden 43）、`pnpm lint`/`pnpm -r run build` 结果、Step 6 干净环境复核已执行、以及一条关键设计取舍总结（textLayerVersion 的必要性来自哪次修正、docx 表格"要么正确转出要么整降级"的硬性纪律、md/txt 路径 markdown 字段与 anchor.quote 因不重新序列化而天然一致这一性质）。**具体用例数以 Step 5/6 的真实终端输出为准填写，不要凭空估算。**

- [ ] **Step 8: 最终提交**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add packages/reading-view/src/index.ts packages/reading-view/src/index.test.ts packages/reading-view/SPEC.md
git commit -m "feat(reading-view): 桶导出 + 全仓验证通过 + SPEC 验收记录收尾"
```

---

## 交付后的跨层状态核对（非新增代码任务，是收尾检查清单）

实现全部完成后，确认以下三项已在本工单更早阶段（Task 1 之前）落地并各自独立提交，不需要在本计划里重做：

- `packages/schemas/src/case-file.ts`：`IngestStatusEnum` 已含 `needs_ocr`。
- `packages/registry/scenarios/S1.yaml`：`trigger.fileTypes` 已含 `docx`/`md`/`txt`（与 `pdf`/`jpg`/`png` 并存）。
- 根 `CLAUDE.md`：架构依赖图已含 `packages/reading-view` 一行。

若因故这三项尚未完成（例如本计划被拆分执行、跳过了前置阶段），先补齐这三项再继续 Task 1——`packages/reading-view` 的 `manifest/to-case-file-entry.ts`（Task 15）依赖 `needs_ocr` 已存在于 `@courtwork/schemas` 的 `IngestStatusEnum` 里，否则 `toCaseFileEntryProjection` 的 `needs_ocr` 分支类型不通过。
