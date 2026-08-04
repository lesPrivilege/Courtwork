import { chmod, mkdtemp, mkdir, readFile, readdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createAuthorizedRoot } from './authorized-root.js';
import { createProductCaseEnv } from './product-case-env.js';
import { createReadOnlyScopedEnv } from './scoped-env.js';
import { createReadOnlyTools } from './tools.js';
import { createReadTool, type AgentHarnessTool, type ExecutionToolContext } from '@earendil-works/pi-agent-core';

/**
 * 只读工具面。三件工具全部经容器取文件系统，故越界判定不在工具里重写一遍——
 * 工具里若出现第二份边界逻辑，就会有第二处可以漂移的真源。
 */

let root: string;
let outside: string;
let context: ExecutionToolContext;
let tools: AgentHarnessTool<ExecutionToolContext>[];

const toolNamed = (name: string) => {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`工具 ${name} 未装配`);
  return tool;
};

const run = (name: string, params: unknown) =>
  toolNamed(name).execute('call-1', params as never, undefined, undefined, context);

/** 同一批 dev 形态工具跑在**另一个**容器上——工具无状态，换的只是 env。 */
const runWith = (target: ExecutionToolContext, name: string, params: unknown) =>
  toolNamed(name).execute('call-1', params as never, undefined, undefined, target);

const textOf = (result: { content: { type: string }[] }) =>
  result.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

beforeAll(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-lane-tools-')));
  root = path.join(sandbox, '案卷');
  outside = path.join(sandbox, '界外');
  await mkdir(root);
  await mkdir(outside);
  await mkdir(path.join(root, '证据'));
  await writeFile(path.join(root, '起诉状.md'), '# 起诉状\n合同编号 HT-2024-081\n');
  await writeFile(path.join(root, '笔记.txt'), '合同编号也出现在这里\n');
  await writeFile(path.join(root, '证据', '合同.md'), '# 合同\n合同编号 HT-2024-081\n签署地 临江\n');
  await writeFile(path.join(outside, '机密.md'), '合同编号 HT-9999-999\n');
  await symlink(outside, path.join(root, '外链'));
  context = { env: createReadOnlyScopedEnv(await createAuthorizedRoot(root)) };
  tools = createReadOnlyTools();
});

describe('工具装配', () => {
  it('绿证一：恰好装配只读三件，不多不少', () => {
    expect(tools.map((tool) => tool.name).sort()).toEqual(['glob', 'grep', 'read']);
  });

  it('绿证二：每件工具都有面向模型的描述与 schema', () => {
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters).toBeTruthy();
    }
  });
});

describe('read（pi 原版工具跑在我方容器上）', () => {
  it('绿证三：界内文件可读', async () => {
    const result = await run('read', { path: '起诉状.md' });
    expect(textOf(result)).toContain('HT-2024-081');
  });

  it('红证一：界外文件读取失败（pi 工具契约是抛，不是返回错误内容）', async () => {
    await expect(run('read', { path: path.join(outside, '机密.md') })).rejects.toThrow();
  });

  it('红证二：经 symlink 出界同样失败', async () => {
    await expect(run('read', { path: '外链/机密.md' })).rejects.toThrow();
  });
});

describe('glob', () => {
  it('绿证四：`**/*.md` 递归命中界内 md，且不含非 md', async () => {
    const listed = textOf(await run('glob', { pattern: '**/*.md' }));
    expect(listed).toContain('起诉状.md');
    expect(listed).toContain(path.join('证据', '合同.md'));
    expect(listed).not.toContain('笔记.txt');
  });

  it('绿证五：`*.md` 只匹配顶层，不下钻', async () => {
    const listed = textOf(await run('glob', { pattern: '*.md' }));
    expect(listed).toContain('起诉状.md');
    expect(listed).not.toContain('合同.md');
  });

  it('红证三：界外的 path 参数被拒且理由可见', async () => {
    const result = await run('glob', { pattern: '*.md', path: outside });
    expect(textOf(result)).toContain('授权文件夹外');
  });

  it('红证四：symlink 出界的子树不被列入结果', async () => {
    const listed = textOf(await run('glob', { pattern: '**/*.md' }));
    expect(listed).not.toContain('机密.md');
  });
});

