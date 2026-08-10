import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * PI-TIMEOUT-SWEEP-1 机器形态守卫（返修版，源 验收 REJECT `1c1c181`）。
 *
 * 族定义：一枚 `it(...)` 判据本体真实构造达重计算/真实磁盘 I/O 量级，却没有显式第三参数
 * 超时。**枚举轴按数值量级求解，不按标识符拼写**——`MAX_*` 只是常见命名，不是族边界；
 * 同一份重计算换成数字字面量书写，必须同样被本门看见（`1c1c181` 拒因：旧轴只认
 * `MAX_[A-Z0-9_]+` 字面在场，数字字面量写法同时躲过枚举与机器门）。
 *
 * 两条独立扫描面：
 * - **形状 A**（`it()` 体内内联构造）：`.repeat(...)`／`Array.from({ length: ... })`／
 *   `Buffer.alloc(...)`／`new Array(...)`／`.padEnd(...)`／`.padStart(...)` 的实参做**数值
 *   求解**（数字字面量、同文件本地 `const NAME = NUMBER`、单跳 import 的生产常量、以及
 *   `+ - * /` 与括号构成的简单算式），按字节/元素阈值判族；**求解不出的实参一律按重计算
 *   候选处理（fail-closed：unknown → 判族而非跳过），不当作安全豁免**。
 * - **形状 B**（`describe` 作用域内真实磁盘写 fixture）：判据本体不看具名 helper 拼写，
 *   改按「本 `describe`（或文件级 `beforeAll`/`beforeEach`）内是否有函数体含
 *   `writeFile`/`mkdir`/`symlink` 的真实调用、且其实参可解出达阈值的规模」判定该作用域为
 *   heavy fixture；再看该作用域内哪些 `it()` 以已知读入口（`run*(`／`.execute(`／
 *   `readFile(`／`readTextLines(`）触达它。
 *
 * 两条轴都可能判「量级无法求解」——此时同样计入候选，不静默放行。
 *
 * 豁免：结构匹配但核定后无需处置的成员，一律进具名登记表（`EXEMPT_WITHOUT_TIMEOUT` 逐条
 * title、`FILE_LEVEL_EXEMPTIONS` 逐文件）并写理由，不得写成扫描器代码里的过滤条件——
 * `sidecar.test.ts` 的整文件豁免同样迁入 `FILE_LEVEL_EXEMPTIONS`（验收观察②）。
 */

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const GUARD_FILE_BASENAME = 'timeout-family-guard.test.ts';

/** 字节/字符规模阈值：大于本仓已知全部「小边界探针」（实测最大 4097）、
 * 小于全部已知真重构造（实测最小 32768），取生产常量 MAX_API_KEY_BYTES=8192 的量级。 */
const HEAVY_BYTE_THRESHOLD = 8192;

/** 元素/文件计数阈值：与已治理族最小生产常量 MAX_MATCHES=200 同阈值
 * （同时覆盖 MAX_LIST_ENTRIES/MAX_FILES_SCANNED/MAX_WORKSPACE_LIST_ENTRIES=2000 一类）。 */
const HEAVY_COUNT_THRESHOLD = 200;

// ── 数值求解：字面量 + 常量查表 + 简单算式 ──────────────────────────────────────

/** 极简递归下降算术求值器（+ - * / 与括号，数字含下划线分隔），只服务本文件的数值求解，
 * 不是通用表达式引擎；解析不完（有残留字符）一律返回 null，不猜测。 */
function evalArithmetic(expr: string): number | null {
  const s = expr;
  let i = 0;
  const skipWs = () => {
    while (i < s.length && /\s/.test(s[i]!)) i += 1;
  };
  const parseNumber = (): number | null => {
    skipWs();
    const start = i;
    while (i < s.length && /[0-9_]/.test(s[i]!)) i += 1;
    if (i === start) return null;
    const raw = s.slice(start, i).replace(/_/g, '');
    if (raw.length === 0) return null;
    return Number(raw);
  };
  const parseFactor = (): number | null => {
    skipWs();
    if (s[i] === '(') {
      i += 1;
      const v = parseExpr();
      skipWs();
      if (s[i] !== ')') return null;
      i += 1;
      return v;
    }
    if (s[i] === '-') {
      i += 1;
      const v = parseFactor();
      return v === null ? null : -v;
    }
    return parseNumber();
  };
  const parseTerm = (): number | null => {
    let v = parseFactor();
    if (v === null) return null;
    for (;;) {
      skipWs();
      if (s[i] === '*' || s[i] === '/') {
        const op = s[i];
        i += 1;
        const rhs = parseFactor();
        if (rhs === null) return null;
        v = op === '*' ? v * rhs : v / rhs;
      } else break;
    }
    return v;
  };
  const parseExpr = (): number | null => {
    let v = parseTerm();
    if (v === null) return null;
    for (;;) {
      skipWs();
      if (s[i] === '+' || s[i] === '-') {
        const op = s[i];
        i += 1;
        const rhs = parseTerm();
        if (rhs === null) return null;
        v = op === '+' ? v + rhs : v - rhs;
      } else break;
    }
    return v;
  };
  const result = parseExpr();
  skipWs();
  if (i !== s.length) return null; // 有残留未解析字符（如成员访问、函数调用）
  return result;
}

