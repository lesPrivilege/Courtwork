/**
 * 只读工具面（ADR-022 决定一：loop 是 commodity，资产在容器与契约）。
 *
 * - `read` 直接用 pi 原版 `createReadTool()`，零 fork；它经 `ExecutionEnv` 取文件，
 *   因而自动继承 {@link createReadOnlyScopedEnv} 的授权边界。
 * - `grep` / `glob` pi 内核未提供（0.82.1 的 `harness/tools` 只有 read/edit/write/bash，
 *   grep/find 住在 `pi-coding-agent`，那一包会连带 TUI、图像处理等 18 项依赖）。
 *   本包自备这两件，但**同样只经 env 取文件系统**——工具里不写第二份边界逻辑，
 *   否则就有第二处可以漂移的真源。
 */

import path from 'node:path';

import {
  createReadTool,
  type AgentHarnessTool,
  type ExecutionToolContext,
  type FileErrorCode,
} from '@earendil-works/pi-agent-core';
import { Type } from '@earendil-works/pi-ai';

import { DUAL_ROOT_ADDRESSING_NOTE } from './workspace-write-env.js';

/**
 * 单次调用的遍历与输出上限：dev 线不做无界扫描。
 *
 * 两条上限是**两类**不完整来源，不合成一个布尔（`PI-TOOLS-HONESTY-1` 缺陷①）：
 * 扫描上限说「还有文件没看」，命中上限说「看到的命中没全列」。模型据前者换起始目录、
 * 据后者换更窄的模式；混成一枚 `truncated`，两条路都指不出来。
 */
const MAX_FILES_SCANNED = 2000;
const MAX_MATCHES = 200;
const MAX_LINE_LENGTH = 400;

type TextResult = { content: { type: 'text'; text: string }[]; details: Record<string, unknown> };

const textResult = (text: string, details: Record<string, unknown> = {}): TextResult => ({
  content: [{ type: 'text', text }],
  details,
});

/**
 * 拒读登记（`PI-TOOLS-HONESTY-1` 缺陷②）。
 *
 * 容器拒读一棵子树或一份文件时，那部分材料**从未被检索**。不登记就等于用「完整结果」
 * 的口气报一个残缺结果——对法律材料，那是一句自信的假阴。
 */
type SkippedEntry = { readonly path: string; readonly code: FileErrorCode };

/** 投影前的拒读原件：路径仍是本次 env 的绝对形态，与命中面同一条投影链。 */
type RawSkip = { readonly absolute: string; readonly code: FileErrorCode };

/**
 * glob → RegExp。只支持 `**`、`*`、`?` 三个元字符——够 md 检索用，
 * 且省掉一个新依赖（minimatch/glob）。扩语法是契约变更，须回票面。
 */
export function globToRegExp(pattern: string): RegExp {
  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
      continue;
    }
    if (character === '?') {
      source += '[^/]';
      continue;
    }
    source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

const toPosix = (value: string) => value.split(path.sep).join('/');

/**
 * 广度优先遍历授权子树。symlink 一律不跟随——界内界外都不跟，
 * 少一条要判定的路径来源，也就少一个越界口子；代价是界内软链子树不可见（已知边界）。
 */
async function walkFiles(
  env: ExecutionToolContext['env'],
  start: string,
  visit: (absolute: string) => Promise<void>,
  /**
   * 已用掉的扫描额度。上限是**全次调用**口径（一次 glob/grep 一份账，`PI-TOOLS-HONESTY-1`
   * 移交 4），双根因此不是各给一份 2000——第二根接着第一根的余额走，走不动就 `truncated`。
   */
  scannedBefore = 0,
): Promise<{ scanned: number; truncated: boolean; skipped: RawSkip[]; symlinks: number }> {
  const queue = [start];
  const skipped: RawSkip[] = [];
  let scanned = scannedBefore;
  let symlinks = 0;
  while (queue.length > 0) {
    const directory = queue.shift();
    if (directory === undefined) break;
    const listed = await env.listDir(directory);
    // 拒读的整棵子树在此消失：起始目录本身也走这一支。跳过要计数，否则残缺报成完整。
    if (!listed.ok) {
      skipped.push({ absolute: directory, code: listed.error.code });
      continue;
    }
    for (const entry of listed.value) {
      // 不跟随是保守解（SPEC 五-5），但**跳过要出账**：不出账，模型看到的就是一棵
      // 「不存在这条链接」的树，而不是「有一条链接我没跟」。
      if (entry.kind === 'symlink') {
        symlinks += 1;
        continue;
      }
      if (entry.kind === 'directory') {
        queue.push(entry.path);
        continue;
      }
      // 扫描上限：队列里剩下的目录连同本文件都没看。这一条由 `truncated` 说，不进 skipped。
      if (scanned >= MAX_FILES_SCANNED) return { scanned, truncated: true, skipped, symlinks };
      scanned += 1;
      await visit(entry.path);
    }
  }
  return { scanned, truncated: false, skipped, symlinks };
}