describe('grep', () => {
  it('绿证六：命中行带文件与行号', async () => {
    const hits = textOf(await run('grep', { pattern: 'HT-2024-081' }));
    expect(hits).toContain('起诉状.md:2');
    expect(hits).toContain(`${path.join('证据', '合同.md')}:2`);
  });

  it('绿证七：无命中时显式说明，不是空字符串', async () => {
    const hits = textOf(await run('grep', { pattern: '并不存在的词' }));
    expect(hits).toContain('无命中');
  });

  it('红证五：界外内容永不出现在命中里', async () => {
    const hits = textOf(await run('grep', { pattern: 'HT-9999-999' }));
    expect(hits).not.toContain('机密.md');
    expect(hits).toContain('无命中');
  });

  it('红证六：非法正则显式报错，不静默当作字面量', async () => {
    const hits = textOf(await run('grep', { pattern: '([' }));
    expect(hits).toContain('正则');
  });
});

/**
 * `/case` 逻辑根形态（PI-HOST-LOOP-1 §二.1）。
 *
 * 观察点刻意选在 env 上：`readBinaryFile` 的调用次数就是「原版 read execute 跑了几次」的
 * 直接证据——撤掉 binder（次数不变但命中变回相对）、双调 upstream（次数变 2）与
 * 拒绝时仍然下探（次数从 0 变 1）三种改法各自触红，互不遮蔽。
 */