/** 把表达式里能在 constants 表查到的**独立标识符**（非成员访问、非函数调用）替换成其数值
 * 字面量，再交给算术求值器；查不到或紧跟 `.`/`(` 的标识符原样保留，会让求值器判定「有残留
 * 字符」从而返回 null——即「解不出来」，不是「当作 0」。 */
export function resolveExpr(expr: string, constants: ReadonlyMap<string, number>): number | null {
  const substituted = expr.replace(/[A-Za-z_$][\w$]*/g, (name, offset: number, full: string) => {
    const nextChar = full[offset + name.length];
    if (nextChar === '.' || nextChar === '(') return name; // 成员访问/函数调用，不可解
    const value = constants.get(name);
    return value === undefined ? name : String(value);
  });
  return evalArithmetic(substituted);
}

// ── 常量表：本文件本地声明 + 单跳 import 的生产常量 ─────────────────────────────

const LOCAL_NUMERIC_CONST = /(?:^|\n)[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::\s*number)?\s*=\s*([\d_]+)\s*;/g;

function extractLocalNumericConsts(source: string): Map<string, number> {
  const map = new Map<string, number>();
  const re = new RegExp(LOCAL_NUMERIC_CONST.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    map.set(m[1]!, Number(m[2]!.replace(/_/g, '')));
  }
  return map;
}

/** 生产源文件的常量表缓存——同一份 `product-protocol.ts` 等会被多个测试文件 import，
 * 只解析一次。 */
const productConstCache = new Map<string, Map<string, number>>();

function loadProductConsts(absPath: string): Map<string, number> {
  const cached = productConstCache.get(absPath);
  if (cached) return cached;
  let map = new Map<string, number>();
  try {
    const source = readFileSync(absPath, 'utf8');
    map = extractLocalNumericConsts(source);
  } catch {
    // 目标文件不存在或不可读——常量表留空，等同「该文件零可解常量」，不是静默假设。
  }
  productConstCache.set(absPath, map);
  return map;
}

const IMPORT_LINE = /import\s+(?:type\s+)?\{([^}]+)\}\s*from\s*'(\.[^']+)'/g;

/** 单跳解析：本文件 `import { A, B } from './x.js'` → 读 `./x.ts` 的
 * `export const A = N;`/`export const B = N;`，把数值拉进本文件的常量表（以本地绑定名为
 * key，兼容 `as` 别名）。只解一跳——`x.ts` 若再转手 `export { C } from './y.js'`，
 * `C` 解不出来，按 fail-closed 规则算作「该表达式含未知量」。 */
function extractImportedNumericConsts(file: string, source: string): Map<string, number> {
  const map = new Map<string, number>();
  const dir = path.dirname(file);
  const re = new RegExp(IMPORT_LINE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const names = m[1]!.split(',').map((s) => s.trim()).filter(Boolean);
    const importPath = m[2]!;
    if (!importPath.endsWith('.js')) continue;
    const targetPath = path.join(dir, `${importPath.slice(0, -3)}.ts`);
    const targetConsts = loadProductConsts(targetPath);
    for (const rawName of names) {
      const cleaned = rawName.replace(/^type\s+/, '').trim();
      const asMatch = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/.exec(cleaned);
      const sourceName = asMatch ? asMatch[1]! : cleaned;
      const localName = asMatch ? asMatch[2]! : cleaned;
      const value = targetConsts.get(sourceName);
      if (value !== undefined) map.set(localName, value);
    }
  }
  return map;
}

/** 每个测试文件的常量表缓存（本地声明优先于 import，同名遮蔽）。 */
const fileConstCache = new Map<string, Map<string, number>>();

export function buildConstantsMap(file: string, source: string): Map<string, number> {
  const cached = fileConstCache.get(file);
  if (cached) return cached;
  const imported = extractImportedNumericConsts(file, source);
  const local = extractLocalNumericConsts(source);
  const merged = new Map<string, number>([...imported, ...local]); // local 后合并即覆盖同名
  fileConstCache.set(file, merged);
  return merged;
}

// ── 形状 A：调用点数值量级扫描 ──────────────────────────────────────────────────

type MagnitudeAxis = 'byte' | 'count';

interface MagnitudeCall {
  readonly axis: MagnitudeAxis;
  readonly raw: string;
  readonly resolved: number | null;
}