/**
 * 命中行裁剪（1R 拒因）。`MAX_LINE_LENGTH` 是第三枚上限，首轮把它漏在同一个函数里：
 * 一条 1211 字的合同条款被无标记地切到 400 字交给模型，三枚字段全报完整——而模型看到的
 * 是一句**看起来完整**的引语。ADR-022 决定三把「截断未显式」逐字列为 harness 缺陷。
 *
 * 出面文本与「是否被裁」同源返回：撤掉标记就不可能仍报 `truncated:false`，两者不会各说各话。
 * 原长一并给出——模型据此判断还差多少、要不要改用 `read` 取全文；只给一个省略号等于让它猜。
 *
 * 已知边界（同批登记进 SPEC 五-7）：按 UTF-16 单元切，恰好落在代理对中间时会切出半只字符。
 * 本票不改切法（那是上限语义变更），但截断本身自此有标记，不再是静默的。
 */
function clipLine(line: string): { text: string; truncated: boolean } {
  if (line.length <= MAX_LINE_LENGTH) return { text: line, truncated: false };
  return {
    text: `${line.slice(0, MAX_LINE_LENGTH)}…（本行截断：原 ${line.length} 字符，只给前 ${MAX_LINE_LENGTH}）`,
    truncated: true,
  };
}

/**
 * 拒因汇总，形如 `permission_denied 2、unknown 1`。
 * `FileErrorCode` 是闭集（8 枚），故这一行长度有界，不会把模型上下文顶掉。
 */
function summarizeSkipCodes(skipped: readonly SkippedEntry[]): string {
  const counts = new Map<FileErrorCode, number>();
  for (const entry of skipped) counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
  return [...counts].map(([code, count]) => `${code} ${count}`).join('、');
}

/**
 * 不完整注记：**本层能观察到的六类**来源各自成句、互不遮蔽，一条都不成立时**不出注记**。
 *
 * 六类＝本函数检索路径上**全部九条丢弃/限幅分支**去掉三条同账者之后的口径：扫描上限、
 * 命中上限（跨文件与行层同账）、行截断、容器拒读（目录与文件同账）、symlink 不跟随、
 * 裸 NUL 行。族清单逐条在 `specs/PI-TOOLS-HONESTY-1.md` 十节，改本函数**先对表**——
 * 本票三轮的教训正是「按验收点名的实例收口，而不是按族收口」，两次都是同一条路走回来的。
 *
 * 因此「没有注记」是一句可依赖的断言——**容器交给本层的每一个条目都被检索、每一条命中都完整
 * 列出**；而不是「本工具从不说这些」。
 *
 * 承诺**到此为止，不替容器作保**（1R 收窄，见 SPEC 五-8）：容器自己在 `listDir` 里丢掉的条目
 * ——产品形态的 grammar 排除、单条目 `lstat` 失败——本层连它们存在都不知道，`ExecutionEnv`
 * 也没有第二条通道能把「我丢了什么」带出来。那两处按边界显式登记并随 env 契约一并移交，
 * 不在这里用一句更大的全称句盖过去。
 */