describe('createReadOnlyTools({ logicalRoot: "/case" })', () => {
  let productContext: ExecutionToolContext;
  let productTools: AgentHarnessTool<ExecutionToolContext>[];
  let binaryReads: number;

  const runProduct = (name: string, params: unknown) => {
    const tool = productTools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`工具 ${name} 未装配`);
    return tool.execute('call-1', params as never, undefined, undefined, productContext);
  };

  beforeAll(async () => {
    const caseEnv = createProductCaseEnv({ caseRoot: root });
    productContext = {
      env: {
        ...caseEnv,
        readBinaryFile: (input: string, signal?: AbortSignal) => {
          binaryReads += 1;
          return caseEnv.readBinaryFile(input, signal);
        },
      } as ExecutionToolContext['env'],
    };
    productTools = createReadOnlyTools({ logicalRoot: '/case' });
    await writeFile(path.join(root, '超长行.md'), `${'甲'.repeat(60 * 1024)}\n`);
  });

  beforeEach(() => {
    binaryReads = 0;
  });

  it('装配面与 dev 形态同名同数', () => {
    expect(productTools.map((tool) => tool.name).sort()).toEqual(['glob', 'grep', 'read']);
  });

  it('read 保持上游 name/label/description 与**同一枚** parameters 对象', () => {
    const upstream = createReadTool();
    const bound = productTools.find((tool) => tool.name === 'read');
    expect(bound?.name).toBe(upstream.name);
    expect(bound?.label).toBe(upstream.label);
    expect(bound?.description).toBe(upstream.description);
    expect(bound?.parameters).toBe(upstream.parameters);
  });

  it('glob/grep 的 schema 与 dev 形态是同一枚对象', () => {
    const dev = createReadOnlyTools();
    for (const name of ['glob', 'grep']) {
      expect(productTools.find((tool) => tool.name === name)?.parameters).toBe(
        dev.find((tool) => tool.name === name)?.parameters,
      );
    }
  });

  it('read 归一后只调用一次原版 execute，且真读到内容', async () => {
    const result = await runProduct('read', { path: '起诉状.md' });
    expect(textOf(result)).toContain('HT-2024-081');
    expect(binaryReads).toBe(1);
  });

  it('read 接受 /case 绝对写法，与相对写法同结果', async () => {
    const absolute = textOf(await runProduct('read', { path: '/case/起诉状.md' }));
    binaryReads = 0;
    const relative = textOf(await runProduct('read', { path: '起诉状.md' }));
    expect(absolute).toBe(relative);
    expect(binaryReads).toBe(1);
  });

  it('上游截断提示里的 path 也只能是逻辑绝对路径', async () => {
    const hint = textOf(await runProduct('read', { path: '超长行.md' }));
    expect(hint).toContain('/case/超长行.md');
    expect(hint).not.toContain(root);
  });

  it('归一失败即拒，原版 execute 一次都不跑', async () => {
    for (const denied of ['/workspace/记录.md', '../界外/机密.md', '外链/机密.md']) {
      const result = await runProduct('read', { path: denied });
      expect((result as { details: { denied?: boolean } }).details.denied).toBe(true);
      expect(textOf(result)).not.toContain(root);
    }
    expect(binaryReads).toBe(0);
  });

  it('glob 命中投影成 /case[/...]，且 details 与 dev 形态逐值相同', async () => {
    const product = (await runProduct('glob', { pattern: '**/*.md' })) as {
      details: Record<string, unknown>;
    };
    const dev = (await run('glob', { pattern: '**/*.md' })) as { details: Record<string, unknown> };
    const listed = textOf(product as never);
    expect(listed).toContain('/case/起诉状.md');
    expect(listed).toContain('/case/证据/合同.md');
    expect(listed).not.toContain('\n证据/合同.md');
    expect(product.details).toEqual(dev.details);
  });

  it('grep 命中投影成 /case[/...]，行号与 details 不变', async () => {
    const product = (await runProduct('grep', { pattern: 'HT-2024-081' })) as {
      details: Record<string, unknown>;
    };
    const dev = (await run('grep', { pattern: 'HT-2024-081' })) as { details: Record<string, unknown> };
    const hits = textOf(product as never);
    expect(hits).toContain('/case/起诉状.md:2');
    expect(hits).toContain('/case/证据/合同.md:2');
    expect(product.details).toEqual(dev.details);
  });

  it('symlink 子树在 glob/grep 里同样不出现', async () => {
    expect(textOf(await runProduct('glob', { pattern: '**/*.md' }))).not.toContain('机密.md');
    expect(textOf(await runProduct('grep', { pattern: 'HT-9999-999' }))).toContain('无命中');
  });

  it('无参调用的 dev 形态逐字不变：read 是原版对象，命中仍是相对路径', async () => {
    const dev = createReadOnlyTools();
    const devRead = dev.find((tool) => tool.name === 'read');
    const upstream = createReadTool();
    expect(devRead?.parameters).toBe(upstream.parameters);
    const listed = textOf(await run('glob', { pattern: '*.md' }));
    expect(listed).toContain('起诉状.md');
    expect(listed).not.toContain('/case/');
  });
});

/**
 * 结果的不完整性必须**分因**可见（`PI-TOOLS-HONESTY-1`；不变量四）。
 *
 * 三条互不遮蔽的轴，缺一条模型就只能猜：
 * 1. `truncated`——「还有文件没看」（扫描上限）；
 * 2. `matchesTruncated`——「看到的命中没全列」（命中上限）。与 1 合成一个布尔，模型
 *    就无从判断该换更窄的模式还是该换起始目录；
 * 3. `skipped`——「有子树或文件被容器拒读」。它与「真无命中」必须可分辨，否则一次
 *    permission_denied 就变成一句自信的「没有这份材料」。
 *
 * 三者都同时出 `details`（给宿主与账）与结果文本（给模型）：只出其一等于让另一侧漂移。
 */

const detailsOf = (result: unknown): Record<string, unknown> =>
  (result as { details: Record<string, unknown> }).details;

const skippedOf = (result: unknown): { path: string; code: string }[] =>
  detailsOf(result).skipped as { path: string; code: string }[];