/** 逐一列出会构造「与量级成正比」数据的调用点：`.repeat`/`Buffer.alloc`/`padEnd`/
 * `padStart` 是字节轴，`Array.from({length})`/`new Array` 是元素计数轴。非贪婪匹配到
 * 第一个 `)`——本仓语料里这些调用的首个实参从不含嵌套括号（含嵌套的写法极少见且本仓
 * 现无一例，若出现会因残留字符解析失败而落回「unknown → 判族」，不会静默漏判）。 */
function scanMagnitudeCalls(text: string, constants: ReadonlyMap<string, number>): MagnitudeCall[] {
  const calls: MagnitudeCall[] = [];
  const patterns: { axis: MagnitudeAxis; re: RegExp }[] = [
    { axis: 'byte', re: /\.repeat\(([^)]*)\)/g },
    { axis: 'byte', re: /Buffer\.alloc\(([^,)]+)/g },
    { axis: 'byte', re: /\.pad(?:End|Start)\(([^,)]+)/g },
    { axis: 'count', re: /Array\.from\(\s*\{\s*length:\s*([^,}]+)[,}]/g },
    { axis: 'count', re: /new Array\(([^)]+)\)/g },
  ];
  for (const { axis, re } of patterns) {
    const scoped = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = scoped.exec(text))) {
      const raw = m[1]!.trim();
      calls.push({ axis, raw, resolved: resolveExpr(raw, constants) });
    }
  }
  return calls;
}

/** 形状 A 判族：任一调用点解出的数值达阈值，或任一调用点解不出数值（fail-closed：unknown
 * 量级不算安全），即判该 `it()` 体属于候选族。 */
export function hasHeavyMagnitude(text: string, constants: ReadonlyMap<string, number>): boolean {
  const calls = scanMagnitudeCalls(text, constants);
  return calls.some((call) => {
    if (call.resolved === null) return true; // 解不出来 = 候选，不是安全
    const threshold = call.axis === 'byte' ? HEAVY_BYTE_THRESHOLD : HEAVY_COUNT_THRESHOLD;
    return call.resolved >= threshold;
  });
}

// ── 通用调用块提取（it / describe / beforeAll / beforeEach 同体例） ─────────────

/** 一枚具名调用块：`it(...)`／`describe(...)`／`beforeAll(...)`／`beforeEach(...)`。 */
export interface CallBlock {
  readonly file: string;
  readonly title: string | null;
  readonly startLine: number;
  readonly text: string;
}

/**
 * 按行扫描，逐枚提取 `keyword(...)` 调用块。假定本仓既有 eslint/prettier 体例（闭合
 * `);`/`});` 缩进与调用起始同级）——非通用 JS 解析器；前提被打破（缩进漂移）会导致块
 * 提取失败而不是误判，仍不构成「静默跳过」（提取不到即不会进入任何候选统计，普查测试的
 * 反哨兵断言——候选集合非空——会在提取器整体失灵时先行触红）。
 */
