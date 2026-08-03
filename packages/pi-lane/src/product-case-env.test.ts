import { mkdtemp, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { createAuthorizedRoot } from './authorized-root.js';
import { CASE_LOGICAL_ROOT, createProductCaseEnv, normalizeCasePath } from './product-case-env.js';
import { createReadOnlyScopedEnv } from './scoped-env.js';

/**
 * `/case` 只读容器（PI-HOST-LOOP-1 §二.1、§四.2）。
 *
 * 施工序留档：本文件的 first-red 是下面「dev scoped env 是反例」那一组的**产品口径版本**——
 * 在 `product-case-env.ts` 落地前，那三条断言直接指向现行 `createReadOnlyScopedEnv`，
 * 分别红在 `scoped-env.ts:88`（`cwd: authorized.root`）、`scoped-env.ts:77`
 * （`statOf` 的 `path: absolute`）与 `authorized-root.ts:65`（拒绝理由回显授权根）。
 * 收紧后那三条改为对产品 env 断言，dev 那份则以**反例**形态永久留在本文件里：
 * 它仍然泄漏物理路径，正因如此它不能被转售给模型。
 */

let caseRoot: string;
let outside: string;
let env: ReturnType<typeof createProductCaseEnv>;

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) throw new Error(`期待成功，实得失败：${JSON.stringify(result.error)}`);
  return result.value;
};

const denial = (result: { ok: true } | { ok: false; error: { code: string; message: string; path?: string } }) => {
  if (result.ok) throw new Error('期待拒绝，实得成功');
  return result.error;
};

beforeAll(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-host-case-env-')));
  caseRoot = path.join(sandbox, '案卷');
  outside = path.join(sandbox, '界外');
  await mkdir(caseRoot);
  await mkdir(outside);
  await mkdir(path.join(caseRoot, '证据'));
  await writeFile(path.join(caseRoot, '备忘.md'), '# 备忘\n合同编号 HT-2024-081\n');
  await writeFile(path.join(caseRoot, '证据', '照片说明.md'), '正面\n背面\n');
  await writeFile(path.join(outside, '机密.md'), '不该被读到\n');
  await symlink(path.join(outside, '机密.md'), path.join(caseRoot, '外链.md'));
  await symlink(outside, path.join(caseRoot, '外链夹'));
  // 同前缀兄弟目录：`/case` 的包含判定必须带分隔符，否则 `案卷-外` 会被当成界内。
  await mkdir(`${caseRoot}-外`);
  await writeFile(path.join(`${caseRoot}-外`, '旁证.md'), '旁证\n');

  env = createProductCaseEnv({ caseRoot });
});

describe('cwd 与命中只出现逻辑根', () => {
  it('cwd 恰为 /case', () => {
    expect(env.cwd).toBe(CASE_LOGICAL_ROOT);
  });

  it('absolutePath 把相对路径归一成 /case[/...]', async () => {
    expect(unwrap(await env.absolutePath('备忘.md'))).toBe('/case/备忘.md');
    expect(unwrap(await env.absolutePath('./证据/照片说明.md'))).toBe('/case/证据/照片说明.md');
    expect(unwrap(await env.absolutePath('.'))).toBe('/case');
    expect(unwrap(await env.absolutePath('/case'))).toBe('/case');
    expect(unwrap(await env.absolutePath('/case/备忘.md'))).toBe('/case/备忘.md');
  });

  it('FileInfo 的 path/name 只出现逻辑坐标', async () => {
    const info = unwrap(await env.fileInfo('备忘.md'));
    expect(info.path).toBe('/case/备忘.md');
    expect(info.name).toBe('备忘.md');
    expect(info.kind).toBe('file');
  });

  it('listDir 的每一条命中都是 /case[/...]', async () => {
    const entries = unwrap(await env.listDir('.'));
    expect(entries.map((entry) => entry.path).sort()).toEqual(
      ['/case/备忘.md', '/case/外链.md', '/case/外链夹', '/case/证据'].sort(),
    );
    expect(JSON.stringify(entries)).not.toContain(caseRoot);
  });

  it('canonicalPath 不做 realpath——它会把物理真相带回来', async () => {
    expect(unwrap(await env.canonicalPath('证据'))).toBe('/case/证据');
  });

  it('读到的内容是真文件内容（虚拟化不等于读不到）', async () => {
    expect(unwrap(await env.readTextFile('备忘.md'))).toContain('HT-2024-081');
    expect(unwrap(await env.readTextLines('证据/照片说明.md'))).toEqual(['正面', '背面']);
    expect(unwrap(await env.readBinaryFile('备忘.md')).byteLength).toBeGreaterThan(0);
    expect(unwrap(await env.exists('备忘.md'))).toBe(true);
    expect(unwrap(await env.exists('不存在.md'))).toBe(false);
  });
});