function incompleteNote(input: {
  readonly truncated: boolean;
  readonly matchesTruncated: boolean;
  /** 命中的量词：glob 数文件（份），grep 数行（条）。 */
  readonly matchUnit: string;
  /** 被裁掉尾部的命中行数。glob 不产出命中行，恒为 0。 */
  readonly lineTruncated: number;
  /** 含裸 NUL 而未按文本检索的行数。glob 不读行内容，恒为 0。 */
  readonly nulLinesSkipped: number;
  readonly skipped: readonly SkippedEntry[];
  readonly symlinksSkipped: number;
}): string {
  const clauses: string[] = [];
  if (input.truncated) clauses.push(`已达扫描上限 ${MAX_FILES_SCANNED} 份文件`);
  if (input.matchesTruncated) clauses.push(`已达命中上限 ${MAX_MATCHES} ${input.matchUnit}`);
  if (input.lineTruncated > 0) {
    clauses.push(`${input.lineTruncated} 行超长截断（每行 ${MAX_LINE_LENGTH} 字符封顶，行尾有具名标记）`);
  }
  if (input.nulLinesSkipped > 0) {
    clauses.push(`另有 ${input.nulLinesSkipped} 行含裸 NUL，已按二进制跳过（未按文本检索，其中可能有命中）`);
  }
  if (input.skipped.length > 0) {
    clauses.push(`另有 ${input.skipped.length} 处不可读已跳过：${summarizeSkipCodes(input.skipped)}`);
  }
  if (input.symlinksSkipped > 0) {
    clauses.push(`另有 ${input.symlinksSkipped} 处符号链接未跟随（本容器一律不跟随）`);
  }
  return clauses.length === 0 ? '' : `\n（${clauses.join('；')}；结果可能不完整）`;
}

/**
 * 起点参数的说明按双根口径写（`PI-DUALROOT-CONTRACT-1`）：可给逻辑绝对路径，不带前缀的按默认根
 * `/workspace` 解析，省略则两根全检索。glob/grep 的 schema 是我方自备的，故这一处能改；
 * `read`/`write` 的 `path` 说明住在上游 schema 里，改它要换 schema 对象、破掉同一性，那两件的
 * 口径因此落在 description 上（见 {@link bindReadToLogicalRoot} 与 `bindWorkspaceWriteTool`）。
 *
 * dev 形态只有一枚授权文件夹，「省略即全部」与「不带前缀即根下」在那里说的是同一件事；一份文案
 * 对两形态都成立，不必分叉出第二份 schema——分叉即两处可漂移的模型面契约。
 */
const START_PATH_DESCRIPTION =
  '起始子目录；可写 `/case/…` 或 `/workspace/…` 逻辑绝对路径，不带前缀按 `/workspace` 解析，省略即全部检索';

const globSchema = Type.Object({
  pattern: Type.String({ description: '文件名匹配式，支持 `**`、`*`、`?`，如 `**/*.md`' }),
  path: Type.Optional(Type.String({ description: START_PATH_DESCRIPTION })),
});

const grepSchema = Type.Object({
  pattern: Type.String({ description: '正则表达式（区分大小写关闭），逐行匹配' }),
  path: Type.Optional(Type.String({ description: START_PATH_DESCRIPTION })),
});

/**
 * 命中与拒读的路径投影。dev 无参形态是恒等函数——输出与逻辑根引入前逐字相同；
 * 产品形态把相对路径前缀成所属逻辑根，扫描/截断上限、正则与遍历逻辑一概不动。
 *
 * 唯一一处非恒等：授权根**自身**被拒读时相对路径是空串，dev 形态显示成 `.`。
 * 命中面永远拿不到空相对路径（命中的是文件，不是根），故可观察输出仍逐字不变。
 */
type HitProjection = (relative: string) => string;

const identityProjection: HitProjection = (relative) => (relative === '' ? '.' : relative);

/**
 * 逻辑根投影（`PI-WORKSPACE-READ-1`）。相对路径**永远相对它自己那个根**算，故双根下
 * 结构性产不出 `../workspace`：跨根的相对路径从来不被构造，而不是被构造之后再改写掉。
 *
 * 空相对路径（根自身被拒读）出根名本身，**不带尾斜杠**——旧式 `${root}/${relative}`
 * 在这一格会出 `/case/`，那既不是合法逻辑路径，也是同一枚投影的两种写法。
 */
const rootProjection =
  (logicalRoot: string): HitProjection =>
  (relative) =>
    relative === '' ? logicalRoot : `${logicalRoot}/${relative}`;

/**
 * 一段检索范围：从哪儿走、相对谁算、按哪枚投影出面。
 *
 * dev 恰一段；产品不给起点即两根各一段，给起点则恰是它所属的那一段。
 */