/** 分批写，免得一次开 2001 个描述符撞 EMFILE。 */
async function createFiles(
  directory: string,
  count: number,
  nameOf: (index: number) => string,
  content: string,
): Promise<void> {
  for (let start = 0; start < count; start += 50) {
    const size = Math.min(50, count - start);
    await Promise.all(
      Array.from({ length: size }, (_, offset) =>
        writeFile(path.join(directory, nameOf(start + offset)), content),
      ),
    );
  }
}

async function sandbox(
  label: string,
  build: (directory: string) => Promise<void>,
): Promise<{ root: string; context: ExecutionToolContext }> {
  const created = await realpath(await mkdtemp(path.join(tmpdir(), `pi-lane-${label}-`)));
  await build(created);
  return {
    root: created,
    context: { env: createReadOnlyScopedEnv(await createAuthorizedRoot(created)) },
  };
}

describe('单次调用上限：扫描与命中是两类，各自出字段与注记', () => {
  let hits: ExecutionToolContext;
  let scan: ExecutionToolContext;
  let longFile: ExecutionToolContext;

  beforeAll(async () => {
    ({ context: hits } = await sandbox('tools-hits', async (directory) => {
      await createFiles(directory, 250, (index) => `材料-${index}.md`, '合同编号 HT-2024-081\n');
    }));
    ({ context: longFile } = await sandbox('tools-longfile', async (directory) => {
      await writeFile(path.join(directory, '长文.md'), '合同编号 HT-2024-081\n'.repeat(250));
    }));
    ({ context: scan } = await sandbox('tools-scan', async (directory) => {
      await createFiles(directory, 2001, (index) => `其他-${index}.txt`, '与检索无关的一行\n');
    }));
  }, 120_000);

  /**
   * 「无注记即完整」的正面语料**必须选一棵真正完整的树**：主 fixture 里有一条 symlink，
   * 那棵树本来就不完整（1R 拒因的二次证伪之一），拿它来证「无注记」等于自证前提。
   */
  it('未触任一来源时诸字段都出空值，且不附注记', async () => {
    const clean = await sandbox('tools-clean', async (directory) => {
      await writeFile(path.join(directory, '起诉状.md'), '合同编号 HT-2024-081\n');
    });
    const result = await runWith(clean.context, 'glob', { pattern: '**/*.md' });
    expect(detailsOf(result)).toMatchObject({
      truncated: false,
      matchesTruncated: false,
      symlinksSkipped: 0,
    });
    expect(skippedOf(result)).toEqual([]);
    expect(textOf(result)).not.toContain('不完整');
  });

  it('glob 满 200 条命中：置 matchesTruncated 并具名，扫描上限未触发', async () => {
    const result = await runWith(hits, 'glob', { pattern: '**/*.md' });
    expect(detailsOf(result)).toMatchObject({ matched: 200, matchesTruncated: true, truncated: false });
    const text = textOf(result);
    expect(text).toContain('命中上限 200');
    expect(text).not.toContain('扫描上限');
  });

  it('grep 满 200 条命中：置 matchesTruncated 并具名，扫描上限未触发', async () => {
    const result = await runWith(hits, 'grep', { pattern: 'HT-2024-081' });
    expect(detailsOf(result)).toMatchObject({ matched: 200, matchesTruncated: true, truncated: false });
    const text = textOf(result);
    expect(text).toContain('命中上限 200');
    expect(text).not.toContain('扫描上限');
  });

  /**
   * grep 的命中上限有**两处**判据：跨文件那处（不再读下一份）与文件内那处（不再看下一行）。
   * 250 份单行文件只打到第一处，250 行的单份文件只打到第二处——两枚各有一条语料，
   * 撤掉任一处都有专属的红，不互相遮蔽。
   */
  it('grep 单文件内命中超限：行层判据同样置 matchesTruncated', async () => {
    const result = await runWith(longFile, 'grep', { pattern: 'HT-2024-081' });
    expect(detailsOf(result)).toMatchObject({
      matched: 200,
      scanned: 1,
      matchesTruncated: true,
      truncated: false,
    });
    expect(textOf(result)).toContain('命中上限 200');
  });

  it('glob 满 2000 份扫描：只置 truncated，命中上限未触发', async () => {
    const result = await runWith(scan, 'glob', { pattern: '**/*.md' });
    expect(detailsOf(result)).toMatchObject({
      matched: 0,
      scanned: 2000,
      truncated: true,
      matchesTruncated: false,
    });
    const text = textOf(result);
    expect(text).toContain('扫描上限 2000');
    expect(text).not.toContain('命中上限');
  });

  it('grep 满 2000 份扫描：只置 truncated，命中上限未触发', async () => {
    const result = await runWith(scan, 'grep', { pattern: '并不存在的词' });
    expect(detailsOf(result)).toMatchObject({
      matched: 0,
      scanned: 2000,
      truncated: true,
      matchesTruncated: false,
    });
    const text = textOf(result);
    expect(text).toContain('扫描上限 2000');
    expect(text).not.toContain('命中上限');
  });
});