describe('path grammar 的拒面（纯函数逐条）', () => {
  const rejected: [string, string][] = [
    ['其他绝对根', '/workspace/记录.md'],
    ['系统绝对路径', '/etc/passwd'],
    ['同前缀兄弟', '/casex/旁证.md'],
    ['同前缀兄弟二', '/case-外/旁证.md'],
    ['双斜杠根', '//case/备忘.md'],
    ['父级跳出', '../界外/机密.md'],
    ['中段父级', '证据/../../界外/机密.md'],
    ['逻辑根下父级', '/case/../机密.md'],
    ['空段', '证据//照片说明.md'],
    ['尾部空段', '/case/证据/'],
    ['反斜杠', '证据\\照片说明.md'],
    ['UNC', '\\\\服务器\\共享\\机密.md'],
    ['drive 反斜杠', 'C:\\案卷\\机密.md'],
    ['drive 正斜杠', 'C:/案卷/机密.md'],
    ['NUL 控制字', '备忘\u0000.md'],
    ['低位控制字', '备忘\u0001.md'],
    ['DEL 控制字', '备忘\u007f.md'],
    ['保留名', 'CON'],
    ['带扩展的保留名', 'nul.md'],
    ['编号保留名', '证据/COM1.txt'],
    ['空串', ''],
  ];

  it.each(rejected)('拒 %s', (_label, input) => {
    const result = normalizeCasePath(input);
    expect(result.ok).toBe(false);
  });

  const accepted: [string, string, string][] = [
    ['Unicode 段', '证据/照片说明.md', '/case/证据/照片说明.md'],
    ['emoji 段', '📎附件/说明.md', '/case/📎附件/说明.md'],
    ['单点自身', '.', '/case'],
    ['前导单点', './备忘.md', '/case/备忘.md'],
    ['中段单点', '证据/./照片说明.md', '/case/证据/照片说明.md'],
    ['逻辑根', '/case', '/case'],
    ['保留名的前缀不是保留名', 'console.md', '/case/console.md'],
    ['编号越界不是保留名', 'COM0.txt', '/case/COM0.txt'],
  ];

  it.each(accepted)('收 %s', (_label, input, expected) => {
    const result = normalizeCasePath(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.logical).toBe(expected);
  });

  it('段 255 字节是正例，256 字节即拒', () => {
    const at255 = 'a'.repeat(255);
    expect(normalizeCasePath(at255).ok).toBe(true);
    expect(normalizeCasePath(`${at255}a`).ok).toBe(false);
    // Unicode 按字节而非按 code unit 计：85 枚三字节汉字恰 255 字节。
    const cjk255 = '案'.repeat(85);
    expect(utf8Bytes(cjk255)).toBe(255);
    expect(normalizeCasePath(cjk255).ok).toBe(true);
    expect(normalizeCasePath(`${cjk255}案`).ok).toBe(false);
  });

  it('逻辑总长 1024 字节是正例，1025 字节即拒', () => {
    // `/case/` 是 6 字节；四段 254 + 三枚分隔符 = 1019，合计 1025 → 拒；缩一字节 → 收。
    const segment = 'b'.repeat(254);
    const overflow = `${segment}/${segment}/${segment}/${segment}`;
    expect(utf8Bytes(`/case/${overflow}`)).toBe(1025);
    expect(normalizeCasePath(overflow).ok).toBe(false);
    const fitting = `${segment}/${segment}/${segment}/${'b'.repeat(253)}`;
    expect(utf8Bytes(`/case/${fitting}`)).toBe(1024);
    expect(normalizeCasePath(fitting).ok).toBe(true);
  });
});

const utf8Bytes = (value: string) => Buffer.byteLength(value, 'utf8');

describe('symlink / reparse traversal 一律拒', () => {
  it('末段是 symlink 时拒读', async () => {
    const error = denial(await env.readTextFile('外链.md'));
    expect(error.code).toBe('permission_denied');
    expect(error.message).toContain('符号链接');
  });

  it('中段是 symlink 时拒读', async () => {
    const error = denial(await env.readTextFile('外链夹/机密.md'));
    expect(error.code).toBe('permission_denied');
  });

  it('symlink 也拒 exists / fileInfo / listDir', async () => {
    expect(denial(await env.exists('外链.md')).code).toBe('permission_denied');
    expect(denial(await env.fileInfo('外链夹/机密.md')).code).toBe('permission_denied');
    expect(denial(await env.listDir('外链夹')).code).toBe('permission_denied');
  });
});

describe('物理根不出现在任何可观察面', () => {
  it('拒绝理由与 error.path 都只出现逻辑坐标', async () => {
    for (const input of ['/workspace/记录.md', '../界外/机密.md', '外链.md', 'C:\\案卷\\机密.md']) {
      const error = denial(await env.readTextFile(input));
      expect(`${error.message}${error.path ?? ''}`).not.toContain(caseRoot);
      expect(`${error.message}${error.path ?? ''}`).not.toContain(path.dirname(caseRoot));
    }
  });

  it('缺失文件的 not_found 也不回显物理路径', async () => {
    const error = denial(await env.readTextFile('不存在.md'));
    expect(error.code).toBe('not_found');
    expect(error.path).toBe('/case/不存在.md');
    expect(error.message).not.toContain(caseRoot);
  });

  it('env 对象自身不持有物理根（序列化面为零）', () => {
    const serialized = JSON.stringify(env, (_key, value) => (typeof value === 'function' ? '[fn]' : value));
    expect(serialized).not.toContain(caseRoot);
    expect(Object.values(env).filter((value) => typeof value === 'string')).toEqual([CASE_LOGICAL_ROOT]);
  });
});