interface SearchScope {
  /** `path.relative` 的基准。dev 是 `env.cwd`，产品是该段所属的逻辑根。 */
  readonly base: string;
  readonly start: string;
  readonly project: HitProjection;
}

/** 拒读登记与命中共用同一条投影链——两处各投一次就有两处可以漂移。 */
const projectSkipped = (scope: SearchScope, skipped: readonly RawSkip[]): SkippedEntry[] =>
  skipped.map(({ absolute, code }) => ({
    path: scope.project(toPosix(path.relative(scope.base, absolute))),
    code,
  }));

/**
 * 起点 → 检索范围。产品形态**不给 `path` 就两根全检索**：`/workspace` 的工作稿与 `/case`
 * 的案件材料在同一次 glob/grep 里各按自己的根出面，模型不必先知道有几个根。
 */
async function resolveScopes(
  context: ExecutionToolContext,
  logicalRoots: readonly string[] | undefined,
  requested: string | undefined,
): Promise<{ readonly ok: true; readonly scopes: SearchScope[] } | { readonly ok: false; readonly message: string }> {
  if (logicalRoots === undefined) {
    const started = await context.env.absolutePath(requested ?? '.');
    if (!started.ok) return { ok: false, message: started.error.message };
    return { ok: true, scopes: [{ base: context.env.cwd, start: started.value, project: identityProjection }] };
  }
  if (requested === undefined) {
    return {
      ok: true,
      scopes: logicalRoots.map((root) => ({ base: root, start: root, project: rootProjection(root) })),
    };
  }
  const started = await context.env.absolutePath(requested);
  if (!started.ok) return { ok: false, message: started.error.message };
  const root = logicalRoots.find(
    (candidate) => started.value === candidate || started.value.startsWith(`${candidate}/`),
  );
  // 归一化后仍不落在任一根内：不回显入参原文（N1——回显非法输入等于给一条旁路）。
  if (root === undefined) return { ok: false, message: '拒绝访问：起始路径不在任何逻辑根内' };
  return { ok: true, scopes: [{ base: root, start: started.value, project: rootProjection(root) }] };
}

/**
 * 双根口径只挂产品形态（`PI-DUALROOT-CONTRACT-1`）。dev 形态根本没有逻辑根——那里只有一枚
 * 授权文件夹，写上「两个逻辑根」就是一句假话；模型面的契约文案不许出现装配面上不成立的句子。
 */
const withAddressingNote = (base: string, logicalRoots: readonly string[] | undefined): string =>
  logicalRoots === undefined ? base : `${base}\n${DUAL_ROOT_ADDRESSING_NOTE}`;

function createGlobTool(
  logicalRoots: readonly string[] | undefined,
): AgentHarnessTool<ExecutionToolContext, typeof globSchema, Record<string, unknown>> {
  return {
    name: 'glob',
    label: '按名检索',
    description: withAddressingNote('在授权文件夹内按文件名模式列出文件。授权文件夹外的路径一律拒绝。', logicalRoots),
    parameters: globSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, context) {
      const resolved = await resolveScopes(context, logicalRoots, params.path);
      if (!resolved.ok) return textResult(resolved.message, { denied: true });

      const matcher = globToRegExp(params.pattern);
      const matches: string[] = [];
      const skipped: SkippedEntry[] = [];
      let matchesTruncated = false;
      let scanned = 0;
      let truncated = false;
      let symlinks = 0;

      for (const scope of resolved.scopes) {
        const walk = await walkFiles(
          context.env,
          scope.start,
          async (absolute) => {
            const relative = toPosix(path.relative(scope.base, absolute));
            // 匹配仍按相对路径判定——模式语义不因投影而改变；只有出面的那一份被投影。
            if (!matcher.test(relative)) return;
            if (matches.length < MAX_MATCHES) matches.push(scope.project(relative));
            // 这里丢的是**已经找到**的命中，与「还有文件没看」不是一回事。
            else matchesTruncated = true;
          },
          scanned,
        );
        scanned = walk.scanned;
        truncated = truncated || walk.truncated;
        symlinks += walk.symlinks;
        skipped.push(...projectSkipped(scope, walk.skipped));
        // 扫描额度是全次调用的：用尽即停，不让第二根凭空多拿一份。
        if (walk.truncated) break;
      }

      const header = matches.length === 0 ? '无命中' : `命中 ${matches.length} 份`;
      const note = incompleteNote({
        truncated,
        matchesTruncated,
        matchUnit: '份',
        // glob 出的是文件名，既不截行也不读行内容——两枚恒 0 是事实，不是占位。
        lineTruncated: 0,
        nulLinesSkipped: 0,
        skipped,
        symlinksSkipped: symlinks,
      });
      return textResult(`${header}\n${matches.join('\n')}${note}`, {
        matched: matches.length,
        scanned,
        truncated,
        matchesTruncated,
        skipped,
        symlinksSkipped: symlinks,
      });
    },
  };
}