describe('容器拒读：不静默丢子树', () => {
  let deniedRoot: string;
  let denied: ExecutionToolContext;
  let deniedProduct: ExecutionToolContext;
  let productTools: AgentHarnessTool<ExecutionToolContext>[];

  const runProductDenied = (name: string, params: unknown) => {
    const tool = productTools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`工具 ${name} 未装配`);
    return tool.execute('call-1', params as never, undefined, undefined, deniedProduct);
  };

  beforeAll(async () => {
    ({ root: deniedRoot, context: denied } = await sandbox('tools-denied', async (directory) => {
      await writeFile(path.join(directory, '可读.md'), '合同编号 HT-2024-081\n');
      await writeFile(path.join(directory, '不可读.md'), '合同编号 HT-2024-081\n');
      await mkdir(path.join(directory, '密室'));
      await writeFile(path.join(directory, '密室', '内件.md'), '合同编号 HT-2024-081\n');
      await chmod(path.join(directory, '不可读.md'), 0o000);
      await chmod(path.join(directory, '密室'), 0o000);
    }));
    // 前置实证：本用户对这两处确实读不动。以 root 身份跑时 chmod 不生效，
    // 那时本行显式红——反例失效必须自报，不能让后面几枚绿证空转。
    await expect(readdir(path.join(deniedRoot, '密室'))).rejects.toThrow();
    await expect(readFile(path.join(deniedRoot, '不可读.md'), 'utf8')).rejects.toThrow();
    deniedProduct = { env: createProductCaseEnv({ caseRoot: deniedRoot }) };
    productTools = createReadOnlyTools({ logicalRoot: '/case' });
  });

  afterAll(async () => {
    // 还原权限：留一枚 0 权目录在 tmp 里会卡住清理，也会污染后来者。
    await chmod(path.join(deniedRoot, '密室'), 0o755);
    await chmod(path.join(deniedRoot, '不可读.md'), 0o644);
  });

  it('glob：拒读子树进 skipped 并在文本里点名，同级文件照常命中', async () => {
    const result = await runWith(denied, 'glob', { pattern: '**/*.md' });
    expect(skippedOf(result)).toEqual([{ path: '密室', code: 'permission_denied' }]);
    expect(detailsOf(result).matched).toBe(2);
    const text = textOf(result);
    expect(text).toContain('不可读已跳过');
    expect(text).toContain('permission_denied');
    expect(text).not.toContain('内件.md');
  });

  it('grep：拒读目录与拒读文件各记一笔', async () => {
    const result = await runWith(denied, 'grep', { pattern: 'HT-2024-081' });
    const skipped = skippedOf(result);
    expect(skipped.map((entry) => entry.path).sort()).toEqual(['不可读.md', '密室']);
    expect(skipped.map((entry) => entry.code)).toEqual(['permission_denied', 'permission_denied']);
    expect(detailsOf(result).matched).toBe(1);
    expect(textOf(result)).toContain('2 处不可读已跳过');
  });

  it('拒读与真无命中可分辨：同是「无命中」，一个带注记一个不带', async () => {
    const withDenied = textOf(await runWith(denied, 'grep', { pattern: '并不存在的词' }));
    const clean = textOf(await run('grep', { pattern: '并不存在的词' }));
    expect(withDenied).toContain('无命中');
    expect(withDenied).toContain('不可读已跳过');
    expect(clean).toContain('无命中');
    expect(clean).not.toContain('不可读已跳过');
  });

  it('起始目录本身不可读：记该目录，不报「无命中」了事', async () => {
    const result = await runWith(denied, 'glob', { pattern: '**/*.md', path: '密室' });
    expect(skippedOf(result)).toEqual([{ path: '密室', code: 'permission_denied' }]);
    expect(detailsOf(result).matched).toBe(0);
  });

  it('授权根自身不可读：skipped 记根自身，不是一条空路径', async () => {
    const sealed = await sandbox('tools-sealed', async (directory) => {
      await writeFile(path.join(directory, '材料.md'), '合同编号 HT-2024-081\n');
    });
    await chmod(sealed.root, 0o000);
    try {
      const result = await runWith(sealed.context, 'glob', { pattern: '**/*.md' });
      expect(skippedOf(result)).toEqual([{ path: '.', code: 'permission_denied' }]);
      expect(textOf(result)).toContain('1 处不可读已跳过');
    } finally {
      await chmod(sealed.root, 0o755);
    }
  });

  it('产品形态：skipped 路径只出逻辑根，物理根零泄漏', async () => {
    const result = await runProductDenied('grep', { pattern: 'HT-2024-081' });
    const skipped = skippedOf(result);
    expect(skipped.map((entry) => entry.path).sort()).toEqual(['/case/不可读.md', '/case/密室']);
    expect(JSON.stringify(skipped)).not.toContain(deniedRoot);
    expect(textOf(result)).not.toContain(deniedRoot);
  });
});