describe('写面与 shell 面在本容器里根本不存在', () => {
  it('写四件全部 not_supported，且 target 是逻辑路径', async () => {
    for (const call of [
      env.writeFile('备忘.md', 'x'),
      env.appendFile('备忘.md', 'x'),
      env.createDir('新建'),
      env.remove('备忘.md'),
    ]) {
      const error = denial(await call);
      expect(error.code).toBe('not_supported');
      expect(error.path).toMatch(/^\/case/);
    }
    expect(denial(await env.createTempDir()).code).toBe('not_supported');
    expect(denial(await env.createTempFile()).code).toBe('not_supported');
  });

  it('exec 一律 shell_unavailable', async () => {
    const result = await env.exec('ls');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.error as { code: string }).code).toBe('shell_unavailable');
  });
});

/**
 * PI-HOST-LOOP-1R N1（首轮验收 `314117d` 的 Node 反例一，转为常驻）。
 *
 * 冻结件 §二.1 要求 `FileInfo.path`、工具结果与安全错误只出现 `/case` 或 `/case/...`。
 * 首轮实现把**非法输入原文**存进了 `FileError.path`，于是把真实案件根本身当 read 参数时，
 * 整个错误对象可序列化出物理路径。合法输入只以归一化逻辑路径出现，非法输入一律占位符。
 */
const ILLEGAL_PATH_PLACEHOLDER = '（非法路径）';

/** 把错误对象的**全部**自有字段（含 message/path/name/stack/cause）摊成一段可扫描文本。 */
const serializeWholeError = (error: unknown): string => {
  if (typeof error !== 'object' || error === null) return String(error);
  const own: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(error)) {
    own[key] = (error as Record<string, unknown>)[key];
  }
  return JSON.stringify(own);
};

describe('非法输入零回显（N1）', () => {
  it('canary：真实 caseRoot 本身作 read 参数，整个错误对象序列化后零物理字节', async () => {
    const error = denial(await env.readTextFile(caseRoot));
    const whole = serializeWholeError(error);
    expect(whole).not.toContain(caseRoot);
    expect(whole).not.toContain(path.basename(caseRoot));
    expect(error.path).toBe(ILLEGAL_PATH_PLACEHOLDER);
  });

  it('九类非法输入的 path 与 message 都不含输入原文，只给固定占位符', async () => {
    const illegal = [
      caseRoot,
      `${caseRoot}/备忘.md`,
      '/workspace/记录.md',
      '/etc/passwd',
      '../界外/机密.md',
      'C:\\案卷\\机密.md',
      '\\\\server\\share\\机密.md',
      `${caseRoot}-外/旁证.md`,
      'con.md',
    ];
    for (const input of illegal) {
      const error = denial(await env.readTextFile(input));
      const whole = serializeWholeError(error);
      expect(whole, `输入 ${input} 的错误对象回显了原文`).not.toContain(input);
      expect(error.path, `输入 ${input} 的 path 不是占位符`).toBe(ILLEGAL_PATH_PLACEHOLDER);
    }
  });

  it('对照：合法输入仍以归一化逻辑路径出现，占位符不外溢', async () => {
    const missing = denial(await env.readTextFile('证据/不存在.md'));
    expect(missing.path).toBe('/case/证据/不存在.md');
    const info = unwrap(await env.fileInfo('备忘.md'));
    expect(info.path).toBe('/case/备忘.md');
  });

  it('写面拒绝与 joinPath 的非法入参同样只给占位符', async () => {
    expect(denial(await env.writeFile('/workspace/记录.md', 'x')).path).toBe(ILLEGAL_PATH_PLACEHOLDER);
    const joined = denial(await env.joinPath([caseRoot, '备忘.md']));
    expect(serializeWholeError(joined)).not.toContain(caseRoot);
    expect(joined.path).toBe(ILLEGAL_PATH_PLACEHOLDER);
  });
});

describe('dev scoped env 是反例，不得被转售给模型', () => {
  it('它的 cwd/FileInfo/拒绝理由仍然是物理路径——这正是产品 env 存在的理由', async () => {
    const devEnv = createReadOnlyScopedEnv(await createAuthorizedRoot(caseRoot));
    expect(devEnv.cwd).toBe(caseRoot);
    expect(unwrap(await devEnv.fileInfo('备忘.md')).path).toBe(path.join(caseRoot, '备忘.md'));
    const denied = denial(await devEnv.readTextFile('../界外/机密.md'));
    expect(denied.message).toContain(caseRoot);
  });
});