function createGrepTool(
  logicalRoots: readonly string[] | undefined,
): AgentHarnessTool<ExecutionToolContext, typeof grepSchema, Record<string, unknown>> {
  return {
    name: 'grep',
    label: '按内容检索',
    description: withAddressingNote('在授权文件夹内按正则逐行检索文本文件。授权文件夹外的路径一律拒绝。', logicalRoots),
    parameters: grepSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, context) {
      const resolved = await resolveScopes(context, logicalRoots, params.path);
      if (!resolved.ok) return textResult(resolved.message, { denied: true });

      let matcher: RegExp;
      try {
        matcher = new RegExp(params.pattern, 'i');
      } catch (cause) {
        return textResult(`正则无效，未执行检索：${cause instanceof Error ? cause.message : String(cause)}`, {
          invalidPattern: true,
        });
      }

      const hits: string[] = [];
      const skipped: SkippedEntry[] = [];
      let matchesTruncated = false;
      let lineTruncated = 0;
      let nulLinesSkipped = 0;
      let scanned = 0;
      let truncated = false;
      let symlinks = 0;

      for (const scope of resolved.scopes) {
        const skippedFiles: RawSkip[] = [];
        const walk = await walkFiles(
        context.env,
        scope.start,
        async (absolute) => {
          // 命中已满：后面的文件根本不读。**停下**这件事要说出来，否则 200 条整看着像刚好找完。
          if (hits.length >= MAX_MATCHES) {
            matchesTruncated = true;
            return;
          }
          const read = await context.env.readTextLines(absolute);
          // 读不动的文件不是「没有命中的文件」。
          if (!read.ok) {
            skippedFiles.push({ absolute, code: read.error.code });
            return;
          }
          const relative = scope.project(toPosix(path.relative(scope.base, absolute)));
          read.value.forEach((line, index) => {
            // 裸 NUL 是二进制的可靠信号：按二进制跳过，不把乱码喂给模型。
            // 跳过是策略，出账是义务（2R 再拒因）：判据刻意在 matcher 之前——先认出二进制、
            // 再谈匹配——因此这里压掉的**可能正是一条真命中**，不计数就等于用「无命中」
            // 回答一条它其实找到了的证据。判据位置不变，沉默改掉。
            if (line.includes('\u0000')) {
              nulLinesSkipped += 1;
              return;
            }
            if (hits.length >= MAX_MATCHES) {
              matchesTruncated = true;
              return;
            }
            if (!matcher.test(line)) return;
            const clipped = clipLine(line);
            if (clipped.truncated) lineTruncated += 1;
            hits.push(`${relative}:${index + 1}: ${clipped.text}`);
          });
        },
        scanned,
        );
        scanned = walk.scanned;
        truncated = truncated || walk.truncated;
        symlinks += walk.symlinks;
        // 目录（walkFiles 的 listDir）与文件（本工具的 readTextLines）两处拒读，同一处出面。
        skipped.push(...projectSkipped(scope, [...walk.skipped, ...skippedFiles]));
        if (walk.truncated) break;
      }

      const header = hits.length === 0 ? '无命中' : `命中 ${hits.length} 行`;
      const note = incompleteNote({
        truncated,
        matchesTruncated,
        matchUnit: '条',
        lineTruncated,
        nulLinesSkipped,
        skipped,
        symlinksSkipped: symlinks,
      });
      return textResult(`${header}\n${hits.join('\n')}${note}`, {
        matched: hits.length,
        scanned,
        truncated,
        matchesTruncated,
        lineTruncated,
        nulLinesSkipped,
        skipped,
        symlinksSkipped: symlinks,
      });
    },
  };
}