/**
 * 1R 拒因与其二次证伪（验收 `fa01eca` 第二节）。
 *
 * 首轮把「无注记即结果完整」写成了闭集全称句，而同一个函数的邻行 `line.slice(0, MAX_LINE_LENGTH)`
 * 正在无标记地切掉命中行的尾部：一条 1211 字的合同条款切到 400 字交给模型，三枚字段全报完整。
 * ADR-022:110-111 把「截断未显式」逐字列为 harness 缺陷。同句还被两条既有行为二次证伪：
 * symlink 跳过、产品 grammar 排除。
 *
 * 收口分两层，形态不同，必须分开说：
 * - **本层看得见的**（行截断、symlink）出字段与注记，全称句在这两形下真；
 * - **本层看不见的**（容器 `listDir` 内部的 grammar 排除与单条目 `lstat` 失败）——工具连那些
 *   条目的存在都不知道，替容器作保就是第二句假话。故全称句收窄到「容器交给本层的条目」，
 *   容器那一层的排除按边界显式登记（SPEC 五-8、九节移交），并由下面最后一枚测试钉住形态。
 */
describe('1R · 行截断与 symlink：本层看得见的不完整，一律出字段与注记', () => {
  let longLine: ExecutionToolContext;
  const ORIGINAL_LENGTH = 1211;
  const TAIL = '关键证据在这里结尾';

  beforeAll(async () => {
    ({ context: longLine } = await sandbox('tools-longline', async (directory) => {
      const line = '甲'.repeat(ORIGINAL_LENGTH - TAIL.length) + TAIL;
      expect(line).toHaveLength(ORIGINAL_LENGTH);
      await writeFile(path.join(directory, '条款.md'), `${line}\n`);
    }));
  });

  /** 标记与字段拆成两枚：撤标记只红前者、撤字段只红后者，两条通道各有专属锚。 */
  it('验收反例转 permanent：1211 字命中行被截，行尾具名标记与原长在场', async () => {
    const text = textOf(await runWith(longLine, 'grep', { pattern: '甲' }));
    // 被切掉的尾部不在输出里——这正是「看起来完整」的那句引语的来源。
    expect(text).not.toContain(TAIL);
    // 故截断必须自己说出来：具名标记 + 原长，模型据此决定要不要改用 read。
    expect(text).toContain(`本行截断：原 ${ORIGINAL_LENGTH} 字符`);
  });

  it('验收反例转 permanent：行截断同批进 details 计数', async () => {
    const result = await runWith(longLine, 'grep', { pattern: '甲' });
    expect(detailsOf(result)).toMatchObject({ matched: 1, scanned: 1, lineTruncated: 1 });
  });

  it('行截断进注记，故「无注记即完整」在本形下不被证伪', async () => {
    const text = textOf(await runWith(longLine, 'grep', { pattern: '甲' }));
    expect(text).toContain('不完整');
    expect(text).toContain('行超长截断');
  });

  it('未超长的命中行零标记：标记不是无条件后缀', async () => {
    const result = await run('grep', { pattern: 'HT-2024-081' });
    expect(textOf(result)).not.toContain('本行截断');
    expect(detailsOf(result).lineTruncated).toBe(0);
  });

  it('symlink 不跟随同样出字段与注记：主 fixture 的 `外链` 一条都不许静默', async () => {
    for (const tool of ['glob', 'grep'] as const) {
      const result = await run(tool, tool === 'glob' ? { pattern: '**/*.md' } : { pattern: 'HT' });
      expect(detailsOf(result).symlinksSkipped).toBe(1);
      expect(textOf(result)).toContain('符号链接未跟随');
    }
  });

  it('产品形态同样出 symlink 计数：两形态的账不许只有一侧', async () => {
    const productTools = createReadOnlyTools({ logicalRoot: '/case' });
    const productContext = { env: createProductCaseEnv({ caseRoot: root }) };
    const tool = productTools.find((candidate) => candidate.name === 'glob');
    const result = await tool!.execute('call-1', { pattern: '**/*.md' } as never, undefined, undefined, productContext);
    expect(detailsOf(result).symlinksSkipped).toBe(1);
    expect(textOf(result)).toContain('符号链接未跟随');
  });

  /**
   * 第三形：产品 grammar 排除。**不在本层可修**——`product-case-env.ts` 的 `listDir` 在容器内
   * 就把保留名滤掉了，工具收到的条目里根本没有它，`ExecutionEnv` 也没有第二条通道能把「我丢了
   * 什么」带出来。本枚因此钉两件事：排除确实发生在容器层（不是工具静默），以及工具的注记承诺
   * 只覆盖「容器交给本层的条目」——SPEC 五-8 的措辞按此收窄，容器那层的边界另行登记与移交。
   */
  it('产品 grammar 排除发生在容器层，工具的承诺范围据此收窄', async () => {
    const excluded = await sandbox('tools-grammar', async (directory) => {
      await writeFile(path.join(directory, 'con.md'), '合同编号 HT-2024-081\n');
      await writeFile(path.join(directory, '正常.md'), '合同编号 HT-2024-081\n');
    });
    const caseEnv = createProductCaseEnv({ caseRoot: excluded.root });
    const listed = await caseEnv.listDir('/case');
    if (!listed.ok) throw new Error('容器应能列出 /case');
    // 容器层：保留名条目从未出现在交给工具的清单里。
    expect(listed.value.map((entry) => entry.path)).toEqual(['/case/正常.md']);

    const productTools = createReadOnlyTools({ logicalRoot: '/case' });
    const tool = productTools.find((candidate) => candidate.name === 'glob');
    const result = await tool!.execute(
      'call-1',
      { pattern: '**/*.md' } as never,
      undefined,
      undefined,
      { env: caseEnv },
    );
    // 工具层：它拿到的一个条目全检索了，故按收窄后的口径无注记；con.md 的账在容器层，见 SPEC 五-8。
    expect(detailsOf(result)).toMatchObject({ matched: 1, scanned: 1, symlinksSkipped: 0 });
    expect(textOf(result)).not.toContain('不完整');
  });
});