function extractCallBlocks(file: string, source: string, keyword: 'it' | 'describe' | 'beforeAll' | 'beforeEach'): CallBlock[] {
  const lines = source.split('\n');
  const blocks: CallBlock[] = [];
  const kw = keyword === 'it' ? 'it(?:\\.each\\([^\\n]*\\))?' : keyword;
  const startRe = new RegExp(`^(\\s*)${kw}\\(\\s*$`);
  const startInlineRe = new RegExp(`^(\\s*)${kw}\\(\\s*(['"\`])(.*)\\2\\s*,`);
  const startNoTitleRe = new RegExp(`^(\\s*)${kw}\\(\\s*(?:async\\s*)?\\(`); // beforeAll(async () => {
  // `it.each([` 起手、matrix 跨多行才收尾（如 `])('title %s', (a,b) => {`）——独立第四分支，
  // 不塞进上面几条单行体例的正则里（组合体例撑爆一条正则的可维护性，拆开更诚实）。
  const startEachMultilineRe = keyword === 'it' ? /^(\s*)it\.each\(\s*\[\s*$/ : null;
  const eachCloseWithTitleRe = /^\s*\]\s*\)\(\s*(['"`])(.*)\1\s*,/;
  for (let i = 0; i < lines.length; i += 1) {
    const inline = startInlineRe.exec(lines[i]!);
    const bare = !inline ? startRe.exec(lines[i]!) : null;
    const eachMultiline = !inline && !bare && startEachMultilineRe ? startEachMultilineRe.exec(lines[i]!) : null;
    const noTitle = !inline && !bare && !eachMultiline ? startNoTitleRe.exec(lines[i]!) : null;
    if (!inline && !bare && !eachMultiline && !noTitle) continue;
    const indent = (inline ?? bare ?? eachMultiline ?? noTitle)![1]!;
    let title = inline ? inline[3]! : null;
    let j = i;
    const closeExact = `${indent});`;
    const closeBrace = `${indent}});`;
    if (eachMultiline) {
      // 先跳到 matrix 收尾＋标题那一行（`])('title', …`），再继续走同一套收尾扫描。
      let k = i + 1;
      while (k < lines.length && !eachCloseWithTitleRe.test(lines[k]!)) k += 1;
      if (k < lines.length) {
        title = eachCloseWithTitleRe.exec(lines[k]!)![2]!;
        j = k;
      }
    }
    while (j < lines.length) {
      if (title === null && (bare || (!inline && !noTitle && !eachMultiline))) {
        const titleMatch = /^\s*(['"`])(.*)\1\s*,\s*$/.exec(lines[j]!);
        if (titleMatch) title = titleMatch[2]!;
      }
      const trimmedEnd = lines[j]!.replace(/\s+$/, '');
      // 单行合并体例 `}, 60_000);` 只属于 it() 自己的收尾形状——按 keyword 与缩进双重限定，
      // 否则会被 describe/beforeAll 内部任意一枚 it() 的这种收尾行提前截断（真实事故：
      // `单次调用上限` describe 的 `beforeAll(...)}，120_000);` 曾把整个 describe 的
      // 提取范围截断到只剩 beforeAll 本身，见 SPEC 附）。
      const timeoutCloseRe = new RegExp(`^${indent}\\},\\s*[\\d_]+\\s*\\);\\s*$`);
      if (j > i && (trimmedEnd === closeExact || trimmedEnd === closeBrace || (keyword === 'it' && timeoutCloseRe.test(lines[j]!)))) {
        break;
      }
      j += 1;
    }
    if (keyword === 'it' && title === null) continue; // it() 必须有标题；提取不到交给反哨兵
    blocks.push({ file, title, startLine: i + 1, text: lines.slice(i, j + 1).join('\n') });
    i = j;
  }
  return blocks;
}

export function extractItBlocks(file: string, source: string): CallBlock[] {
  return extractCallBlocks(file, source, 'it');
}

export function extractDescribeBlocks(file: string, source: string): CallBlock[] {
  return extractCallBlocks(file, source, 'describe');
}

export function extractSetupBlocks(file: string, source: string): CallBlock[] {
  return [...extractCallBlocks(file, source, 'beforeAll'), ...extractCallBlocks(file, source, 'beforeEach')];
}

// ── 形状 B：真实写盘 helper 探测（不钉具名 helper，按函数体是否真做 fs 写） ────────

interface FunctionDef {
  readonly name: string;
  readonly paramNames: string[];
  readonly bodyText: string;
}

const REAL_WRITE_CALL = /\b(?:writeFile|mkdir|symlink)\s*\(/;

/** 顶层 `(async )?function NAME(params) ... { body }` 定义提取——闭合 `}` 单独一行且与
 * `function` 同缩进（同 `extractCallBlocks` 的缩进锚定假设）。函数体跨越参数列表换行的
 * 情况（如本包 `createFiles` 的多行签名）按「找到本行以 `{` 收尾」识别函数体真正起点。 */
function extractFunctionDefs(source: string): FunctionDef[] {
  const lines = source.split('\n');
  const defs: FunctionDef[] = [];
  const startRe = /^(\s*)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/;
  for (let i = 0; i < lines.length; i += 1) {
    const m = startRe.exec(lines[i]!);
    if (!m) continue;
    const indent = m[1]!;
    const name = m[2]!;
    // 参数列表可能跨行，找到第一处以 `{` 收尾（去尾空白后）的行作为函数体起点。
    let openLine = i;
    while (openLine < lines.length && !lines[openLine]!.replace(/\s+$/, '').endsWith('{')) openLine += 1;
    if (openLine >= lines.length) continue;
    const paramsText = lines.slice(i, openLine + 1).join('\n');
    const paramNames = (/\(([^)]*)\)/.exec(paramsText)?.[1] ?? '')
      .split(',')
      .map((p) => p.trim().split(/[:=\s]/)[0]!.trim())
      .filter(Boolean);
    let j = openLine;
    const closeExact = `${indent}}`;
    while (j < lines.length) {
      if (j > openLine && lines[j]!.replace(/\s+$/, '') === closeExact) break;
      j += 1;
    }
    defs.push({ name, paramNames, bodyText: lines.slice(openLine, j + 1).join('\n') });
    i = j;
  }
  return defs;
}

/** 本文件顶层函数里，哪些是「函数体内真做磁盘写」的 helper——不钉 `createFiles` 这个具名
 * helper，任何满足同一结构特征（body 含 `writeFile`/`mkdir`/`symlink`）的函数都算数，
 * 新增同类 helper 无需改扫描器。 */
export function findRealWriteHelperNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const def of extractFunctionDefs(source)) {
    if (REAL_WRITE_CALL.test(def.bodyText)) names.add(def.name);
  }
  return names;
}

// ── 形状 B：作用域内真实写盘调用的量级求解 ───────────────────────────────────────

/** 从 `text[openParenIndex]==='('` 起做括号平衡提取，返回括号内文本（不含首尾括号）。 */
function extractBalancedArgs(text: string, openParenIndex: number): string | null {
  if (text[openParenIndex] !== '(') return null;
  let depth = 0;
  for (let i = openParenIndex; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(openParenIndex + 1, i);
    }
  }
  return null;
}

/** 按顶层逗号切参数（不切括号/花括号/方括号内部的逗号）。 */
function splitTopLevelArgs(argsText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < argsText.length; i += 1) {
    const ch = argsText[i];
    if (ch === '(' || ch === '{' || ch === '[') depth += 1;
    else if (ch === ')' || ch === '}' || ch === ']') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(argsText.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(argsText.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** 真实写盘调用一枚：直接 `writeFile(...)`（字节轴，量级取自 content 实参内的
 * `scanMagnitudeCalls`）或对某个已识别 real-write helper 的调用（计数轴，量级取实参里
 * 能解出的最大数值；一个数值都解不出按 unknown 处理）。 */
interface RealWriteCall {
  readonly axis: MagnitudeAxis;
  readonly resolved: number | null;
}

function scanRealWriteCalls(text: string, constants: ReadonlyMap<string, number>, helperNames: ReadonlySet<string>): RealWriteCall[] {
  const calls: RealWriteCall[] = [];
  const calleeNames = ['writeFile', ...helperNames];
  for (const name of calleeNames) {
    const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const openIdx = m.index + m[0].length - 1;
      const argsText = extractBalancedArgs(text, openIdx);
      if (argsText === null) continue;
      if (name === 'writeFile') {
        const magnitudes = scanMagnitudeCalls(argsText, constants);
        if (magnitudes.length === 0) {
          continue; // 内容是普通短字符串字面量，没有任何 repeat/数组构造——不进候选
        }
        const worst = magnitudes.reduce<RealWriteCall>(
          (acc, cur) => (cur.resolved === null || (acc.resolved !== null && cur.resolved > acc.resolved) ? { axis: cur.axis, resolved: cur.resolved } : acc),
          { axis: 'byte', resolved: 0 },
        );
        calls.push(worst);
      } else {
        const args = splitTopLevelArgs(argsText);
        const resolvedValues = args.map((a) => resolveExpr(a, constants)).filter((v): v is number => v !== null);
        if (resolvedValues.length === 0) {
          calls.push({ axis: 'count', resolved: null }); // 一个数值都解不出：unknown，fail-closed
        } else {
          calls.push({ axis: 'count', resolved: Math.max(...resolvedValues) });
        }
      }
    }
  }
  return calls;
}

export function hasHeavyRealWrite(text: string, constants: ReadonlyMap<string, number>, helperNames: ReadonlySet<string>): boolean {
  return scanRealWriteCalls(text, constants, helperNames).some((call) => {
    if (call.resolved === null) return true;
    const threshold = call.axis === 'byte' ? HEAVY_BYTE_THRESHOLD : HEAVY_COUNT_THRESHOLD;
    return call.resolved >= threshold;
  });
}

/** 已知读入口：本包 `run*(`（`run`/`runWith`/`runProduct`/`runDual`/…同一命名习惯）、
 * `.execute(`、`readFile(`、`readTextLines(`。 */
const READ_ENTRY_POINT = /\brun\w*\s*\(|\.execute\s*\(|\breadFile\s*\(|\breadTextLines\s*\(/;

export function touchesReadEntryPoint(text: string): boolean {
  return READ_ENTRY_POINT.test(text);
}

// ── 显式 timeout 判定 + 豁免登记表 ───────────────────────────────────────────────

export function hasExplicitTimeout(block: CallBlock): boolean {
  // 两种体例：多行三参数（末尾独立一行 `60_000,`）与单行合并（`}, 60_000);`）。
  if (/\},\s*[\d_]+\s*\)\s*;?\s*$/.test(block.text.trimEnd())) return true;
  const nonEmpty = block.text.split('\n').filter((l) => l.trim().length > 0);
  const last = nonEmpty[nonEmpty.length - 1] ?? '';
  const secondLast = nonEmpty[nonEmpty.length - 2] ?? '';
  if (/^\s*\);\s*$/.test(last) && /^\s*[\d_]+,?\s*$/.test(secondLast)) return true;
  return false;
}

/**
 * 文件级豁免——整份文件结构性不受本超时族约束，理由必须写在这里（不得写成扫描器代码里的
 * `basename === X` 分支，返修前的旧版正是这个形状，验收观察②）。
 */
const FILE_LEVEL_EXEMPTIONS: ReadonlyArray<{ readonly file: string; readonly reason: string }> = [
  {
    file: 'sidecar.test.ts',
    reason:
      '全仓唯一真发网络往返的测试（PI-LANE-SIDECAR-HANG-1 在案）。fail-fast 机制是请求级显式 ' +
      'AbortSignal.timeout(ROUND_TRIP_BUDGET_MS=2000)，不是 it() 级超时；该预算已比 vitest ' +
      '缺省 5000ms 更紧，先于缺省超时到达。PI-TIMEOUT-SWEEP-1 票面边界②：其红须独立归因，' +
      '不与超时族合并处置（见 SPEC §五）。',
  },
];

/** 结构匹配但本票逐条核定为「无需处置」的成员——每条必须带理由，新增须同批登记。
 * key 形态：`<basename>::<title>`。 */
const EXEMPT_WITHOUT_TIMEOUT: ReadonlyMap<string, string> = new Map([
  [
    'tools.test.ts::未触任一来源时诸字段都出空值，且不附注记',
    '自建独立 sandbox（仅 1 份小文件），不触达本 describe 的重 fixture（scan=2001/hits=250）。',
  ],
  [
    'tools.test.ts::grep 单文件内命中超限：行层判据同样置 matchesTruncated',
    '只触达 longFile（单文件 250 行 ≈2750 bytes，.repeat(250) 的 250 远低于字节阈值），非 ' +
      'scan(2001 份)/hits(250 份) 两枚真正的重 fixture。',
  ],
  [
    'tools.test.ts::read 归一后只调用一次原版 execute，且真读到内容',
    '真读，但目标是 起诉状.md（数十字节小文件），非本 describe beforeAll 写入的 超长行.md（184 KiB）。',
  ],
  [
    'tools.test.ts::read 接受 /case 绝对写法，与相对写法同结果',
    '同上，两次真读均针对 起诉状.md 小文件。',
  ],
  [
    'tools.test.ts::归一失败即拒，原版 execute 一次都不跑',
    '全部路径在 execute 前被拒，用例自身断言 binaryReads===0——按其判据本体，从未真正读过任何' +
      '文件内容，含 超长行.md。',
  ],
  [
    'tools.test.ts::glob 命中投影成 /case[/...]，且 details 与 dev 形态逐值相同',
    'glob 只做 readdir+路径匹配，不读文件内容字节，超长行.md 的行长度不影响其成本（结构性代价' +
      '差异见 PI-SCAN-TIMEOUT-1 回执）。',
  ],
  [
    'tools.test.ts::无参调用的 dev 形态逐字不变：read 是原版对象，命中仍是相对路径',
    '同上，只调用 glob，不读文件内容字节。',
  ],
  [
    'workspace-write-env.test.ts::单段恰好 255 bytes 与总长恰好 1024 bytes 均通过（边界不误杀）',
    '`.repeat(1024 - directories.length - 1 - 3)` 的实参含运行时字符串 `.length`，本门数值' +
      '求解器解不出（fail-closed 判为候选）。人工核实：`directories` 固定为 4×254 字符+3 个 ' +
      '`/` 分隔符=1019 字符，故该 repeat 实际次数恒为 `1024-1019-1-3=1`——目标是凑够 ' +
      'MAX_WORKSPACE_PATH_BYTES=1024 这一边界值本身，是边界探针不是重构造；单跑与本票全部' +
      '负载臂均未见红。',
  ],
]);

function isFileLevelExempt(file: string): { exempt: boolean; reason?: string } {
  const hit = FILE_LEVEL_EXEMPTIONS.find((e) => e.file === path.basename(file));
  return hit ? { exempt: true, reason: hit.reason } : { exempt: false };
}

export function isExempt(block: CallBlock): boolean {
  if (isFileLevelExempt(block.file).exempt) return true;
  const key = `${path.basename(block.file)}::${block.title}`;
  return EXEMPT_WITHOUT_TIMEOUT.has(key);
}

// ── 全量扫描：形状 A ∪ 形状 B ────────────────────────────────────────────────────

function listTestFiles(): string[] {
  return readdirSync(SRC_DIR)
    .filter((name) => name.endsWith('.test.ts') && name !== GUARD_FILE_BASENAME)
    .map((name) => path.join(SRC_DIR, name));
}

function scanFamilyA(): CallBlock[] {
  const out: CallBlock[] = [];
  for (const file of listTestFiles()) {
    const source = readFileSync(file, 'utf8');
    const constants = buildConstantsMap(file, source);
    for (const block of extractItBlocks(file, source)) {
      if (hasHeavyMagnitude(block.text, constants)) out.push(block);
    }
  }
  return out;
}

function scanFamilyB(): CallBlock[] {
  const out: CallBlock[] = [];
  for (const file of listTestFiles()) {
    const source = readFileSync(file, 'utf8');
    const constants = buildConstantsMap(file, source);
    const helperNames = findRealWriteHelperNames(source);

    // 文件级（不在任何 describe 内）的 beforeAll/beforeEach：取「文件开头到首个 describe」
    // 这一段作为文件级 setup 的搜索范围（本仓体例：文件级 hook 一律先于首个 describe）。
    const firstDescribeIdx = source.search(/^describe\(/m);
    const preamble = firstDescribeIdx === -1 ? source : source.slice(0, firstDescribeIdx);
    const fileSetups = extractSetupBlocks(file, preamble);
    const fileSetupText = fileSetups.map((s) => s.text).join('\n');
    const fileLevelHeavy = fileSetupText.length > 0 && hasHeavyRealWrite(fileSetupText, constants, helperNames);
    if (fileLevelHeavy) {
      for (const block of extractItBlocks(file, source)) {
        if (touchesReadEntryPoint(block.text)) out.push(block);
      }
    }

    // describe 作用域的 beforeAll/beforeEach。
    for (const d of extractDescribeBlocks(file, source)) {
      const setups = extractSetupBlocks(file, d.text);
      const setupText = setups.map((s) => s.text).join('\n');
      if (setupText.length === 0) continue;
      if (!hasHeavyRealWrite(setupText, constants, helperNames)) continue;
      for (const block of extractItBlocks(file, d.text)) {
        if (touchesReadEntryPoint(block.text)) out.push(block);
      }
    }
  }
  return out;
}

export function allHeavyCandidates(): CallBlock[] {
  const seen = new Set<string>();
  const merged: CallBlock[] = [];
  for (const block of [...scanFamilyA(), ...scanFamilyB()]) {
    const key = `${path.basename(block.file)}::${block.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(block);
  }
  return merged;
}

// ── 检测器自证（born-red 能力） ──────────────────────────────────────────────────

describe('检测器自证：数值量级轴（验收 REJECT `1c1c181` 拒因对应治理）', () => {
  it('等价注入双命中：MAX_ 具名常量与同值数字字面量必须同时被判为候选（验收 §3.1 复现装置）', () => {
    const constants = new Map([['MAX_PROBE_BYTES', 131_072]]);
    const named: CallBlock = {
      file: 'probe.test.ts',
      title: '注入A',
      startLine: 1,
      text: "it('注入A', () => { const big = 'a'.repeat(MAX_PROBE_BYTES); });",
    };
    const literal: CallBlock = {
      file: 'probe.test.ts',
      title: '注入B',
      startLine: 1,
      text: "it('注入B', () => { const big = 'a'.repeat(131_072); });",
    };
    expect(hasHeavyMagnitude(named.text, constants)).toBe(true);
    expect(hasHeavyMagnitude(literal.text, new Map())).toBe(true);
  });

  it('数值量级低于阈值即不判族（边界探针场景不误伤）', () => {
    const cheap: CallBlock = {
      file: 'probe.test.ts',
      title: '边界探针',
      startLine: 1,
      text: "it('边界探针', () => { const s = 'a'.repeat(4097); });",
    };
    expect(hasHeavyMagnitude(cheap.text, new Map())).toBe(false);
  });

  it('求解不出的实参一律判族（fail-closed：unknown ≠ 安全）', () => {
    const unresolvable: CallBlock = {
      file: 'probe.test.ts',
      title: '不可解',
      startLine: 1,
      text: "it('不可解', () => { const s = 'a'.repeat(runtimeVar.length); });",
    };
    expect(hasHeavyMagnitude(unresolvable.text, new Map())).toBe(true);
  });

  it('简单算式（含常量的加减乘除）可解', () => {
    const constants = new Map([['MAX_TEXT_BYTES', 131_072]]);
    expect(resolveExpr('MAX_TEXT_BYTES / 4', constants)).toBe(32_768);
    expect(resolveExpr('60 * 1024', new Map())).toBe(61_440);
    expect(resolveExpr('MAX_TEXT_BYTES + 1', constants)).toBe(131_073);
  });

  it('真实写盘 helper 探测不钉具名拼写：任意函数体含 writeFile/mkdir/symlink 即算数', () => {
    const source = [
      "import { writeFile } from 'node:fs/promises';",
      'async function totallyDifferentName(dir: string, n: number) {',
      '  for (let i = 0; i < n; i += 1) { await writeFile(dir, String(i)); }',
      '}',
    ].join('\n');
    expect(findRealWriteHelperNames(source).has('totallyDifferentName')).toBe(true);
  });

  it('真实写盘 helper 调用的量级由实参数值求解，不是「叫这个名字就算数」', () => {
    const helperNames = new Set(['makeFiles']);
    const heavy = "beforeAll(async () => { await makeFiles(dir, 2001); });";
    const cheap = "beforeAll(async () => { await makeFiles(dir, 3); });";
    expect(hasHeavyRealWrite(heavy, new Map(), helperNames)).toBe(true);
    expect(hasHeavyRealWrite(cheap, new Map(), helperNames)).toBe(false);
  });

  it('提取器：真实文件里已处置的 raw cap 用例确被识别为候选且判定已达标', () => {
    const file = path.join(SRC_DIR, 'product-protocol.test.ts');
    const source = readFileSync(file, 'utf8');
    const constants = buildConstantsMap(file, source);
    const blocks = extractItBlocks(file, source);
    const target = blocks.find((b) => b.title === 'raw cap 内的最坏编码膨胀仍在 framing 内：C0 / 引号 / 反斜杠 / 多字节');
    expect(target).toBeDefined();
    expect(hasHeavyMagnitude(target!.text, constants)).toBe(true);
    expect(hasExplicitTimeout(target!)).toBe(true);
  });

  it('M1/M2/M3（验收 REJECT `1c1c181`）现均被判为候选且已达标', () => {
    const cases: { file: string; title: string }[] = [
      { file: 'tools.test.ts', title: 'grep 命中投影成 /case[/...]，行号与 details 不变' },
      { file: 'workspace-write-env.test.ts', title: '按 UTF-8 实长而非 UTF-16 长度计量：32768 个四字节 emoji 恰好压线' },
      { file: 'product-stdio.test.ts', title: '分片到达可拼行；一行超 framing 立即 packet_too_large' },
    ];
    const all = allHeavyCandidates();
    for (const { file, title } of cases) {
      const found = all.find((b) => path.basename(b.file) === file && b.title === title);
      expect(found, `${file}::${title} 应在候选集里`).toBeDefined();
      expect(hasExplicitTimeout(found!), `${file}::${title} 应已有显式 timeout`).toBe(true);
    }
  });
});

// ── 全量候选普查 ────────────────────────────────────────────────────────────────

describe('本包 it() 全量候选普查', () => {
  it('候选族成员必须有显式 timeout：结构匹配但未登记豁免且无 timeout 的一律判红', () => {
    const heavy = allHeavyCandidates();
    expect(heavy.length).toBeGreaterThan(0); // 反哨兵：扫描器若失效（提取不到块），下面的空集断言会假绿

    const violations = heavy.filter((b) => !isExempt(b) && !hasExplicitTimeout(b));
    if (violations.length > 0) {
      const detail = violations.map((b) => `${path.basename(b.file)}:${b.startLine} 「${b.title}」`).join('\n');
      throw new Error(
        `发现 ${violations.length} 枚候选族成员缺显式 timeout（判据本体数值量级达阈值，或量级无法` +
          `静态求解）：\n${detail}\n` +
          '处置：按 PI-SCAN-TIMEOUT-1/2 与 PI-TIMEOUT-SWEEP-1 范式加显式超时上界；若判定确实不需要，' +
          '须先在本文件 EXEMPT_WITHOUT_TIMEOUT／FILE_LEVEL_EXEMPTIONS 登记并写明理由，不得让门' +
          '静默放行。',
      );
    }
  });

  it('EXEMPT_WITHOUT_TIMEOUT 零陈旧登记：表内每条须仍能在扫描结果里找到对应候选', () => {
    const heavyKeys = new Set(allHeavyCandidates().map((b) => `${path.basename(b.file)}::${b.title}`));
    const stale = [...EXEMPT_WITHOUT_TIMEOUT.keys()].filter((key) => !heavyKeys.has(key));
    expect(stale, `陈旧登记（候选已不存在或已改名，应清理）：${stale.join('；')}`).toEqual([]);
  });

  it('FILE_LEVEL_EXEMPTIONS 零陈旧登记：登记的文件须真实存在于本包测试目录', () => {
    const files = new Set(readdirSync(SRC_DIR).filter((n) => n.endsWith('.test.ts')));
    const stale = FILE_LEVEL_EXEMPTIONS.filter((e) => !files.has(e.file));
    expect(stale, `陈旧登记（文件已不存在或已改名）：${stale.map((e) => e.file).join('；')}`).toEqual([]);
  });

  it('每条豁免登记必须带非空理由（不得只登记 key，理由留白）', () => {
    for (const [key, reason] of EXEMPT_WITHOUT_TIMEOUT) {
      expect(reason.trim().length, `${key} 的理由为空`).toBeGreaterThan(0);
    }
    for (const entry of FILE_LEVEL_EXEMPTIONS) {
      expect(entry.reason.trim().length, `${entry.file} 的理由为空`).toBeGreaterThan(0);
    }
  });
});