/**
 * read 的逻辑根 binder（PI-HOST-LOOP-1 §二.1）。
 *
 * 三条硬约束，撤掉任一条都须有红证：
 * 1. `name/label/parameters` 原样转出，`parameters` 必须是**同一对象**——模型看到的 schema
 *    不因产品形态而变，也就没有第二份可漂移的工具契约。`description` 是唯一例外，且是**追加**
 *    不是改写（`PI-DUALROOT-CONTRACT-1`）：上游原文逐字在前，双根口径缀于其后；上游的
 *    `(relative or absolute)` 只描述单根世界，模型据它无从知道裸相对路径归哪个根，而 `path`
 *    参数说明住在上游 schema 里，改它就要换 schema 对象、破掉本条同一性；
 * 2. path 归一交给**本次 env**（产品形态即 `/case` 容器），tools 里不复制第二份 grammar；
 * 3. 归一后只调用一次原版 `execute`。上游截断提示里的 `${path}` 因此只能是逻辑绝对路径。
 *
 * 已知上游怪癖（0.82.1 `harness/tools/path-utils.js`，本票不改）：`normalizeToolPath` 会
 * 剥掉前导 `@` 并把 Unicode 空格改写成半角空格。归一后的路径以 `/` 起头，`@` 那一条因此
 * 失效；Unicode 空格改写仍在上游发生，但改写后的路径要再过一次同一个 env，出界仍拒。
 */
function bindReadToLogicalRoot(
  upstream: AgentHarnessTool<ExecutionToolContext>,
): AgentHarnessTool<ExecutionToolContext> {
  return {
    name: upstream.name,
    label: upstream.label,
    description: `${upstream.description}\n${DUAL_ROOT_ADDRESSING_NOTE}`,
    parameters: upstream.parameters,
    async execute(toolCallId, params, signal, onUpdate, context) {
      const requested = (params as { path?: unknown }).path;
      const normalized = await context.env.absolutePath(
        typeof requested === 'string' ? requested : '',
        signal,
      );
      if (!normalized.ok) return textResult(normalized.error.message, { denied: true });
      return upstream.execute(
        toolCallId,
        { ...(params as Record<string, unknown>), path: normalized.value } as never,
        signal,
        onUpdate,
        context,
      );
    },
  } as AgentHarnessTool<ExecutionToolContext>;
}

export interface ReadOnlyToolsOptions {
  /**
   * 唯一可选形态：把 read 的入参与 glob/grep 的命中投影到逻辑根。
   * 不传即 dev 形态，可观察输出与本选项引入前逐字相同。
   *
   * 产品形态给 `[CASE_LOGICAL_ROOT, WORKSPACE_LOGICAL_ROOT]` 两枚（次序即不给起点时的检索
   * 次序）。`read` 的路由不看这张表——它交给本次 env 的 `absolutePath`，双根 env 自己按前缀
   * 分派；这张表只决定 glob/grep 在**没有起点**时走哪几棵树。
   *
   * **产品装配恰一形**：`product-runtime.ts` 是唯一生产调用点，两根固定、默认根固定
   * `/workspace`（`PI-DUALROOT-CONTRACT-1`）。本参数的其他取值只存在于单测的特征化装置里；
   * 双根口径文案因此是常量而非按取值生成——生成式文案要多一份「文案随配置变」的真源，
   * 而配置在生产上只有一种。
   */
  readonly logicalRoots?: readonly string[];
}

/** 只读三件。名字必须与 {@link READ_ONLY_TOOL_NAMES} 一致，由 tool-policy 的红证锁死。 */
export function createReadOnlyTools(options?: ReadOnlyToolsOptions): AgentHarnessTool<ExecutionToolContext>[] {
  const logicalRoots = options?.logicalRoots;
  if (logicalRoots === undefined) {
    return [createReadTool(), createGlobTool(undefined), createGrepTool(undefined)] as AgentHarnessTool<ExecutionToolContext>[];
  }
  if (logicalRoots.length === 0) throw new Error('产品形态至少要有一枚逻辑根');
  return [
    bindReadToLogicalRoot(createReadTool() as AgentHarnessTool<ExecutionToolContext>),
    createGlobTool(logicalRoots),
    createGrepTool(logicalRoots),
  ] as AgentHarnessTool<ExecutionToolContext>[];
}
